/* ==========================================================================
   TITAN CORE ENGINE: AUTHENTICATION & SECURITY MODULE
   Handles Supabase Init, Forensic EULA Telemetry, and Role-Based Routing
   ========================================================================== */

// 1. SUPABASE INITIALIZATION
const supabaseUrl = "https://kjyhaoeemhkvtidavppj.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqeWhhb2VlbWhrdnRpZGF2cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzkyNDEsImV4cCI6MjA5NjAxNTI0MX0.LMnpfaTJc6yqWHb2wnNmisdCwh8yl6wbNJAGn99UACw"; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global State
window.currentUser = null;
window.currentRole = null;
window.activeProjectContext = { id: null, name: "No Active Site", designThickness: 50.0, tolerance: 2.0, isActive: false };

const ROLE_TIERS = { 'foreman': 1, 'manager': 2, 'project_manager': 3, 'financial_manager': 4 };

// DOM Elements - Auth
const authGate = document.getElementById('authGate');
const appInterface = document.getElementById('appInterface');
const managerInterface = document.getElementById('managerInterface');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('authEmail');
const passwordInput = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const eulaCheckbox = document.getElementById('eula-checkbox');
const eulaError = document.getElementById('eula-error');

// 2. HARDENED LOGIN EXECUTION
if (loginBtn) loginBtn.addEventListener('click', executeLogin);
if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') executeLogin(); });

async function executeLogin() {
    // Legal Firewall (Clickwrap)
    if (!eulaCheckbox.checked) {
        eulaError.classList.remove('hidden');
        return; // Hard stop. Do not authenticate.
    } else {
        eulaError.classList.add('hidden');
    }

    // Input Validation
    const email = emailInput.value.trim().toLowerCase(); 
    const password = passwordInput.value;
    if(!email || !password) return;
    
    loginBtn.innerText = "AUTHENTICATING..."; 
    loginBtn.disabled = true; 
    authError.classList.add('hidden');

    // Forensic Telemetry Engine (Logs acceptance before granting access)
    try {
        const deviceData = navigator.userAgent;
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        
        const { error: auditError } = await supabase.from('eula_audit_logs').insert([{ 
            user_email: email, 
            ip_address: ipData.ip, 
            user_agent: deviceData,
            company_id: 'Stefanutti-Pilot' 
        }]);

        if (auditError) console.error("Audit log failed:", auditError);
        else console.log("Forensic EULA signature logged securely.");
    } catch (err) {
        console.error("Telemetry capture failed. Proceeding with auth:", err);
    }

    // Core Authentication
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            authError.innerText = error.message; 
            authError.classList.remove('hidden');
            loginBtn.innerText = "Sign In"; 
            loginBtn.disabled = false;
            return;
        }
        
        if (data && data.user) {
            window.currentUser = data.user;
            await routeUserBasedOnRole(data.user.id);
            loginBtn.innerText = "Sign In"; 
            loginBtn.disabled = false;
        }
    } catch (err) {
        authError.innerText = "Network failure. Please try again."; 
        authError.classList.remove('hidden');
        loginBtn.innerText = "Sign In"; 
        loginBtn.disabled = false;
    }
}

// 3. ROLE ROUTER & INTERFACE TOGGLE
async function routeUserBasedOnRole(userId) {
    try {
        const { data: profile, error } = await supabase.from('profiles').select('role, company_id').eq('id', userId).single();
         
        if (!profile || error || !ROLE_TIERS[profile.role]) {
            await supabase.auth.signOut();
            authError.innerText = "Access denied: unrecognized role.";
            authError.classList.remove('hidden');
            return;
        }
        
        window.currentRole = profile.role;
        const userTier = ROLE_TIERS[profile.role];

        // Hide Gate, Show Loading state (Optional enhancement later)
        authGate.classList.add('hidden');

        if (userTier === 1) {
            // FOREMAN APP INIT
            managerInterface.classList.add('hidden');
            appInterface.classList.remove('hidden');
            if (typeof window.initForeman === 'function') await window.initForeman();
        } else {
            // COMMAND CENTER INIT
            appInterface.classList.add('hidden');
            managerInterface.classList.remove('hidden');
            
            // Tiered Feature Hiding
            const prodTabBtn = document.querySelector('[data-target="overview"]');
            const finTabBtn = document.querySelector('[data-target="finance"]');
            const setupTabBtn = document.querySelector('[data-target="projects"]');

            if (userTier < 3 && setupTabBtn) setupTabBtn.classList.add('hidden');
            if (userTier < 4 && finTabBtn) finTabBtn.classList.add('hidden');
            
            if (typeof window.initManager === 'function') window.initManager();
        }
    } catch (err) {
        console.error("Routing error:", err);
        authError.innerText = "Critical Routing Error. Check console logs.";
        authError.classList.remove('hidden');
    }
}

// 4. SESSION PERSISTENCE CHECK
(async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.currentUser = session.user;
            await routeUserBasedOnRole(session.user.id);
        }
    } catch (e) { 
        console.error('Session check error:', e); 
    }
})();

// 5. SECURE LOGOUT PROTOCOL
async function executeSecureSignOut() {
    try { await supabase.auth.signOut(); } 
    catch(e) { console.warn("Session termination error:", e); }
    
    window.currentUser = null;
    window.currentRole = null;
    if(emailInput) emailInput.value = ''; 
    if(passwordInput) passwordInput.value = ''; 
    window.location.reload(); // Hard flush memory
}

document.getElementById('signOutBtn')?.addEventListener('click', executeSecureSignOut);
document.getElementById('managerSignOutBtn')?.addEventListener('click', executeSecureSignOut);