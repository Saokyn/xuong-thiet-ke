// IndexedDB storage: designs + brand kit
const DB = (() => {
  let dbp;
  function open() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('xuong-thiet-ke', 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('designs')) db.createObjectStore('designs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('brand')) db.createObjectStore('brand', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
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
    putBrand: k => tx('brand', 'readwrite', s => s.put({ ...k, id: 'kit' })),
  };
})();
window.DB = DB;
