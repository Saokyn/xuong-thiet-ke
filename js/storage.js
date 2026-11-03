// IndexedDB storage for designs
const DB = (() => {
  let dbp;
  function open() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('xuong-thiet-ke', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('designs', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('designs', mode); const s = t.objectStore('designs');
      const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
    });
  }
  return {
    put: d => tx('readwrite', s => s.put(d)),
    get: id => tx('readonly', s => s.get(id)),
    del: id => tx('readwrite', s => s.delete(id)),
    all: async () => ((await tx('readonly', s => s.getAll())) || []).sort((a, b) => b.updated - a.updated),
  };
})();
window.DB = DB;
