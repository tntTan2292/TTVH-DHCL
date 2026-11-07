'use strict';

// F13-RULE-PROPOSAL-01 B1: Chuyên quản corrections grouped as rule proposals, decided by the PO.
//  - A proposal = the latest analysis (MAX(id) per parcel) of f13_analysis_log whose choice differs from the system conclusion RECORDED WITH IT,
//    grouped by (system status, system cause or reason, system Phát detail) -> (chosen cause, chosen Phát detail). f13_analysis_log is read only.
//  - Decisions are appended to f13_rule_proposal_decision (APPROVE / REJECT / APPLIED); the latest row of a key is the current decision.
//  - Nothing here changes a figure: an approved proposal only waits for the CTO to turn it into a rule ticket (P4).

const SAMPLE_LIMIT = 20;
const NOTE_MAX = 1000;
const STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED', 'APPLIED']);
const STATUS_OF_DECISION = Object.freeze({ APPROVE: 'APPROVED', REJECT: 'REJECTED', APPLIED: 'APPLIED' });
const STATUS_LABEL = Object.freeze({ PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt - chờ chuyển thành quy tắc', REJECTED: 'Không duyệt', APPLIED: 'Đã áp dụng' });
const EMPTY = '~';

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function wrapDb(db) {
    if (typeof db.serialize === 'function') {
        return {
            all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)))),
            get: (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)))),
            run: (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function onRun(error) { return error ? reject(error) : resolve(this); })),
        };
    }
    return db;
}

const part = (value) => (value === null || value === undefined || value === '' ? EMPTY : String(value));
const unpart = (value) => (value === EMPTY ? null : value);

/** The stable key of a grouping: status|cause-or-reason|detail>chosen|phat_detail (the system side takes the cause when there is one, else the reason). */
function buildKey({ status, code, reason, detail, cause, phat }) {
    return `${part(status)}|${part(status === 'CAUSE' ? code : reason)}|${part(detail)}>${part(cause)}|${part(phat)}`;
}

function parseKey(key) {
    const match = /^([^|>]*)\|([^|>]*)\|([^|>]*)>([^|>]*)\|([^|>]*)$/.exec(String(key || ''));
    if (!match) return null;
    const [, status, what, detail, cause, phat] = match;
    return { status: unpart(status), what: unpart(what), detail: unpart(detail), cause: unpart(cause), phat: unpart(phat) };
}

// Latest analysis of each parcel + the parcel's conclusion in the cause table now (LEFT JOIN: the cause table is rebuildable).
// A choice equal to the system line recorded with it is not a proposal.
const LATEST = `SELECT a.*, p.cause_status AS now_status, p.cause_code AS now_code, p.cause_detail AS now_detail, p.cause_reason AS now_reason
    FROM f13_analysis_log a
    LEFT JOIN f13_cause_parcel p ON p.ngay_do_kiem = a.ngay_do_kiem AND p.ma_bg = a.ma_bg
    WHERE a.id = (SELECT MAX(x.id) FROM f13_analysis_log x WHERE x.ngay_do_kiem = a.ngay_do_kiem AND x.ma_bg = a.ma_bg)
      AND a.cause_code IS NOT COALESCE(a.system_line, '')`;

function rowKey(row) {
    return buildKey({ status: row.system_cause_status, code: row.system_cause_code, reason: row.system_cause_reason, detail: row.system_cause_detail, cause: row.cause_code, phat: row.phat_detail });
}

function stillSame(row) {
    return row.now_status === row.system_cause_status && (row.now_code ?? null) === (row.system_cause_code ?? null)
        && (row.now_detail ?? null) === (row.system_cause_detail ?? null) && (row.now_reason ?? null) === (row.system_cause_reason ?? null);
}

class RuleProposalService {
    constructor({ db, writeDb = null, now = () => new Date() } = {}) {
        if (!db) throw new Error('RuleProposalService needs db');
        this.db = wrapDb(db);
        this.writeDb = wrapDb(writeDb || db);
        this.now = now;
    }

    async _groups() {
        const rows = await this.db.all(`${LATEST} ORDER BY a.ngay_do_kiem, a.ma_bg`);
        const groups = new Map();
        for (const row of rows) {
            const key = rowKey(row);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(row);
        }
        return groups;
    }

    async _decisions() {
        const rows = await this.db.all('SELECT * FROM f13_rule_proposal_decision ORDER BY id');
        const byKey = new Map();
        for (const row of rows) {
            if (!byKey.has(row.proposal_key)) byKey.set(row.proposal_key, []);
            byKey.get(row.proposal_key).push(row);
        }
        return byKey;
    }

    _summary(key, rows, history) {
        const parsed = parseKey(key);
        const days = rows.map((row) => row.ngay_do_kiem).sort();
        const decisions = history || [];
        const current = decisions.length ? decisions[decisions.length - 1] : null;
        const status = current ? STATUS_OF_DECISION[current.decision] : 'PENDING';
        return {
            key,
            system: { status: parsed.status, cause_or_reason: parsed.what, detail: parsed.detail },
            chosen: { cause: parsed.cause, phat_detail: parsed.phat },
            parcels: rows.length,
            bcvh: new Set(rows.map((row) => row.ma_bcvh)).size,
            analysts: new Set(rows.map((row) => row.actor_name)).size,
            first_date: days[0] ?? null,
            last_date: days[days.length - 1] ?? null,
            still_system_conclusion: rows.filter(stillSame).length,
            status,
            status_label: STATUS_LABEL[status],
            decision: current ? this._decisionOut(current) : null,
        };
    }

