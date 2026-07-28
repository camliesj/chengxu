import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshCompanyArchives } from '../src/archiveRefreshLogic.js';

test('archive refresh returns the current company vehicle and insurance records', async () => {
  const calls = [];
  const result = await refreshCompanyArchives({
    companyId: 'tongda',
    session: { token: 'token' },
    fetchVehicles: async (session) => {
      calls.push(['vehicles', session.token]);
      return [{ id: 'CV-1', companyId: 'tongda' }];
    },
    fetchPolicies: async (session) => {
      calls.push(['policies', session.token]);
      return [{ id: 'IP-1', companyId: 'tongda', version: 1 }];
    },
  });

  assert.deepEqual(calls, [['vehicles', 'token'], ['policies', 'token']]);
  assert.deepEqual(result.vehicles.map((row) => row.id), ['CV-1']);
  assert.deepEqual(result.policies.map((row) => row.id), ['IP-1']);
});
