import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// F13-ROUTE-EVIDENCE-STATUS-02 (T-F01):
// Client-side full-fetch model (fetchAllEvidenceRows, EVIDENCE_FETCH_PAGE_SIZE, EVIDENCE_FETCH_MAX_PAGES)
// is permanently retired in favor of server-side pagination via GET /f13/evidence.

const shipmentDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(shipmentDir, '..', '..');

test('T-F01: shipmentPerformanceData.js (the home of the fetch-all model) is deleted (F13-GOLIVE-CHECK-01 P2)', () => {
  assert.equal(fs.existsSync(path.join(shipmentDir, 'shipmentPerformanceData.js')), false);
});

test('T-F01: ShipmentPerformancePage.jsx is deleted (G6), so no page can use fetch-all logic', () => {
  assert.equal(fs.existsSync(path.join(shipmentDir, 'ShipmentPerformancePage.jsx')), false);
});

test('T-F01: No file in frontend/src references fetchAllEvidenceRows', () => {
  const scanDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        if (entry.name.endsWith('.test.js') || entry.name.endsWith('.test.jsx')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.doesNotMatch(
          content,
          /fetchAllEvidenceRows/,
          `Source file ${entry.name} still references retired fetchAllEvidenceRows`,
        );
      }
    }
  };

  scanDir(srcDir);
});
