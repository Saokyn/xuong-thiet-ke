// IndexedDB storage: designs + brand kit
const DB = (() => {
  let dbp;
  function open() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('xuong-thiet-ke', 3); // v3 (Phase 10): + 'fonts' store; upgrades are additive only
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('designs')) db.createObjectStore('designs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('brand')) db.createObjectStore('brand', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fonts')) db.createObjectStore('fonts', { keyPath: 'id' });
      };
      r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); dbp = null; }; res(db); }; r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const s = t.objectStore(store);
      const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
    });
  }
  return {
    put: d => tx('designs', 'readwrite', s => s.put(d)),
    get: id => tx('designs', 'readonly', s => s.get(id)),
    del: id => tx('designs', 'readwrite', s => s.delete(id)),
    all: async () => ((await tx('designs', 'readonly', s => s.getAll())) || []).sort((a, b) => b.updated - a.updated),
    getBrand: async () => (await tx('brand', 'readonly', s => s.get('kit'))) || { id: 'kit', colors: [], fontH: 'Montserrat', fontB: 'Be Vietnam Pro', logos: [] },
    fontsAll: async () => (await tx('fonts', 'readonly', s => s.getAll())) || [],
    fontPut: f => tx('fonts', 'readwrite', s => s.put(f)),
    fontDel: id => tx('fonts', 'readwrite', s => s.delete(id)),
    putBrand: k => tx('brand', 'readwrite', s => s.put({ ...k, id: 'kit' })),
  };
})();
window.DB = DB;
