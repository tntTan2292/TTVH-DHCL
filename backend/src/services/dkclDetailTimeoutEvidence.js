'use strict';

// AUTO-IMPORT-016 P0: evidence for the F1.3 detail-table wait. Two things were missing on 16/11/2026: how long the
// table normally takes after the click (so a 30 s limit could be judged) and what the page looked like when it did
// not appear. This module measures event-loop delay (is the backend itself starved?) and, on a timeout, writes a
// screenshot and the page HTML (newest MAX_EVIDENCE_FILES kept) plus one log line of structural facts. It never
// throws, never records field values or cookies, and never takes more than a few seconds.

const fs = require('fs');
const path = require('path');
const { monitorEventLoopDelay } = require('perf_hooks');

const MAX_EVIDENCE_FILES = 20;
const EVIDENCE_PREFIX = 'f13-detail-timeout-';
const DEFAULT_DIR = path.join(__dirname, '..', '..', 'diagnostics', 'f13-detail-timeout');

let histogram = null;

function loopHistogram() {
    if (!histogram) {
        try {
            histogram = monitorEventLoopDelay({ resolution: 20 });
            histogram.enable();
        } catch (error) {
            histogram = false;
        }
    }
    return histogram || null;
}

// Starts a new measuring window (call right after the click).
function resetLoopDelay() {
    loopHistogram()?.reset();
}

// Longest event-loop delay in ms seen since the last reset (null when it cannot be measured).
function readLoopDelayMs() {
    const h = loopHistogram();
    if (!h || !Number.isFinite(h.max)) return null;
    return Math.round(h.max / 1e6);
}

function pruneEvidence(dir, keep = MAX_EVIDENCE_FILES) {
    try {
        const files = fs.readdirSync(dir)
            .filter((name) => name.startsWith(EVIDENCE_PREFIX))
            .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
        for (const file of files.slice(keep)) {
            try { fs.unlinkSync(path.join(dir, file.name)); } catch (error) { /* best effort */ }
        }
    } catch (error) { /* directory not there yet */ }
}

async function safe(fn, fallback) {
    try { return await fn(); } catch (error) { return fallback; }
}

// Facts about the page the moment the table failed to appear. Counts and booleans only.
async function describePage(page, detailFormSelector) {
    const url = safe(() => page.url(), null);
    const title = await safe(() => page.title(), null);
    const facts = await safe(() => page.evaluate((formSelector) => {
        const bodyText = document.body ? document.body.innerText : '';
        const totalMatch = bodyText.match(/Tổng số:\s*[\d.,]+/);
        return {
            formPresent: Boolean(document.querySelector(formSelector)),
            ajaxCellCount: document.querySelectorAll('table tr td.ajax_cell').length,
            tableRowCount: document.querySelectorAll('table tr').length,
            totalText: totalMatch ? totalMatch[0] : null,
        };
    }, detailFormSelector), null);
    return { url: await url, title, ...(facts || { formPresent: null, ajaxCellCount: null, tableRowCount: null, totalText: null }) };
}

async function captureDetailTimeoutEvidence(page, {
    source = '',
    clickedAtMs = null,
    clicks = 1,
    detailFormSelector = '',
    dir = DEFAULT_DIR,
    now = () => Date.now(),
    logger = console,
} = {}) {
    const summary = {
        source,
        msSinceFirstClick: Number.isFinite(clickedAtMs) ? now() - clickedAtMs : null,
        clicks,
        loopDelayMaxMs: readLoopDelayMs(),
    };
    try {
        Object.assign(summary, await describePage(page, detailFormSelector));
        fs.mkdirSync(dir, { recursive: true });
        const base = `${EVIDENCE_PREFIX}${new Date(now()).toISOString().replace(/[:.]/g, '-')}-${source || 'src'}`;
        const png = await safe(() => page.screenshot({ type: 'png', timeout: 5000 }), null);
        if (png) { fs.writeFileSync(path.join(dir, `${base}.png`), png); summary.screenshot = `${base}.png`; }
        const html = await safe(() => page.content(), null);
        if (html) { fs.writeFileSync(path.join(dir, `${base}.html`), html); summary.html = `${base}.html`; }
        pruneEvidence(dir);
    } catch (error) {
        summary.captureError = error.message;
    }
    logger.warn?.(`[F13-DETAIL-TIMEOUT] ${JSON.stringify(summary)}`);
    return summary;
}

function logDetailTableOk({ source = '', clickToFormMs, clicks = 1, logger = console }) {
    logger.log?.(`[F13-DETAIL] ${source} detail table opened click_to_form_ms=${clickToFormMs} clicks=${clicks} loop_delay_max_ms=${readLoopDelayMs()}`);
}

module.exports = {
    MAX_EVIDENCE_FILES,
    EVIDENCE_PREFIX,
    captureDetailTimeoutEvidence,
    logDetailTableOk,
    resetLoopDelay,
    readLoopDelayMs,
    pruneEvidence,
};
