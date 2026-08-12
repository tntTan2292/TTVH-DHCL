import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./SharedLayout.jsx', import.meta.url), 'utf8');

// Product Owner remediation (2026-08-11) — DEFECT A: GlobalFilterBar's search field
// (shared by Dashboard, BCVH Ranking, Route Ranking, and Evidence) is the only place
// the search <input> DOM element lives, so the IME-composition/debounce fix belongs
// here, not duplicated per-consumer. These are source-level regression guards, since
// this repository has no React rendering/jsdom test harness — the actual
// composition/debounce logic itself is unit-tested directly in
// searchCommitController.test.js.

test('GlobalFilterBar search input handles IME composition start/end, not just onChange', () => {
  assert.match(source, /onCompositionStart/);
  assert.match(source, /onCompositionEnd/);
});

test('GlobalFilterBar search input is wired through the shared composition-safe commit controller', () => {
  assert.match(source, /createSearchCommitController/);
  assert.match(source, /controllerRef\.current\.handleChange/);
  assert.match(source, /controllerRef\.current\.handleCompositionStart/);
  assert.match(source, /controllerRef\.current\.handleCompositionEnd/);
});

test('GlobalFilterBar search input disposes its controller on unmount (no leaked timers)', () => {
  assert.match(source, /controllerRef\.current\?\.dispose\(\)/);
});

// The raw <input onChange={(e) => onSearchChange?.(e.target.value)} .../> pattern is
// exactly the defect: every keystroke synchronously pushed a URL/search update,
// interrupting IME composition. It must not remain anywhere in this file.
test('GlobalFilterBar no longer commits on every raw keystroke without composition/debounce handling', () => {
  assert.doesNotMatch(source, /onChange=\{\(e\) => onSearchChange\?\.\(e\.target\.value\)\}/);
});
