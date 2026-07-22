/**
 * Pure helper functions for Hue backfill date selection logic.
 * Extracted to allow direct unit testing without React render framework.
 *
 * Contract (AUTO-IMPORT-006 R2.1):
 * - COMPLETE rows MUST be selectable regardless of session readiness.
 * - Session readiness only gates the submit button (updateDisabled), not checkbox interaction.
 * - Checkbox disabled ONLY when: !item.selectable || queueIsActive || queueSubmitting.
 */

/**
 * Toggle a single date in and out of the selected dates array.
 * Also updates refreshDates for COMPLETE status dates.
 *
 * @param {string[]} currentSelected - currently selected dates
 * @param {string[]} currentRefresh  - currently tracked refresh (COMPLETE) dates
 * @param {string}   date            - measurement_date to toggle
 * @param {string}   status          - 'MISSING' | 'COMPLETE' | 'MANUAL_REVIEW_REQUIRED'
 * @returns {{ selectedDates: string[], refreshDates: string[] }}
 */
export function toggleDateSelection(currentSelected, currentRefresh, date, status) {
  const isSelected = currentSelected.includes(date);
  if (isSelected) {
    return {
      selectedDates: currentSelected.filter((d) => d !== date),
      refreshDates: status === 'COMPLETE'
        ? currentRefresh.filter((d) => d !== date)
        : currentRefresh,
    };
  } else {
    return {
      selectedDates: [...currentSelected, date].sort(),
      refreshDates: status === 'COMPLETE'
        ? [...currentRefresh, date].sort()
        : currentRefresh,
    };
  }
}

/**
 * Toggle all selectable dates (select-all / deselect-all behaviour).
 *
 * @param {boolean}  allChosen          - whether all selectable dates are already chosen
 * @param {string[]} allSelectableDates  - dates with selectable=true
 * @param {object[]} selectableScanRows  - scan result rows with selectable=true
 * @returns {{ selectedDates: string[], refreshDates: string[] }}
 */
export function toggleAllDates(allChosen, allSelectableDates, selectableScanRows) {
  if (allChosen) {
    return { selectedDates: [], refreshDates: [] };
  }
  const completeSelectables = selectableScanRows
    .filter((item) => item.status === 'COMPLETE')
    .map((item) => item.measurement_date);
  return {
    selectedDates: allSelectableDates,
    refreshDates: completeSelectables,
  };
}

/**
 * Determine whether a checkbox row should be disabled.
 *
 * CONTRACT: session readiness MUST NOT disable the checkbox.
 * Only queueIsActive, queueSubmitting, and !item.selectable disable the checkbox.
 *
 * @param {boolean} selectable     - item.selectable from scan result
 * @param {boolean} queueIsActive  - whether a queue is currently running
 * @param {boolean} queueSubmitting - whether a submit request is in-flight
 * @returns {boolean}
 */
export function isCheckboxDisabled(selectable, queueIsActive, queueSubmitting) {
  return !selectable || queueIsActive || queueSubmitting;
}

/**
 * Determine whether the submit/update button should be disabled.
 *
 * @param {boolean} sessionReady    - hueSessionStatus === 'SESSION_VALID'
 * @param {number}  selectedCount   - selectedDates.length
 * @param {boolean} submitting      - queueSubmitting
 * @param {boolean} queueIsActive   - whether a queue is currently running
 * @returns {boolean}
 */
export function isSubmitDisabled(sessionReady, selectedCount, submitting, queueIsActive) {
  return !sessionReady || selectedCount === 0 || submitting || queueIsActive;
}
