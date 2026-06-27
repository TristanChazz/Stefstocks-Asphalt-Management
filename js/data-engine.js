/* ==========================================================================
   TITAN CORE ENGINE: DATA & TELEMETRY ENGINE
   Handles Math Logic, Offline-first Caching, and Real-time Synchronization
   ========================================================================== */

// 1. OFFLINE-FIRST DB (INDEXEDDB)
const OFFLINE_DB_NAME = 'PaveOpsOfflineDB';
const OFFLINE_STORE_NAME = 'sync_queue';

function initOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(OFFLINE_DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 2. DATA SUBMISSION & TELEMETRY
async function idbPut(entry) {
    try {
        if (navigator.onLine) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized.");

            const { error } = await supabase.from('pave_ops_logs').insert([{
                project_id: entry.project_id,
                ticket_number: entry.ticket,
                delivered_mass: entry.tonnage,
                effective_mass: entry.effectiveMass,
                total_area: entry.area,
                calculated_thickness: entry.thickness,
                mix_type: entry.material,
                supplier: entry.company,
                vehicle_registration: entry.registration,
                delivery_date: entry.delivery_date
            }]);
            if (error) throw error;
        } else {
            throw new Error("Device offline - queueing.");
        }
    } catch (err) {
        const db = await initOfflineDB();
        const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
        tx.objectStore(OFFLINE_STORE_NAME).put(entry);
        window.showToast("Offline: Log queued to local vault", "warning");
    }
}

// 3. COTO 2020 CALCULATION LOGIC
window.calculateMetrics = (mass, length, width, brd, cutL, cutW, cutInc, wastedMass) => {
    let totalArea = length * width;
    if (cutInc === 'no') totalArea += (cutL * cutW);
    
    let effectiveMass = Math.max(0, mass - wastedMass);
    let spreadRate = effectiveMass > 0 ? (totalArea / effectiveMass) : 0;
    let thickness = (effectiveMass > 0 && totalArea > 0) ? ((effectiveMass * 1000) / (totalArea * brd)) : 0;
    
    return { totalArea, effectiveMass, spreadRate, thickness };
};

// 4. SYNC ENGINE (FLUSHING QUEUE)
async function flushOfflineQueue() {
    if (!navigator.onLine) return;
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    const logs = await new Promise(r => { const req = tx.objectStore(OFFLINE_STORE_NAME).getAll(); req.onsuccess = () => r(req.result); });
    
    if (logs.length === 0) return;

    for (const log of logs) {
        try {
            await idbPut(log); // Attempt re-sync
            tx.objectStore(OFFLINE_STORE_NAME).delete(log.id);
        } catch (e) { console.error("Sync retry failed:", e); }
    }
    window.showToast("Local vault synchronized with cloud");
}

window.addEventListener('online', flushOfflineQueue);