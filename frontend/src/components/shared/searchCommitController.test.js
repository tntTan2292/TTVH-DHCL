import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchCommitController } from './searchCommitController.js';

// Deterministic fake scheduler — no real waiting, no flakiness. Tracks the single
// pending callback (the controller only ever schedules one at a time).
function makeFakeScheduler() {
  let pending = null;
  return {
    setTimeoutFn: (fn) => {
      pending = fn;
      return 'fake-timer';
    },
    clearTimeoutFn: (id) => {
      if (id === 'fake-timer') pending = null;
    },
    fire: () => {
      const fn = pending;
      pending = null;
      if (fn) fn();
    },
    hasPending: () => pending !== null,
  };
}

// --- DEFECT A: Vietnamese IME composition must never be searched mid-composition ---

test('handleChange during an active IME composition never commits (never searches an unfinished composed character)', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleCompositionStart();
  // Simulate the intermediate composition states a Vietnamese IME can pass through
  // while composing "phía" via Telex ("p", "ph", "phi", "phi'" -> "phí", "phía").
  controller.handleChange('p');
  controller.handleChange('ph');
  controller.handleChange('phi');
  controller.handleChange('phí');

  assert.equal(commits.length, 0, 'no intermediate composition state may ever be committed/searched');
  assert.equal(scheduler.hasPending(), false, 'no debounce timer may be scheduled while composing');
});

test('compositionend commits the final composed value immediately, with no debounce delay', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleCompositionStart();
  controller.handleChange('phi');
  controller.handleCompositionEnd('phía');

  assert.deepEqual(commits, ['phía'], 'compositionend must commit exactly the final composed value');
  assert.equal(scheduler.hasPending(), false, 'compositionend must not leave a pending debounce timer');
});

test('typing resumes normal debounced commits after composition ends', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleCompositionStart();
  controller.handleCompositionEnd('phía');
  controller.handleChange('phía tây');
  assert.equal(commits.length, 1, 'the plain keystroke after composition must debounce, not commit immediately');
  scheduler.fire();

  assert.deepEqual(commits, ['phía', 'phía tây']);
});

// --- Debounce coalescing (fast typing, paste, delete — none involve composition) ---

test('rapid successive plain keystrokes coalesce into a single trailing commit (fast typing)', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleChange('T');
  controller.handleChange('Tu');
  controller.handleChange('Tuy');
  controller.handleChange('Tuye');
  controller.handleChange('Tuyen');
  assert.equal(commits.length, 0, 'nothing commits before the debounce timer actually fires');

  scheduler.fire();
  assert.deepEqual(commits, ['Tuyen'], 'only the final value of a burst of keystrokes is committed, exactly once');
});

test('paste (a single change event with the full pasted text) debounces and commits normally', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleChange('535790 Hương Phong'); // one native input event, as paste produces
  scheduler.fire();

  assert.deepEqual(commits, ['535790 Hương Phong']);
});

test('delete/backspace keystrokes debounce and commit the final (possibly empty) value', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleChange('Tuye');
  controller.handleChange('Tuy');
  controller.handleChange('Tu');
  controller.handleChange('T');
  controller.handleChange('');
  scheduler.fire();

  assert.deepEqual(commits, ['']);
});

test('dispose cancels a pending debounce timer so no late/stale commit can fire', () => {
  const commits = [];
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: (v) => commits.push(v), ...scheduler });

  controller.handleChange('Tuyen A');
  assert.equal(scheduler.hasPending(), true);
  controller.dispose();
  assert.equal(scheduler.hasPending(), false);
});

test('isComposing reflects the current composition state', () => {
  const scheduler = makeFakeScheduler();
  const controller = createSearchCommitController({ onCommit: () => {}, ...scheduler });

  assert.equal(controller.isComposing(), false);
  controller.handleCompositionStart();
  assert.equal(controller.isComposing(), true);
  controller.handleCompositionEnd('x');
  assert.equal(controller.isComposing(), false);
});
