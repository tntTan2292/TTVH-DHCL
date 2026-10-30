'use strict';

// OPS-JOURNAL-01 (round 2): evidence files on a report (PO 2026-10-30: "báo cáo phải cho đính kèm file minh chứng", e.g. Excel
// data, scanned minutes). Rules:
//  - only a person named on the row, on a FINALIZED spot, attaches or removes (the uploader, until the manager accepts the row);
//  - only the manager and the people named on the row download (everyone else gets the usual 404);
//  - the type is checked by extension AND by the first bytes (an .xlsx must be a zip, a .pdf must start with %PDF ...), the stored
//    name is random (the original name never touches the disk path), the file is served as an attachment with nosniff;
//  - 15 MB per file, 10 files per row; the bytes live under the journal storage folder, never in the database.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const journal = require('./journalService');
const { NotFoundError } = require('./visibility');

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PER_ROW = 10;
const ROOT = process.env.QIS_OPS_JOURNAL_FILES
    ? path.resolve(process.env.QIS_OPS_JOURNAL_FILES)
    : (process.env.NODE_ENV === 'test' ? path.join(os.tmpdir(), 'qis-ops-journal-files-test') : path.resolve(__dirname, '../../../storage/ops-journal'));

const ZIP = (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const OLE = (b) => b.length > 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
const TYPES = Object.freeze({
    '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ok: ZIP },
    '.xls': { mime: 'application/vnd.ms-excel', ok: OLE },
    '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ok: ZIP },
    '.doc': { mime: 'application/msword', ok: OLE },
    '.pdf': { mime: 'application/pdf', ok: (b) => b.slice(0, 5).toString('latin1') === '%PDF-' },
    '.png': { mime: 'image/png', ok: (b) => b.length > 8 && b[0] === 0x89 && b.slice(1, 4).toString('latin1') === 'PNG' },
    '.jpg': { mime: 'image/jpeg', ok: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    '.jpeg': { mime: 'image/jpeg', ok: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    '.csv': { mime: 'text/csv; charset=utf-8', ok: (b) => !b.slice(0, 4096).includes(0) },
});
const ACCEPT = Object.freeze(Object.keys(TYPES));

/** The file name as the person saw it: multer decodes it as latin1, the browser sent UTF-8. No path, no control characters. */
function cleanName(raw) {
    let name = String(raw || '');
    const utf8 = Buffer.from(name, 'latin1').toString('utf8');
    if (!utf8.includes('�')) name = utf8;
    name = path.basename(name.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').trim();
    return name.slice(-120) || 'tep-dinh-kem';
}

function validate(file) {
    if (!file || !file.buffer || !file.buffer.length) throw new journal.JournalError('NO_FILE', 'Chưa chọn tệp đính kèm.');
    if (file.buffer.length > MAX_BYTES) throw new journal.JournalError('FILE_TOO_BIG', `Tệp quá lớn (tối đa ${MAX_BYTES / 1024 / 1024} MB).`, 413);
    const name = cleanName(file.originalname);
    const ext = path.extname(name).toLowerCase();
    const type = TYPES[ext];
    if (!type || !type.ok(file.buffer)) {
        throw new journal.JournalError('BAD_FILE_TYPE', `Chỉ nhận tệp ${ACCEPT.join(', ')} đúng định dạng.`, 415);
    }
    return { name, ext, mime: type.mime };
}

// the same rule as reporting: named on the row, row assigned, spot finalized
const eligibleSql = `SELECT a.* FROM ops_journal_action a
       JOIN ops_journal_action_assignee x ON x.action_id = a.id AND x.user_id = ?
       JOIN ops_journal_spot s ON s.id = a.spot_id
      WHERE a.id = ? AND a.assigned_at IS NOT NULL AND s.status = 'FINALIZED'`;

/** Cheap pre-check (before the upload body is read): may this user attach to this row? */
async function canAttach(db, { actionId, userId }) {
    if (userId == null) return false;
    const id = Number(actionId);
    if (!Number.isInteger(id) || id <= 0) return false;
    return Boolean(await db.get(eligibleSql, [userId, id]));
}

async function addAttachment(db, { actionId, file, actor }) {
    const id = Number(actionId);
    if (actor.id == null || !(await canAttach(db, { actionId: id, userId: actor.id }))) throw new NotFoundError();
    const { name, ext, mime } = validate(file);
    return journal.inTransaction(db, async () => {
        const row = await db.get(eligibleSql, [actor.id, id]);
        if (!row) throw new NotFoundError();
        if (row.status === 'DONE') throw new journal.JournalError('LOCKED', 'Dòng này đã được xác nhận hoàn thành.', 409);
        const count = await db.get('SELECT COUNT(*) AS n FROM ops_journal_attachment WHERE action_id = ?', [id]);
        if (count.n >= MAX_PER_ROW) throw new journal.JournalError('TOO_MANY_FILES', `Mỗi dòng chỉ đính kèm tối đa ${MAX_PER_ROW} tệp.`, 409);
        const stored = `${crypto.randomUUID()}${ext}`;
        const dir = path.join(ROOT, String(row.spot_id));
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(path.join(dir, stored), file.buffer);
        try {
            const at = Date.now();
            const result = await db.run(
                'INSERT INTO ops_journal_attachment (action_id, spot_id, file_name, stored_name, mime, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, row.spot_id, name, stored, mime, file.buffer.length, actor.id, at]);
            await journal.logChange(db, { spotId: row.spot_id, actionId: id, kind: 'ATTACHMENT_ADDED', after: { name, size: file.buffer.length }, actor });
            return { id: result.lastID, name, size: file.buffer.length, uploadedAt: at };
        } catch (error) {
            await fs.promises.unlink(path.join(dir, stored)).catch(() => {});
            throw error;
        }
    });
}

/** Who may read an attachment: the manager, or a person named on its row (spot finalized or closed). Else NOT_FOUND. */
async function readAttachment(db, { attachmentId, userId, isManager }) {
    const id = Number(attachmentId);
    if (!Number.isInteger(id) || id <= 0) throw new NotFoundError();
    const file = await db.get('SELECT * FROM ops_journal_attachment WHERE id = ?', [id]);
    if (!file) throw new NotFoundError();
    if (!isManager) {
        const named = userId == null ? null : await db.get(
            `SELECT 1 AS x FROM ops_journal_action_assignee x JOIN ops_journal_action a ON a.id = x.action_id
               JOIN ops_journal_spot s ON s.id = a.spot_id
              WHERE x.action_id = ? AND x.user_id = ? AND a.assigned_at IS NOT NULL AND s.status IN ('FINALIZED', 'CLOSED')`, [file.action_id, userId]);
        if (!named) throw new NotFoundError();
    }
    const full = path.join(ROOT, String(file.spot_id), file.stored_name);
    if (!full.startsWith(ROOT + path.sep) || !fs.existsSync(full)) throw new NotFoundError();
    return { path: full, name: file.file_name, mime: file.mime || 'application/octet-stream', size: file.size };
}

/** DELETE: the uploader takes the file back, until the manager accepted the row. */
async function removeAttachment(db, { attachmentId, actor }) {
    const id = Number(attachmentId);
    if (actor.id == null || !Number.isInteger(id) || id <= 0) throw new NotFoundError();
    const gone = await journal.inTransaction(db, async () => {
        const file = await db.get('SELECT f.*, a.status AS row_status, s.status AS spot_status FROM ops_journal_attachment f JOIN ops_journal_action a ON a.id = f.action_id JOIN ops_journal_spot s ON s.id = f.spot_id WHERE f.id = ?', [id]);
        if (!file || file.uploaded_by !== actor.id) throw new NotFoundError();
        if (file.spot_status !== 'FINALIZED' || file.row_status === 'DONE') throw new journal.JournalError('LOCKED', 'Không gỡ được tệp của dòng đã hoàn thành hoặc đã đóng.', 409);
        await db.run('DELETE FROM ops_journal_attachment WHERE id = ?', [id]);
        await journal.logChange(db, { spotId: file.spot_id, actionId: file.action_id, kind: 'ATTACHMENT_REMOVED', before: { name: file.file_name }, actor });
        return file;
    });
    await fs.promises.unlink(path.join(ROOT, String(gone.spot_id), gone.stored_name)).catch(() => {});
    return { id };
}

module.exports = { addAttachment, canAttach, readAttachment, removeAttachment, cleanName, validate, ACCEPT, MAX_BYTES, MAX_PER_ROW, ROOT };
