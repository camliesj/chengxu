import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [editContract, statusContract, webSource, serverLegacySource, serverEditSource, androidDraftSource, androidCreateModels, androidStatusModels] = await Promise.all([
  read('../contracts/order-edit-v1.json').then(JSON.parse),
  read('../contracts/order-status-v1.json').then(JSON.parse),
  read('../src/App.jsx'),
  read('../functions/api/orders.js'),
  read('../functions/_shared/order-edit.js'),
  read('../android-client/app/src/main/java/com/chengxu/autoservice/core/orders/cache/EncryptedOrderStore.kt'),
  read('../android-client/app/src/main/java/com/chengxu/autoservice/ui/create/CreateOrderModels.kt'),
  read('../android-client/app/src/main/java/com/chengxu/autoservice/core/orders/model/OrderModels.kt'),
]);

test('ordinary status writes cannot fall back to the legacy web upsert route', () => {
  assert.doesNotMatch(webSource, /upsertOrder\(\{\s*\.\.\.currentOrder,\s*status:/u);
  assert.match(webSource, /changeOrderStatusCommand\(/u);
});

test('legacy ordinary edits use the shared command and do not duplicate status catalogues', () => {
  assert.match(serverLegacySource, /handleEditOrderCommand/u);
  assert.doesNotMatch(serverLegacySource, /const CURRENT_STATUSES\s*=\s*\[/u);
  assert.match(serverEditSource, /ORDER_EDIT_FIELDS/u);
});

test('Android edit/status names and encrypted draft namespaces remain aligned with fixtures', () => {
  assert.match(androidDraftSource, /"edit:\$orderId"/u);
  assert.match(androidDraftSource, /"status:\$orderId"/u);
  for (const field of editContract.fields) {
    const androidField = field === 'laborCents' ? 'labor' : field === 'materialCents' ? 'material' : field;
    assert.match(androidCreateModels, new RegExp(`"${androidField}"`, 'u'), field);
  }
  for (const status of [...statusContract.targets, '已结算']) {
    assert.match(androidStatusModels, new RegExp(`"${status}"`, 'u'), status);
  }
});
