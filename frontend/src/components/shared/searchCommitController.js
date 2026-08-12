// Composition-safe, debounced search-commit controller for GlobalFilterBar's search
// input (Product Owner remediation, 2026-08-11 — DEFECT A).
//
// Root cause traced: the search input was fully controlled straight off the URL
// (searchValue={search}), and every keystroke's onChange synchronously called
// setSearchParams — a React Router navigation that re-renders the whole page tree
// on every single character. When typing Vietnamese via an IME (UniKey/EVKey,
// Telex/VNI), that heavy synchronous re-render could land in the middle of an
// in-progress composition sequence (compositionstart..compositionend), corrupting
// or dropping characters — e.g. "phía" becoming "pịa".
//
// Contract this controller enforces:
// - While an IME composition is in progress, onCommit is never called — a
//   not-yet-finished composed character sequence must never be treated as a
//   finished search term (and must never trigger a URL/search update).
// - compositionend always commits the final composed value immediately, with no
//   extra debounce delay, so the search reflects exactly what the user finished
//   typing without a visible extra lag.
// - Outside composition (plain typing, paste, delete), commits are debounced so
//   rapid keystrokes each get coalesced into a single trailing commit instead of
//   one URL update per character.
export function createSearchCommitController({
  onCommit,
  debounceMs = 300,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let composing = false;
  let timer = null;

  function clearPending() {
    if (timer !== null) {
      clearTimeoutFn(timer);
      timer = null;
    }
  }

  return {
    isComposing: () => composing,

    handleCompositionStart() {
      composing = true;
      clearPending();
    },

    // `value` is the input's DOM value at the moment composition ended — the
    // final, fully-composed text (e.g. the completed "phía", not an intermediate
    // half-composed state).
    handleCompositionEnd(value) {
      composing = false;
      clearPending();
      onCommit(value);
    },

    // Called on every native input `change`/`input` event. Covers plain typing,
    // paste, and delete/backspace — none of those involve IME composition, so
    // they always debounce-and-commit normally. Calls arriving while `composing`
    // is true are intentionally ignored (the DOM value is still tracked by the
    // caller's own local state for display — this controller only gates commits).
    handleChange(value) {
      if (composing) return;
      clearPending();
      timer = setTimeoutFn(() => {
        timer = null;
        onCommit(value);
      }, debounceMs);
    },

    dispose() {
      clearPending();
    },
  };
}
