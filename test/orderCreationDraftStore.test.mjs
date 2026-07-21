import test from 'node:test';
import assert from 'node:assert/strict';

import { EncryptedOrderCreationDraftStore } from '../src/orderCreationDraftStore.js';

test('draft store persists only ciphertext and restores one actor-company draft', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderCreationDraftStore({ storage, keyProvider: async () => key });
  const draft = { step: 2, fields: { phone: '15000000000', vin: 'VIN-SECRET', customer: '王先生' } };

  await store.save('worker', 'tongda', draft);
  const raw = storage.records.get('worker:tongda');
  const serialized = JSON.stringify(raw);
  assert.equal(serialized.includes('15000000000'), false);
  assert.equal(serialized.includes('VIN-SECRET'), false);
  assert.equal(raw.version, 1);
  assert.deepEqual(await store.load('worker', 'tongda'), draft);
});

test('drafts are isolated, replace the previous value and can be deleted', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderCreationDraftStore({ storage, keyProvider: async () => key });

  await store.save('worker', 'tongda', { step: 0, fields: { customer: 'A' } });
  await store.save('worker', 'tongda', { step: 1, fields: { customer: 'B' } });
  await store.save('worker', 'xinqiheng', { step: 0, fields: { customer: 'C' } });
  assert.equal(storage.records.size, 2);
  assert.equal((await store.load('worker', 'tongda')).fields.customer, 'B');
  assert.equal((await store.load('worker', 'xinqiheng')).fields.customer, 'C');
  await store.delete('worker', 'tongda');
  assert.equal(await store.load('worker', 'tongda'), null);
});

test('damaged ciphertext is removed without leaking content', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderCreationDraftStore({ storage, keyProvider: async () => key });
  await store.save('worker', 'tongda', { fields: { phone: '15000000000' } });
  storage.records.get('worker:tongda').ciphertext = 'AAAA';

  assert.equal(await store.load('worker', 'tongda'), null);
  assert.equal(storage.records.has('worker:tongda'), false);
});

function memoryStorage() {
  const records = new Map();
  return {
    records,
    async get(key) { return records.get(key) || null; },
    async put(key, value) { records.set(key, structuredClone(value)); },
    async delete(key) { records.delete(key); },
  };
}
