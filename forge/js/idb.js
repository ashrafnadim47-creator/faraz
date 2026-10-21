/* FORGE — IndexedDB wrapper: blobs (media bytes), thumbs, peaks, projects */
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const req = indexedDB.open('forge-db', 2);
      req.onupgradeneeded = () => {
        const d = req.result;
        for (const s of ['blobs', 'thumbs', 'peaks', 'projects', 'users']) {
          if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
        }
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  return dbp;
}

async function tx(storeName, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(storeName, mode);
    const st = t.objectStore(storeName);
    const out = fn(st);
    t.oncomplete = () => {
      // Always resolve an IDBRequest to its result, including undefined for a missing key.
      // Otherwise callers receive the request object itself and media URLs can become
      // \"[object IDBRequest]\", which the browser treats as a broken resource URL.
      if (typeof IDBRequest !== 'undefined' && out instanceof IDBRequest) res(out.result);
      else res(out);
    };
    t.onerror = () => rej(t.error);
  });
}

export const idbPut = (storeName, key, value) => tx(storeName, 'readwrite', st => st.put(value, key));
export const idbGet = (storeName, key) => tx(storeName, 'readonly', st => st.get(key));
export const idbDelete = (storeName, key) => tx(storeName, 'readwrite', st => st.delete(key));
export const idbGetAll = (storeName) => tx(storeName, 'readonly', st => st.getAll());
export const idbClear = (storeName) => tx(storeName, 'readwrite', st => st.clear());
