import test from 'node:test';
import assert from 'node:assert/strict';

import { EncryptedOrderCreationDraftStore } from '../src/orderCreationDraftStore.js';
import { EncryptedOrderEditDraftStore } from '../src/orderEditDraftStore.js';

test('edit drafts are encrypted and isolated by actor, company, and order', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderEditDraftStore({ storage, keyProvider: async () => key });
  const draftOne = draft('13800000000', 4);
  const draftTwo = draft('13900000000', 7);

  await store.save('user-a', 'tongda', 'RO1', draftOne);
  await store.save('user-a', 'tongda', 'RO2', draftTwo);
  await store.save('user-a', 'xinqiheng', 'RO1', draft('13700000000', 2));

  assert.deepEqual(await store.load('user-a', 'tongda', 'RO1'), draftOne);
  assert.deepEqual(await store.load('user-a', 'tongda', 'RO2'), draftTwo);
  assert.equal(JSON.stringify([...storage.records]).includes('13800000000'), false);
  assert.equal(JSON.stringify([...storage.records]).includes('requiredFields'), false);
  assert.equal(storage.records.get('edit:user-a:tongda:RO1').version, 1);
  assert.equal(Buffer.from(storage.records.get('edit:user-a:tongda:RO1').iv, 'base64').byteLength, 12);
});

test('additional authenticated data prevents moving ciphertext between order keys', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderEditDraftStore({ storage, keyProvider: async () => key });

  await store.save('user-a', 'tongda', 'RO1', draft('13800000000', 4));
  storage.records.set(
    'edit:user-a:tongda:RO2',
    structuredClone(storage.records.get('edit:user-a:tongda:RO1')),
  );

  assert.equal(await store.load('user-a', 'tongda', 'RO2'), null);
  assert.equal(storage.records.has('edit:user-a:tongda:RO2'), false);
  assert.notEqual(await store.load('user-a', 'tongda', 'RO1'), null);
});

test('actor-company deletion removes only matching edit drafts and preserves creation drafts', async () => {
  const storage = memoryStorage();
  const createKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const editKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const creationStore = new EncryptedOrderCreationDraftStore({ storage, keyProvider: async () => createKey });
  const editStore = new EncryptedOrderEditDraftStore({ storage, keyProvider: async () => editKey });

  const creationDraft = { step: 1, fields: { phone: '13600000000' } };
  await creationStore.save('user-a', 'tongda', creationDraft);
  await editStore.save('user-a', 'tongda', 'RO1', draft('13800000000', 4));
  await editStore.save('user-a', 'tongda', 'RO2', draft('13900000000', 5));
  await editStore.save('user-b', 'tongda', 'RO3', draft('13700000000', 6));

  await editStore.deleteForActorCompany('user-a', 'tongda');

  assert.equal(await editStore.load('user-a', 'tongda', 'RO1'), null);
  assert.equal(await editStore.load('user-a', 'tongda', 'RO2'), null);
  assert.notEqual(await editStore.load('user-b', 'tongda', 'RO3'), null);
  assert.deepEqual(await creationStore.load('user-a', 'tongda'), creationDraft);
  assert.equal(storage.records.has('user-a:tongda'), true);
});

test('corrupt and unknown-version records are deleted', async () => {
  const storage = memoryStorage();
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const store = new EncryptedOrderEditDraftStore({ storage, keyProvider: async () => key });

  await store.save('user-a', 'tongda', 'RO1', draft('13800000000', 4));
  storage.records.get('edit:user-a:tongda:RO1').ciphertext = 'AAAA';
  assert.equal(await store.load('user-a', 'tongda', 'RO1'), null);
  assert.equal(storage.records.has('edit:user-a:tongda:RO1'), false);

  storage.records.set('edit:user-a:tongda:RO2', { version: 99, iv: '', ciphertext: '' });
  assert.equal(await store.load('user-a', 'tongda', 'RO2'), null);
  assert.equal(storage.records.has('edit:user-a:tongda:RO2'), false);
});

function draft(phone, expectedVersion) {
  return {
    step: 2,
    expectedVersion,
    baseSnapshot: { phone, record: '原始记录' },
    fields: { phone, record: '本地记录' },
    metadata: {
      requiredFields: ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'],
      options: { insurers: ['人保财险'] },
    },
  };
}

function memoryStorage() {
  const records = new Map();
  return {
    records,
    async get(key) { return records.get(key) || null; },
    async put(key, value) { records.set(key, structuredClone(value)); },
    async delete(key) { records.delete(key); },
    async keys() { return [...records.keys()]; },
  };
}