    _decisionOut(row) {
        let snapshot = null;
        try { snapshot = row.snapshot_json ? JSON.parse(row.snapshot_json) : null; } catch { snapshot = null; }
        return {
            id: row.id, decision: row.decision, note: row.note ?? null, ticket_id: row.ticket_id ?? null, snapshot,
            by: row.actor_name, at: row.created_at, supersedes_id: row.supersedes_id ?? null,
        };
    }

    /** Proposals with the P2 fields and the current decision; `filter.status` keeps one status. Biggest first. */
    async list(filter = {}) {
        const wanted = filter.status ? String(filter.status).toUpperCase() : null;
        if (wanted && !STATUSES.includes(wanted)) throw fail('INVALID_FILTER', 'status phải là PENDING, APPROVED, REJECTED hoặc APPLIED');
        const [groups, decisions] = await Promise.all([this._groups(), this._decisions()]);
        const all = [...groups].map(([key, rows]) => this._summary(key, rows, decisions.get(key)));
        const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
        for (const item of all) counts[item.status] += 1;
        const items = all.filter((item) => !wanted || item.status === wanted);
        items.sort((a, b) => b.parcels - a.parcels || String(b.last_date).localeCompare(String(a.last_date)) || a.key.localeCompare(b.key));
        return { items, meta: { total: items.length, counts } };
    }

    async detail(key) {
        if (!parseKey(key)) throw fail('INVALID_KEY', 'Khoá đề xuất không hợp lệ');
        const [groups, decisions] = await Promise.all([this._groups(), this._decisions()]);
        const rows = groups.get(key);
        const history = decisions.get(key) || [];
        if (!rows && !history.length) throw fail('PROPOSAL_NOT_FOUND', 'Không tìm thấy đề xuất');
        const summary = this._summary(key, rows || [], history);
        const samples = (rows || []).slice().sort((a, b) => b.id - a.id).slice(0, SAMPLE_LIMIT).map((row) => ({
            ngay_do_kiem: row.ngay_do_kiem, ma_bg: row.ma_bg, ma_bcvh: row.ma_bcvh, note: row.note ?? null, by: row.actor_name, at: row.created_at,
            still_system_conclusion: stillSame(row),
        }));
        const detail = { ...summary, samples, history: history.slice().reverse().map((row) => this._decisionOut(row)), active: Boolean(rows) };
        if (summary.status === 'APPROVED') detail.ready_text = this._readyText(summary, samples);
        return detail;
    }

    /** P4: the text the CTO turns into a rule ticket. */
    _readyText(summary, samples) {
        return [
            `Đề xuất quy tắc ${summary.key}`,
            `Hệ thống kết luận: ${summary.system.status} / ${summary.system.cause_or_reason ?? '-'} / ${summary.system.detail ?? '-'}`,
            `Chuyên quản chọn: ${summary.chosen.cause} / ${summary.chosen.phat_detail ?? '-'}`,
            `Số bưu gửi ${summary.parcels}, số BCVH ${summary.bcvh}, số người phân tích ${summary.analysts}, từ ${summary.first_date} đến ${summary.last_date}`,
            `Ghi chú PO: ${summary.decision?.note ?? ''}`,
            'Mẫu:',
            ...samples.slice(0, 5).map((sample) => `- ${sample.ngay_do_kiem} ${sample.ma_bg} (${sample.ma_bcvh}): ${sample.note ?? ''}`),
        ].join('\n');
    }

    /** Appends a decision. APPROVE / REJECT need a note; APPLIED needs a ticket and an APPROVE as the current decision. */
    async decide(key, input, actor) {
        const decision = String(input?.decision || '').toUpperCase();
        if (!['APPROVE', 'REJECT', 'APPLIED'].includes(decision)) throw fail('INVALID_DECISION', 'decision phải là APPROVE, REJECT hoặc APPLIED');
        const note = String(input?.note ?? '').trim();
        if (note.length > NOTE_MAX) throw fail('NOTE_TOO_LONG', `Ghi chú tối đa ${NOTE_MAX} ký tự`);
        if (decision !== 'APPLIED' && !note) throw fail('NOTE_REQUIRED', 'Duyệt hoặc không duyệt thì phải ghi chú');
        const ticket = String(input?.ticket_id ?? '').trim();
        if (decision === 'APPLIED' && !ticket) throw fail('TICKET_REQUIRED', 'Đánh dấu đã áp dụng thì phải có mã phiếu');
        if (!actor?.name) throw fail('NO_ACTOR', 'Không xác định được người quyết định');
        const detail = await this.detail(key); // INVALID_KEY / PROPOSAL_NOT_FOUND
        if (!detail.active) throw fail('PROPOSAL_NOT_FOUND', 'Đề xuất không còn nhóm bưu gửi nào');
        if (decision === 'APPLIED' && detail.status !== 'APPROVED') throw fail('NOT_APPROVED', 'Chỉ đánh dấu đã áp dụng cho đề xuất đang ở trạng thái đã duyệt');
        const snapshot = {
            parcels: detail.parcels, bcvh: detail.bcvh, analysts: detail.analysts, first_date: detail.first_date, last_date: detail.last_date,
            still_system_conclusion: detail.still_system_conclusion,
        };
        const inserted = await this.writeDb.run(
            `INSERT INTO f13_rule_proposal_decision (proposal_key, decision, note, ticket_id, snapshot_json, actor_id, actor_name, created_at, supersedes_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [key, decision, note || null, decision === 'APPLIED' ? ticket : null, JSON.stringify(snapshot), actor.id ?? null, actor.name, this.now().toISOString(), detail.decision?.id ?? null],
        );
        return { id: inserted.lastID, superseded: detail.decision?.id ?? null, proposal: await this.detail(key) };
    }
}

module.exports = { RuleProposalService, buildKey, parseKey, STATUSES, SAMPLE_LIMIT, NOTE_MAX };
