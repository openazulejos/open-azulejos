(function installOpenAzulejosOfflineQueue(global) {
  "use strict";

  const DATABASE_NAME = "open-azulejos-offline";
  const DATABASE_VERSION = 1;
  const STORE_NAME = "pending-contributions";
  let databasePromise = null;

  function requireIndexedDb() {
    if (!global.indexedDB) throw new Error("offline storage is unavailable on this device");
    return global.indexedDB;
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error("offline storage failed to open"));
      };
    });
    return databasePromise;
  }

  async function transaction(mode, operation) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result;
      try {
        result = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error || result?.error || new Error("offline storage transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("offline storage transaction aborted"));
    });
  }

  function normalizePayload(payload) {
    if (!payload || !payload.uploadId) throw new Error("offline contribution requires an upload id");
    return {
      id: String(payload.uploadId),
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    };
  }

  async function enqueue(payload) {
    const entry = normalizePayload(payload);
    await transaction("readwrite", (store) => store.put(entry));
    return entry;
  }

  async function list() {
    const entries = await transaction("readonly", (store) => store.getAll());
    return (entries || []).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async function remove(id) {
    await transaction("readwrite", (store) => store.delete(String(id)));
  }

  async function markFailure(entry, error) {
    const next = {
      ...entry,
      attempts: Number(entry.attempts || 0) + 1,
      lastError: String(error?.message || error || "upload failed"),
    };
    await transaction("readwrite", (store) => store.put(next));
    return next;
  }

  global.OpenAzulejosOfflineQueue = {
    enqueue,
    list,
    markFailure,
    normalizePayload,
    remove,
  };
})(typeof window === "undefined" ? globalThis : window);
