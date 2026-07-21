const DATABASE_NAME = 'chengxu-order-creation';
const DATABASE_VERSION = 1;
const DRAFT_STORE = 'drafts';
const KEY_STORE = 'keys';
const KEY_ID = 'order-creation-aes-gcm-v1';

export class EncryptedOrderCreationDraftStore {
  constructor({ storage, keyProvider, cryptoImpl = globalThis.crypto }) {
    this.storage = storage;
    this.keyProvider = keyProvider;
    this.crypto = cryptoImpl;
  }

  async save(actor, companyId, draft) {
    const keyId = recordKey(actor, companyId);
    const key = await this.keyProvider();
    const iv = this.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(draft));
    const ciphertext = await this.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(keyId) },
      key,
      plaintext,
    );
    await this.storage.put(keyId, {
      version: 1,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      updatedAt: Date.now(),
    });
  }

  async load(actor, companyId) {
    const keyId = recordKey(actor, companyId);
    const record = await this.storage.get(keyId);
    if (!record) return null;
    try {
      if (record.version !== 1) throw new Error('Unsupported draft version');
      const key = await this.keyProvider();
      const plaintext = await this.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: base64ToBytes(record.iv),
          additionalData: new TextEncoder().encode(keyId),
        },
        key,
        base64ToBytes(record.ciphertext),
      );
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      await this.storage.delete(keyId);
      return null;
    }
  }

  async delete(actor, companyId) {
    await this.storage.delete(recordKey(actor, companyId));
  }
}

export function createBrowserOrderCreationDraftStore() {
  const databasePromise = openDatabase();
  const storage = {
    get: (key) => databaseRequest(databasePromise, DRAFT_STORE, 'readonly', (store) => store.get(key)),
    put: (key, value) => databaseRequest(databasePromise, DRAFT_STORE, 'readwrite', (store) => store.put(value, key)),
    delete: (key) => databaseRequest(databasePromise, DRAFT_STORE, 'readwrite', (store) => store.delete(key)),
  };
  const keyProvider = async () => {
    const existing = await databaseRequest(databasePromise, KEY_STORE, 'readonly', (store) => store.get(KEY_ID));
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await databaseRequest(databasePromise, KEY_STORE, 'readwrite', (store) => store.put(key, KEY_ID));
    return key;
  };
  return new EncryptedOrderCreationDraftStore({ storage, keyProvider });
}

function recordKey(actor, companyId) {
  return `${String(actor || '').trim()}:${String(companyId || '').trim()}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) database.createObjectStore(DRAFT_STORE);
      if (!database.objectStoreNames.contains(KEY_STORE)) database.createObjectStore(KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function databaseRequest(databasePromise, storeName, mode, operation) {
  const database = await databasePromise;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
