'use strict';

// OPS-JOURNAL-01 (A4): GET /spots/:id/export?format=docx|pdf -- one PL06 per FINALIZED spot (PO 2026-10-30). Manager only
// (the route gates it). The Word file is written directly; the PDF is the print view printed by Chromium (Playwright).
// One PDF render at a time: a render starts a browser process, and the machine also runs the portal downloads.
const { getSpot } = require('./visibility');
const { withImportWriteLock } = require('../importWriteLock');
const { JournalError, actorOf } = require('./journalService');
const { buildPl06 } = require('./pl06Document');
const { buildDocx } = require('./pl06Docx');
const { buildHtml, pdfChrome } = require('./pl06Html');

const FORMATS = Object.freeze({
    docx: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' },
    pdf: { contentType: 'application/pdf', extension: 'pdf' },
});
const PDF_TIMEOUT_MS = 60000;

let pdfQueue = Promise.resolve();

async function renderPdf(model) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true, timeout: PDF_TIMEOUT_MS });
    try {
        // the page is our own generated HTML: no script and no network are needed, so neither is allowed
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();
        await page.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));
        await page.setContent(buildHtml(model), { waitUntil: 'load', timeout: PDF_TIMEOUT_MS });
        return await page.pdf({
            format: 'A4', printBackground: true, displayHeaderFooter: true, ...pdfChrome(model),
            margin: { top: '16mm', bottom: '16mm', left: '0', right: '0' }, timeout: PDF_TIMEOUT_MS,
        });
    } finally {
        await browser.close().catch(() => {});
    }
}

function renderPdfQueued(model) {
    const job = pdfQueue.then(() => renderPdf(model));
    pdfQueue = job.then(() => undefined, () => undefined);
    return job;
}

async function exportSpot(db, { spotId, format, user }) {
    const kind = FORMATS[String(format || '').toLowerCase()];
    if (!kind) throw new JournalError('BAD_FORMAT', 'Định dạng xuất phải là docx hoặc pdf.');
    const spot = await getSpot(db, { access: { capabilities: ['journal.manage'] } }, spotId);
    if (spot.status === 'DRAFT') throw new JournalError('NOT_FINALIZED', 'Chỉ xuất được nhật ký của điểm đen đã chốt.', 409);

    const model = buildPl06(spot); // the recorder is fixed (Mai Văn Mười, GĐ TTVH), not the account that pressed chốt

    const buffer = kind.extension === 'docx' ? await buildDocx(model) : await renderPdfQueued(model);
    const actor = actorOf(user);
    // on the shared connection a bare write could join someone else's open transaction: take the lock every other write takes
    await withImportWriteLock(() => db.run(
        `INSERT INTO ops_journal_action_log (spot_id, kind, after_json, actor_id, actor_name, actor_position, created_at) VALUES (?, 'EXPORTED', ?, ?, ?, ?, ?)`,
        [spot.id, JSON.stringify({ format: kind.extension, bytes: buffer.length }), actor.id, actor.name, actor.position, Date.now()]));
    return { buffer, contentType: kind.contentType, filename: `${model.fileBase}.${kind.extension}` };
}

module.exports = { exportSpot, FORMATS };
