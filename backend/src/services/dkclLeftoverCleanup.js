'use strict';

// Export files this application asked the DKCL portal for and did not delete (failed or timed-out attempts, or a
// cleanup that failed) stay in the account's "Quan ly tep" list. After each queue job the executor, while it still
// owns the source, deletes a few of them (PO decision 2026-10-28). Only files whose name is one of our export names
// and that are at least LEFTOVER_MIN_AGE_MS old are touched; anything else in the list is left alone.

const LEFTOVER_MIN_AGE_MS = 15 * 60 * 1000;
const LEFTOVER_MAX_FILES = 10;
const LEFTOVER_TIME_BUDGET_MS = 60 * 1000;
const LEFTOVER_MAX_FAILURES = 3;

// <account>_DD-MM-YYYY_HH-mm-ss_<slug>[_chi_tiet]_NN.xlsx|csv, or the earlier <date>_<slug>[_chi_tiet](N).xlsx|csv
const LEFTOVER_EXPORT_NAME = new RegExp(
    '(?:^|_)(?:'
    + [
        'F1\\.1_bao_cao_chat_luong_toan_trinh_buu_giay_noi_tinh',
        'F1\\.2_CL_thu_gom_buu_giay_lien_tinh',
        'F1\\.3_chat_luong_phat_buu_giay_lien_tinh',
        'F4\\.1_chat_luong_phat_thanh_cong_cua_buu_cuc',
        'F4\\.2_chat_luong_phat_giao_buu_ta',
    ].join('|')
    + ')(?:_chi_tiet)?(?:_\\d+|\\(\\d+\\))\\.(?:xlsx|csv)$',
    'i',
);

// Never throws and never keeps the lane waiting past the budget: it runs inside the job's critical section.
async function sweepLeftoverFiles(portalClient, { source = '', logger = console, budgetMs = LEFTOVER_TIME_BUDGET_MS + 15000 } = {}) {
    if (typeof portalClient?.deleteLeftoverGeneratedFiles !== 'function') return null;
    let timer;
    try {
        const outcome = await Promise.race([
            portalClient.deleteLeftoverGeneratedFiles(),
            new Promise((resolve) => { timer = setTimeout(() => resolve({ timedOut: true }), budgetMs); }),
        ]);
        if (outcome?.timedOut) {
            logger.warn?.(`[DKCL-LEFTOVER] ${source} cleanup did not finish within ${budgetMs} ms; the lane moves on`);
        } else if (outcome && (outcome.candidates > 0 || outcome.failed > 0)) {
            logger.log?.(`[DKCL-LEFTOVER] ${source} listed=${outcome.listed} leftover=${outcome.candidates} deleted=${outcome.deleted} failed=${outcome.failed}${outcome.errors?.length ? ` errors=${JSON.stringify(outcome.errors)}` : ''}`);
        }
        return outcome || null;
    } catch (error) {
        logger.warn?.(`[DKCL-LEFTOVER] ${source} cleanup failed: ${error.message}`);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// Used by the DKCL keep-alive when a source has a valid session: with the queue idle nothing else would ever sweep,
// so the leftovers of earlier days would stay. Takes the source lock like a queue job; skips a source that is busy.
async function sweepWhenIdle(sessionService, source, { logger = console } = {}) {
    if (typeof sessionService?.withSourceLock !== 'function' || typeof sessionService?.getRegistryState !== 'function') return null;
    if (sessionService.getRegistryState(source)?.activeOperation) return null;
    return sessionService.withSourceLock(source, async () => {
        const entry = sessionService.getRegistryState(source);
        if (!entry || entry.activeOperation) return null;
        const client = sessionService.getInteractiveClient(source) || null;
        if (!client) return null;
        const marker = `LEFTOVER_CLEANUP_${source}`;
        entry.activeOperation = marker;
        try {
            return await sweepLeftoverFiles(client, { source, logger });
        } finally {
            if (entry.activeOperation === marker) entry.activeOperation = null;
        }
    });
}

module.exports = {
    LEFTOVER_MIN_AGE_MS,
    LEFTOVER_MAX_FILES,
    LEFTOVER_TIME_BUDGET_MS,
    LEFTOVER_MAX_FAILURES,
    LEFTOVER_EXPORT_NAME,
    sweepLeftoverFiles,
    sweepWhenIdle,
};
