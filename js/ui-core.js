/* ==========================================================================
   TITAN CORE ENGINE: UI & PRESENTATION MODULE
   Handles Themes, Navigation, Modals, and Interactive DOM Elements
   ========================================================================== */

// 1. THEME ENGINE
const savedTheme = localStorage.getItem('paveops_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(b => b.classList.toggle('active', b.dataset.targetTheme === savedTheme));

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.targetTheme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('paveops_theme', theme);
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// 2. FOREMAN TAB NAVIGATION
const navTabBtns = document.querySelectorAll('.nav-tab-btn');
navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.targetTab;
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        // Show target tab
        const targetTab = document.getElementById('tab-' + target);
        if(targetTab) targetTab.classList.add('active');
        
        // Update button styles
        navTabBtns.forEach(b => { 
            b.classList.remove('active-tab'); 
            b.style.color = 'var(--text-muted)'; 
        });
        btn.classList.add('active-tab'); 
        btn.style.color = 'var(--theme-accent)';
    });
});

// 3. MANAGER SIDEBAR & NAVIGATION
const managerNavBtns = document.querySelectorAll('.manager-nav-btn');
managerNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        
        // Hide all sections
        document.querySelectorAll('.manager-content-section').forEach(s => { 
            s.classList.remove('block'); 
            s.classList.add('hidden'); 
        });
        
        // Show target section
        const section = document.getElementById('manager-tab-' + target); 
        if(section) {
            section.classList.remove('hidden'); 
            section.classList.add('block');
        }
        
        // Update button styles
        managerNavBtns.forEach(b => b.classList.remove('active')); 
        btn.classList.add('active');
        
        // Close sidebar on mobile after selection
        toggleSidebar(true);
    });
});

function toggleSidebar(close) {
    const sidebar = document.getElementById('managerSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(!sidebar || !overlay) return;
    
    sidebar.classList.toggle('-translate-x-full', close);
    overlay.classList.toggle('hidden', close);
}

document.getElementById('mobileMenuBtn')?.addEventListener('click', () => toggleSidebar(false));
document.getElementById('closeSidebarBtn')?.addEventListener('click', () => toggleSidebar(true));
document.getElementById('sidebarOverlay')?.addEventListener('click', () => toggleSidebar(true));


// 4. INTERACTIVE EFFECTS (TILT CARDS & RIPPLES)
// Apply 3D Tilt effect to dashboard cards
document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const rotY = ((e.clientX - r.left) / r.width - 0.5) * 6;
        const rotX = (-(e.clientY - r.top) / r.height - 0.5) * 6;
        card.style.transform = `perspective(800px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    });
    card.addEventListener('mouseleave', () => { 
        card.style.transform = 'perspective(800px) rotateY(0) rotateX(0)'; 
    });
});

// Apply Magnetic Button effect
document.addEventListener('mousemove', e => {
    document.querySelectorAll('.mag-btn').forEach(btn => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / r.width;
        const dy = (e.clientY - cy) / r.height;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 1.5) {
            const s = Math.max(0, 1 - dist / 1.5) * 3;
            btn.style.transform = `translate(${dx*s}px, ${dy*s}px)`;
            btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
            btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        } else {
            btn.style.transform = '';
        }
    });
});

// Apply Ripple click effect
document.addEventListener('click', e => {
    const btn = e.target.closest('.ripple-container');
    if(!btn) return;
    
    const r = btn.getBoundingClientRect();
    const circle = document.createElement('span');
    circle.className = 'ripple-circle';
    
    const size = Math.max(r.width, r.height) * 2;
    circle.style.width = circle.style.height = size + 'px';
    circle.style.left = (e.clientX - r.left - size/2) + 'px';
    circle.style.top = (e.clientY - r.top - size/2) + 'px';
    
    btn.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
});

// 5. TOAST NOTIFICATIONS & COUNTER ANIMATIONS
window.showToast = function(msg, type='success') {
    const c = document.getElementById('toastContainer');
    if(!c) return;
    
    const t = document.createElement('div');
    const color = type === 'success' ? 'var(--theme-accent)' : type === 'error' ? 'var(--danger)' : '#f59e0b';
    
    t.style.cssText = `pointer-events:auto;padding:12px 20px;border-radius:12px;font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#fff;background:${color};backdrop-filter:blur(12px);box-shadow:0 8px 30px rgba(0,0,0,0.3),0 0 20px ${color}44;transform:translateX(120%);transition:transform 0.5s cubic-bezier(0.16,1,0.3,1),opacity 0.3s ease;border:1px solid rgba(255,255,255,0.1);`;
    t.textContent = msg;
    
    c.appendChild(t);
    requestAnimationFrame(() => { t.style.transform = 'translateX(0)' });
    
    setTimeout(() => {
        t.style.transform = 'translateX(120%)';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
    }, 3000);
};

window.animateCounter = function(el, target, decimals=0, suffix='') {
    if(!el) return;
    const start = parseFloat(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 800);
    
    function tick(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const cur = start + (target - start) * eased;
        
        el.innerHTML = cur.toFixed(decimals) + suffix;
        if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
};

// 6. GLOBAL KEYBOARD LISTENERS
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const modals = ['mathModal', 'voModal', 'delayModal'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if(el && !el.classList.contains('hidden')) {
                el.classList.add('hidden');
            }
        });
    }
});