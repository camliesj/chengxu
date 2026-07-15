import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('repair batch export is gated by export permission and opens the export page', () => {
  assert.match(appSource, /canExportData=\{canExportData\}/);
  assert.match(appSource, /onBatchExport=\{\(\) => setActivePage\('数据导出'\)\}/);
  assert.match(appSource, /canExportData \? \([\s\S]{0,500}onClick=\{onBatchExport\}[\s\S]{0,200}批量导出/);
});
