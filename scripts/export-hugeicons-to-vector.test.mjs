import assert from 'node:assert/strict';
import test from 'node:test';
import { ICON_SPECS, renderVectorDrawable } from './export-hugeicons-to-vector.mjs';

test('exports the approved Hugeicons set as tintable 24dp vectors', () => {
  assert.equal(ICON_SPECS.length, 24);
  for (const spec of ICON_SPECS) {
    const xml = renderVectorDrawable(spec.nodes);
    assert.match(xml, /android:width="24dp"/);
    assert.match(xml, /android:viewportWidth="24"/);
    assert.match(xml, /android:strokeColor="#FF000000"/);
    assert.doesNotMatch(xml, /android:fillColor="#FF000000"/);
  }
});
