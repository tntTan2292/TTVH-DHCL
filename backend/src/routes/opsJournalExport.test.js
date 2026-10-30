// OPS-JOURNAL-01 (A4): the PL06 export. The Word file is opened again and checked against the spot; the PDF is a real
// Chromium print; only the manager may download, and only after the spot is finalized.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const JSZip = require('jszip');
const { SaxesParser } = require('saxes');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qis-ops-export-'));
const dbFile = path.join(tmpDir, 'export.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = dbFile;

const { db, run, get, all } = require('../config/db');
const { applyOpsJournal01Schema } = require('../../migrate_ops_journal_01_schema');
const { applyRbac01Schema } = require('../../migrate_rbac_01_schema');
const authSessionStore = require('../services/auth/AuthSessionStore');
const { resolveAccess } = require('../services/auth/access/resolveAccess');
const createOpsJournalRouter = require('./opsJournalRoutes');
const { buildPl06, fileBaseName, shiftOf } = require('../services/opsJournal/pl06Document');
const { buildDocx } = require('../services/opsJournal/pl06Docx');
const { buildHtml } = require('../services/opsJournal/pl06Html');

const DAY = '2026-10-23';
const NASTY = 'Tuyến <A> & "B" \u0001 xuống dòng\nthứ hai';
let server;
let baseUrl;
const ids = {};

test.before(async () => {
    await applyRbac01Schema(dbFile);
    await applyOpsJournal01Schema(dbFile);
    await run("INSERT INTO qis_user (id, username, display_name, tier, position, password_hash, must_change_password, is_active, created_at, updated_at) VALUES (301, 'muoi', 'Mai Văn Mười', 'LEADER', 'GD_TTVH', 'x', 0, 1, 1, 1)");
    const finalizedAt = Date.parse('2026-10-23T08:10:00+07:00');
    const spot = async (title, status, closing) => {
        const result = await run(
            `INSERT INTO ops_journal_spot (day, indicator, scope_type, scope_key, office_code, title, headline, metrics_json, source, status, finalized_at, finalized_by, detected_at, channel, sort, created_at)
             VALUES (?, 'F4.1', 'BCVH', '537220', '537220', ?, ?, '{}', 'SYSTEM', ?, ?, ?, '07:30', 'Dashboard', 1, 1)`,
            [DAY, title, 'Chỉ tiêu F4.1 của BCVH Phú Lộc ngày 22/10 đạt 27,7% (534 BG).', status, status === 'DRAFT' ? null : finalizedAt, status === 'DRAFT' ? null : 301]);
        if (closing) await run('INSERT INTO ops_journal_closing (spot_id, resolved, recovered, handling_time_text, lesson, process_update, done_time, updated_at) VALUES (?, 0, 0, ?, ?, ?, ?, 1)', [result.lastID, '2 giờ', 'Rà soát sớm', '', '17:00']);
        return result.lastID;
    };
    ids.final = await spot('F4.1 - BCVH Phú Lộc', 'FINALIZED', true);
    ids.draft = await spot('F4.1 - nháp', 'DRAFT', false);
    ids.closed = await spot('F4.1 - đã đóng', 'CLOSED', true);
    await run("INSERT INTO ops_journal_action (spot_id, seq, who_text, what, where_text, due, how, expected_result, assigned_at, status) VALUES (?, 1, 'Giám đốc BCVH Phú Lộc', ?, 'BCVH Phú Lộc', 'Trong ngày 23/10', 'Rà soát', 'Rõ nguyên nhân', 1, 'ASSIGNED')", [ids.final, NASTY]);
    await run("INSERT INTO ops_journal_action (spot_id, seq, who_text, what, assigned_at, status) VALUES (?, 2, 'Chuyên quản', 'Theo dõi hằng ngày', 1, 'ASSIGNED')", [ids.final]);

    const app = express();
    app.use(express.json());
    app.use('/api/ops-journal', createOpsJournalRouter({ db: require('../config/db'), adapters: {} }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/ops-journal`;
});

test.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

const session = (id, name, spec) => authSessionStore.createSession({ id, username: name, display_name: name, role: 'viewer', must_change_password: false, access: resolveAccess(spec) });
const GD = session(301, 'muoi', { tier: 'LEADER', position: 'GD_TTVH' });
const OTHER = session(302, 'ld', { tier: 'LEADER', position: 'LD_TTVH' });
const ASSIGNEE = session(401, 'gd-bcvh', { tier: 'STAFF', position: 'GD_BCVH', bcvh: ['537220'] });

async function download(sessionId, url) {
    const response = await fetch(`${baseUrl}${url}`, { headers: { 'x-session-id': sessionId } });
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, buffer, text: buffer.toString('utf8') };
}

function assertWellFormed(xml, name) {
    const parser = new SaxesParser();
    let failure = null;
    parser.on('error', (error) => { failure = error; });
    parser.write(xml).close();
    assert.equal(failure, null, `${name} is not well-formed XML: ${failure && failure.message}`);
}

const manager = (extra = {}) => ({
    id: 1, day: DAY, indicator: 'F4.1', officeName: 'BCVH Phú Lộc', title: 'F4.1 - BCVH Phú Lộc', status: 'FINALIZED', finalizedAt: Date.parse('2026-10-23T08:10:00+07:00'),
    detectedAt: '07:30', channel: 'Dashboard', headline: 'Nhận định', actions: [], closing: null, ...extra,
});

test('model: file name, shift, check boxes follow the closing, nothing is ticked when there is no closing yet', () => {
    assert.equal(fileBaseName(manager()), 'PL06 - Nhat ky dieu hanh 23.10.2026 - F4.1 BCVH Phu Loc');
    assert.equal(fileBaseName(manager({ indicator: 'HANGTON', officeName: 'BCVH Hương Thủy' })), 'PL06 - Nhat ky dieu hanh 23.10.2026 - Hang ton BCVH Huong Thuy');
    assert.equal(fileBaseName(manager({ officeName: null, title: 'F1.1 - Khách hàng lớn → BCVH A/B' })), 'PL06 - Nhat ky dieu hanh 23.10.2026 - F4.1 Khach hang lon → BCVH A B');
    assert.deepEqual([8, 13, 22].map((h) => shiftOf(Date.parse(`2026-10-23T${String(h).padStart(2, '0')}:00:00+07:00`))), [0, 1, 2]);
    const text = (model) => JSON.stringify([model.info, model.sections.map((s) => s.blocks.map((b) => b.text))]);
    const open = text(buildPl06(manager(), { name: 'M', positionCode: 'GD_TTVH' }));
    assert.ok(open.includes('Sự cố đã giải quyết?  ☐ Rồi   ☐ Chưa') && open.includes('Quy trình nào cần cập nhật?  ☐ Không   ☐ Có'));
    assert.ok(open.includes('Ca: ☒ Sáng   ☐ Chiều   ☐ Đêm'));
    const done = text(buildPl06(manager({ closing: { resolved: false, recovered: true, handlingTimeText: 'x', lesson: 'l', processUpdate: 'Cập nhật quy trình A', doneTime: '17:00' } }), { name: 'M', positionCode: 'GD_TTVH' }));
    assert.ok(done.includes('☐ Rồi   ☒ Chưa') && done.includes('Đã phục hồi bình thường?  ☒ Rồi   ☐ Chưa, đang theo dõi'));
    assert.ok(done.includes('☐ Không   ☒ Có: Cập nhật quy trình A'));
});

test('Word file: opens, is well-formed, carries every row with the PL06 headings, and escapes hostile text', async () => {
    const spot = (await get('SELECT * FROM ops_journal_spot WHERE id = ?', [ids.final]));
    assert.ok(spot);
    const model = buildPl06(manager({
        actions: [{ whoText: 'Giám đốc BCVH Phú Lộc', what: NASTY, where: 'BCVH', due: 'Trong ngày', how: 'Rà soát', expectedResult: 'Rõ' }, { whoText: 'CQ', what: 'Theo dõi', where: '', due: '', how: '', expectedResult: '' }],
        closing: { resolved: false, recovered: false, handlingTimeText: '2 giờ', lesson: 'Rà soát sớm', processUpdate: '', doneTime: '17:00' },
    }), { name: 'Mai Văn Mười', positionCode: 'GD_TTVH' });
    const buffer = await buildDocx(model);
    const zip = await JSZip.loadAsync(buffer);
    for (const name of Object.keys(zip.files).filter((n) => !n.endsWith('/'))) assertWellFormed(await zip.file(name).async('string'), name);
    const xml = await zip.file('word/document.xml').async('string');
    const plain = xml.replace(/<w:br\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    for (const wanted of ['NHẬT KÝ ĐIỀU HÀNH HÀNG NGÀY', 'Ngày: 23/10/2026', 'Người ghi nhận: Mai Văn Mười (PGĐ BĐTP, GĐ TTVH)', '1.  ĐIỂM NGHẼN HÔM NAY', '2.  QUYẾT ĐỊNH XỬ LÝ — NGUYÊN TẮC 6 RÕ',
        '3.  KẾT QUẢ THỰC TẾ CUỐI NGÀY', '4.  BÀI HỌC RÚT RA', 'KHI NÀO XONG', '(rõ kết quả cần đạt)', 'Giờ hoàn thành nhật ký: 17h00', '07h30', '☒ Dashboard']) {
        assert.ok(plain.includes(wanted), `missing: ${wanted}`);
    }
    assert.ok(plain.includes('Tuyến <A> & "B"  xuống dòng\nthứ hai'.replace('  ', ' ')) || plain.includes('Tuyến <A> & "B" '), 'hostile text survives as text');
    assert.ok(!xml.includes('\u0001'), 'control characters are dropped');
    assert.equal((xml.match(/<w:tr>/g) || []).length, 15, 'info 1 + 4 headings + section 1 (2) + 6 rõ (header + 2) + section 3 (1) + section 4 (3) + signature (1)');
    assert.match(await zip.file('word/footer1.xml').async('string'), /PAGE[\s\S]*NUMPAGES/);
    assert.match(await zip.file('word/header1.xml').async('string'), /NHẬT KÝ ĐIỀU HÀNH HÀNG NGÀY/);
    // the print view for the PDF draws the same model
    const html = buildHtml(model);
    assert.ok(html.includes('Tuyến &lt;A&gt; &amp; &quot;B&quot;') && !html.includes('<A>'));
    assert.ok(html.includes('Giờ hoàn thành nhật ký: 17h00'));
});

test('download: manager only, finalized spots only, right type and headers, every export is logged', async () => {
    for (const id of [ids.final, ids.draft, 999999]) {
        const other = await download(OTHER, `/spots/${id}/export?format=docx`);
        const assignee = await download(ASSIGNEE, `/spots/${id}/export?format=pdf`);
        const unknown = await download(OTHER, '/whatever');
        assert.equal(other.status, 404);
        assert.equal(other.text, unknown.text);
        assert.equal(assignee.text, unknown.text);
    }
    const draft = await download(GD, `/spots/${ids.draft}/export?format=docx`);
    assert.equal(draft.status, 409);
    assert.equal(JSON.parse(draft.text).error.code, 'NOT_FINALIZED');
    assert.equal(JSON.parse((await download(GD, `/spots/${ids.final}/export?format=exe`)).text).error.code, 'BAD_FORMAT');
    assert.equal(JSON.parse((await download(GD, `/spots/${ids.final}/export`)).text).error.code, 'BAD_FORMAT');
    assert.equal((await download(GD, '/spots/999999/export?format=docx')).status, 404);

    const docx = await download(GD, `/spots/${ids.final}/export?format=docx`);
    assert.equal(docx.status, 200);
    assert.equal(docx.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.equal(docx.headers.get('cache-control'), 'no-store');
    assert.equal(docx.headers.get('etag'), null);
    assert.match(docx.headers.get('content-disposition'), /^attachment; filename="PL06 - Nhat ky dieu hanh 23\.10\.2026 - F4\.1 BCVH Phu Loc\.docx"; filename\*=UTF-8''/);
    const zip = await JSZip.loadAsync(docx.buffer);
    const xml = await zip.file('word/document.xml').async('string');
    const text = xml.replace(/<[^>]+>/g, '');
    assert.ok(text.includes('Theo dõi hằng ngày') && text.includes('Người ghi nhận: Mai Văn Mười (PGĐ BĐTP, GĐ TTVH)'), 'the finalizer signs, not whoever downloads');
    assert.ok(xml.includes('☐ Rồi   ☒ Chưa'), 'the saved closing is printed');
    const closed = await download(GD, `/spots/${ids.closed}/export?format=docx`);
    assert.equal(closed.status, 200, 'a closed spot can still be printed');
    const log = await all("SELECT actor_id, after_json FROM ops_journal_action_log WHERE kind = 'EXPORTED' ORDER BY id");
    assert.deepEqual(log.map((r) => r.actor_id), [301, 301]);
    assert.equal(JSON.parse(log[0].after_json).format, 'docx');
});

test('PDF: a real Chromium print of the same spot; two at once both succeed', async () => {
    const [a, b] = await Promise.all([download(GD, `/spots/${ids.final}/export?format=pdf`), download(GD, `/spots/${ids.closed}/export?format=pdf`)]);
    for (const answer of [a, b]) {
        assert.equal(answer.status, 200, answer.text.slice(0, 200));
        assert.equal(answer.headers.get('content-type'), 'application/pdf');
        assert.equal(answer.buffer.subarray(0, 5).toString(), '%PDF-');
        assert.ok(answer.buffer.length > 10000, 'a page with text and fonts');
        assert.ok(answer.buffer.subarray(-1024).toString('latin1').includes('%%EOF'));
    }
    assert.match(a.headers.get('content-disposition'), /\.pdf"/);
});
