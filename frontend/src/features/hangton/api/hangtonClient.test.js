import test from 'node:test';
import assert from 'node:assert/strict';
import * as client from './hangtonClient.js';

test('hangtonClient exports all 4 standard read functions', () => {
  assert.equal(typeof client.fetchSnapshots, 'function');
  assert.equal(typeof client.fetchOverview, 'function');
  assert.equal(typeof client.fetchCompare, 'function');
  assert.equal(typeof client.fetchItems, 'function');
});
