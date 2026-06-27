/* ==========================================================================
   TITAN CORE ENGINE: 3D DIGITAL TWIN & SPATIAL TELEMETRY
   Handles Three.js Scene, Procedural Generation, and Raycasting
   ========================================================================== */

window.initPaverDigitalTwin = function() {
    if (window.paverEngineActive) return;
    window.paverEngineActive = true;

    const container = document.getElementById('paveops-3d-viewport');
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060a0e, 0.012);
    
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(20, 15, -25);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 2, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 40, -10);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(300, 300, 0x1a2736, 0x0c1219);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // 2. PROCEDURAL TEXTURES & MATERIALS
    function createAsphaltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0c0c0c'; 
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 40000; i++) {
            const val = Math.random();
            ctx.fillStyle = val > 0.85 ? '#2a2a2a' : val > 0.4 ? '#050505' : '#181818';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2.5, Math.random() * 2.5);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 100);
        return texture;
    }

    const asphaltTex = createAsphaltTexture();
    const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.8, metalness: 0.15 });
    const badAsphaltMat = new THREE.MeshStandardMaterial({ color: 0x3b1111, roughness: 0.9, metalness: 0.1 });

    const paver = new THREE.Group();
    scene.add(paver);

    // 3. STEAM PARTICLE SYSTEM
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleVel = [];
    
    for (let i = 0; i < particleCount; i++) {
        particlePos[i*3] = (Math.random()-0.5)*5; 
        particlePos[i*3+1] = Math.random(); 
        particlePos[i*3+2] = -(Math.random()*2)-3.5;
        particleVel.push({ x: (Math.random()-0.5)*0.005, y: Math.random()*0.01+0.005, z: (Math.random()-0.5)*0.005 });
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending });
    const steamParticles = new THREE.Points(particleGeo, particleMat);
    steamParticles.visible = false;
    paver.add(steamParticles);

    // 4. MODEL LOADER (WIRTGEN PAVER)
    const loader = new THREE.GLTFLoader();
    loader.load('/assets/wirtgen-paver.glb', function(gltf) {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6.0 / maxDim;
        
        model.scale.set(scale, scale, scale);
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        model.position.y = (-box.min.y * scale) + 0.05;
        model.rotation.y = -Math.PI / 2; // Adjust if model faces wrong way
        
        model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
        paver.add(model);
        steamParticles.visible = true;
        
        const loaderUI = document.getElementById('dt-loader');
        if (loaderUI) { 
            loaderUI.style.opacity = '0'; 
            setTimeout(() => loaderUI.style.display = 'none', 500); 
        }
    }, function(xhr) {
        const prog = document.getElementById('dt-progress');
        if (prog) prog.innerText = Math.round(xhr.loaded / xhr.total * 100) + '%';
    }, function(error) { 
        console.error("GLB Load Error:", error); 
        // Fallback cube if model fails to load
        const fallbackGeo = new THREE.BoxGeometry(4, 3, 6);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
        const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
        fallbackMesh.position.y = 1.5;
        paver.add(fallbackMesh);
        steamParticles.visible = true;
        document.getElementById('dt-loader').style.display = 'none';
    });

    // 5. ENVIRONMENT GENERATION
    const MAX_LANE_LENGTH = 150, LANE_WIDTH = 3.5;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x243815, roughness: 1.0 }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.05, 50); scene.add(grass);
    
    const gravel = new THREE.Mesh(new THREE.PlaneGeometry(LANE_WIDTH + 2, MAX_LANE_LENGTH + 50), new THREE.MeshStandardMaterial({ color: 0x5a544a, roughness: 0.9 }));
    gravel.rotation.x = -Math.PI / 2; gravel.position.set(0, 0, MAX_LANE_LENGTH / 2 - 10); scene.add(gravel);
    
    const unpavedPath = new THREE.Mesh(new THREE.PlaneGeometry(LANE_WIDTH, MAX_LANE_LENGTH), new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 0.9 }));
    unpavedPath.rotation.x = -Math.PI / 2; unpavedPath.position.set(0, 0.02, MAX_LANE_LENGTH / 2); scene.add(unpavedPath);

    const pavedSegmentsGroup = new THREE.Group();
    scene.add(pavedSegmentsGroup);

    // 6. RAYCASTING (HOVER TOOLTIP LOGIC)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('dt-tooltip');
    let hoveredMesh = null;

    container.addEventListener('mousemove', event => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        if (tooltip) { 
            tooltip.style.left = (event.clientX - rect.left + 15) + 'px'; 
            tooltip.style.top = (event.clientY - rect.top + 15) + 'px'; 
        }
    });

    let currentZ = 0, targetZ = 0;

    // 7. EXTERNAL UPDATE HOOK (Called by Data Engine)
    window.updateDigitalTwin = function(pavedArea, targetArea, ticketsArray, specThick, specTol) {
        // Update HTML Counters
        if (document.getElementById('dt-paved')) document.getElementById('dt-paved').innerText = pavedArea.toFixed(1) + ' m²';
        if (document.getElementById('dt-target')) document.getElementById('dt-target').innerText = targetArea > 0 ? targetArea.toFixed(1) + ' m²' : '0 m²';
        const remaining = Math.max(0, targetArea - pavedArea);
        if (document.getElementById('dt-remain')) document.getElementById('dt-remain').innerText = remaining.toFixed(1) + ' m²';
        const percent = targetArea > 0 ? (pavedArea / targetArea) : 0;
        if (document.getElementById('dt-percent')) document.getElementById('dt-percent').innerText = (percent * 100).toFixed(1) + '%';
        
        targetZ = percent * MAX_LANE_LENGTH;

        // Garbage Collection: Clear old mat
        while (pavedSegmentsGroup.children.length > 0) {
            const child = pavedSegmentsGroup.children[0];
            pavedSegmentsGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
        }
        if (targetArea <= 0 || !ticketsArray || ticketsArray.length === 0) return;

        // Rebuild Spatial Map
        const sortedLogs = [...ticketsArray].sort((a, b) => new Date(a.scanned_at || a.created_at || 0) - new Date(b.scanned_at || b.created_at || 0));
        let offsetZ = 0;
        const sharedLineGeom = new THREE.PlaneGeometry(LANE_WIDTH, 0.15);
        const sharedLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        sortedLogs.forEach((log, index) => {
            const ticketArea = Number(log.total_area || log.area || 0);
            if (ticketArea <= 0) return;
            
            const segLen = (ticketArea / targetArea) * MAX_LANE_LENGTH;
            const logThick = Number(log.calculated_thickness || log.thickness || 0);
            const minL = specThick - specTol, maxL = specThick + specTol;
            const inSpec = logThick >= minL && logThick <= maxL;

            const segGeom = new THREE.PlaneGeometry(LANE_WIDTH, segLen);
            const segMesh = new THREE.Mesh(segGeom, inSpec ? asphaltMat : badAsphaltMat);
            segMesh.rotation.x = -Math.PI / 2;
            segMesh.position.set(0, 0.05, offsetZ + segLen / 2);
            
            segMesh.userData = {
                ticketId: log.ticket_number || log.truck || 'N/A',
                mix: log.mix_type || log.material || 'N/A',
                tons: Number(log.effective_mass || log.tonnage || 0).toFixed(2),
                thickness: logThick.toFixed(1),
                inSpec: inSpec,
                date: log.delivery_date || "N/A"
            };
            pavedSegmentsGroup.add(segMesh);

            // Add joint seam
            if (index > 0) {
                const lineMesh = new THREE.Mesh(sharedLineGeom, sharedLineMat);
                lineMesh.rotation.x = -Math.PI / 2;
                lineMesh.position.set(0, 0.055, offsetZ);
                pavedSegmentsGroup.add(lineMesh);
            }
            offsetZ += segLen;
        });
    };

    // 8. TIME SCRUBBER LOGIC
    const scrubber = document.getElementById('dt-scrubber');
    const scrubberLabel = document.getElementById('dt-scrubber-label');
    if (scrubber) {
        scrubber.addEventListener('input', e => {
            const pct = e.target.value / 100;
            if (scrubberLabel) scrubberLabel.innerText = pct === 1 ? 'Live (100%)' : `Rewind: ${Math.round(pct * 100)}%`;
            
            const scrubbedZ = targetZ * pct;
            currentZ = scrubbedZ; 
            paver.position.z = currentZ;
            camera.position.z = 20 + currentZ; 
            controls.target.z = currentZ;
            
            pavedSegmentsGroup.children.forEach(child => { 
                child.visible = child.position.z <= scrubbedZ; 
            });
        });
    }

    // 9. ANIMATION LOOP
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        
        // Paver advance animation
        if (currentZ < targetZ) { 
            currentZ += 0.05; 
            paver.position.z = currentZ; 
            camera.position.z += 0.05; 
            controls.target.z += 0.05; 
        }
        
        // Steam animation
        if (steamParticles.visible) {
            const pos = steamParticles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                pos[i*3] += particleVel[i].x; 
                pos[i*3+1] += particleVel[i].y; 
                pos[i*3+2] += particleVel[i].z;
                if (pos[i*3+1] > 2.5) { 
                    pos[i*3] = (Math.random()-0.5)*5; 
                    pos[i*3+1] = 0; 
                    pos[i*3+2] = -(Math.random()*2)-3.5; 
                }
            }
            steamParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Raycaster update
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(pavedSegmentsGroup.children);
        
        if (intersects.length > 0 && tooltip) {
            const obj = intersects[0].object;
            if (hoveredMesh !== obj && obj.userData.ticketId) {
                hoveredMesh = obj;
                const d = obj.userData;
                tooltip.innerHTML = `
                    <div class="flex justify-between items-center border-b border-themeborder pb-2 mb-2">
                        <span class="text-[10px] font-code text-thememuted uppercase tracking-widest">Ticket ID</span>
                        <span class="text-xs font-black text-themetext">${d.ticketId}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-left">
                        <div><span class="block text-[8px] font-code text-thememuted uppercase tracking-widest">Yield</span><span class="text-xs font-bold text-themetext">${d.tons}t</span></div>
                        <div><span class="block text-[8px] font-code text-thememuted uppercase tracking-widest">Thickness</span><span class="text-xs font-bold ${d.inSpec ? 'text-emerald-400' : 'text-rose-400'}">${d.thickness}mm</span></div>
                        <div><span class="block text-[8px] font-code text-thememuted uppercase tracking-widest">Mix</span><span class="text-xs font-bold text-themetext">${d.mix}</span></div>
                        <div><span class="block text-[8px] font-code text-thememuted uppercase tracking-widest">Date</span><span class="text-xs font-bold text-themetext">${d.date}</span></div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-themeborder">
                        <span class="text-[9px] font-black uppercase tracking-widest ${d.inSpec ? 'text-emerald-400' : 'text-rose-400'}">${d.inSpec ? 'WITHIN SPEC' : 'OUT OF SPECIFICATION'}</span>
                    </div>`;
                tooltip.style.opacity = '1';
            }
        } else if (tooltip) { 
            tooltip.style.opacity = '0'; 
            hoveredMesh = null; 
        }
        renderer.render(scene, camera);
    }
    animate();

    // 10. RESIZE HANDLER
    new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }).observe(container);
};