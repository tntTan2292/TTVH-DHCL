'use strict';

// F13-EVIDENCE-01 B1: the evidence behind every figure of "Phân tích nguyên nhân" and the analyses the Chuyên quản / Giám đốc BCVH record.
//  - list / export: every F1.3 row of a filter (Đạt included) from f13_cause_parcel (same filter code as /why: one WHERE builder), with the five
//    milestones taken from JourneyService._parcels (one implementation, never a second copy of the picking rules), TCT hours, limit, the
//    system's cause / reason, flags, hints and the current analysis.
//  - record: appends a row to f13_analysis_log (append-only: triggers refuse UPDATE and DELETE). The system's own figures are never touched (PO V2).
// Analysed counts for /why/* are in CauseAggQueryService (they join the same log).

const ExcelJS = require('exceljs');
const { resolvePeriod, lineOf, labelOfLine } = require('./CauseAggQueryService');
const { computeClassifierVersion } = require('./CauseAggBuilder');
const { CAUSE_CODES } = require('../../../migrate_f13_evidence_01_schema');

const FAILED = 'Không đạt';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_DAYS = 12; // distinct measurement days a page may need milestones for (each day is one JourneyService read)
const EXPORT_MAX_DAYS = 31;
const EXPORT_MAX_ROWS = 150000;
const NOTE_MAX = 1000;
const DAY_CACHE_TTL_MS = 5 * 60 * 1000;
const DAY_CACHE_MAX = 8;

// The causes an analyst may choose (PO V4). `phat_detail` is stored for the two Phát choices.
const ANALYST_CAUSES = Object.freeze([
    { code: 'KHONG_TRON_LO', label: 'Không trọn lô', phat_detail: null },
    { code: 'KHAI_THAC', label: 'Khai thác', phat_detail: null },
    { code: 'VAN_CHUYEN', label: 'Vận chuyển', phat_detail: null },
    { code: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', label: 'Khai thác - Vận chuyển chưa phân biệt', phat_detail: null },
    { code: 'GIAO_BUU_TA_QUA_GIO', label: 'Phát - Chậm giao bưu tá', phat_detail: 'CHAM_GIAO_BUU_TA' },
    { code: 'PHAT_MUON', label: 'Phát - Phát chậm sau khi giao', phat_detail: 'PHAT_CHAM_SAU_GIAO' },
    { code: 'KHAC', label: 'Khác', phat_detail: null },
]);
const CAUSE_BY_CODE = new Map(ANALYST_CAUSES.map((cause) => [cause.code, cause]));

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

const sameList = ANALYST_CAUSES.map((cause) => cause.code).join() === CAUSE_CODES.join();
if (!sameList) throw new Error('EvidenceService causes and the table CHECK list differ');

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

/** The latest analysis of each parcel, joined to the cause table (a LEFT JOIN: parcels without an analysis keep a_id NULL). */
const WITH_ANALYSIS = `(SELECT p.*, a.id AS a_id, a.cause_code AS a_cause, a.phat_detail AS a_phat_detail, a.note AS a_note, a.actor_name AS a_actor,
        a.actor_position AS a_position, a.created_at AS a_at, a.system_line AS a_system_line
    FROM f13_cause_parcel p
    LEFT JOIN f13_analysis_log a ON a.id = (SELECT MAX(x.id) FROM f13_analysis_log x WHERE x.ngay_do_kiem = p.ngay_do_kiem AND x.ma_bg = p.ma_bg)) ev`;

function systemOf(row) {
    const line = row.cause_status === 'CAUSE' && row.cause_code ? lineOf(row.cause_code, row.cause_detail) : null;
    return {
        status: row.cause_status,
        code: row.cause_code,
        detail: row.cause_detail ?? null,
        line,
        label: line ? labelOfLine(line) : null,
        reason: row.cause_reason ?? null,
        step: row.cause_step ?? null,
        basis: row.basis ?? null,
    };
}

function analysisOf(row) {
    if (!row.a_id) return null;
    const system = systemOf(row);
    return {
        id: row.a_id,
        cause: row.a_cause,
        label: CAUSE_BY_CODE.get(row.a_cause)?.label ?? row.a_cause,
        phat_detail: row.a_phat_detail ?? null,
        note: row.a_note ?? null,
        by: row.a_actor,
        position: row.a_position ?? null,
        at: row.a_at,
        // against the system's conclusion NOW (the one at the time is kept in the history row)
        versus_system: system.line === null ? 'NO_SYSTEM_CAUSE' : (system.line === row.a_cause ? 'SAME' : 'DIFFERENT'),
    };
}

const splitList = (text) => (text ? String(text).split(',').filter(Boolean) : []);
const hours = (ms) => (ms === null || ms === undefined ? null : Math.round((ms / 3600000) * 100) / 100);

class EvidenceService {
    /**
     * @param {object} options
     *   db            read connection (shared config/db or a sqlite3 Database)
     *   writeDb       connection for the append (default: db)
     *   causeAgg      CauseAggQueryService (its _where is the one filter of /why and of this list)
     *   journeyService JourneyService (milestones)
     */
    constructor({ db, writeDb = null, causeAgg, journeyService, now = () => new Date(), classifierVersion = null, clock = () => Date.now() } = {}) {
        if (!db || !causeAgg || !journeyService) throw new Error('EvidenceService needs db, causeAgg and journeyService');
        this.db = wrapDb(db);
        this.writeDb = wrapDb(writeDb || db);
        this.causeAgg = causeAgg;
        this.journeyService = journeyService;
        this.now = now;
        this.clock = clock;
        this.classifierVersion = classifierVersion;
        this.dayCache = new Map();
    }

    catalog() {
        return { causes: ANALYST_CAUSES.map((cause) => ({ ...cause })), note_max: NOTE_MAX, export_max_days: EXPORT_MAX_DAYS, export_max_rows: EXPORT_MAX_ROWS, max_page_size: MAX_PAGE_SIZE };
    }

    // ---- filter: the /why filter plus analysed / analyst_cause
    _where(period, scope, filter) {
        const base = this.causeAgg._where(period, scope, filter, { forParcels: true });
        const clauses = [base.sql];
        const params = [...base.params];
        if (filter.analysed !== undefined && filter.analysed !== null && filter.analysed !== '') {
            const value = String(filter.analysed).toLowerCase();
            // like /why, only failed parcels count as analysed (B1-R1); the item of any other parcel still shows its old analysis
            if (['yes', 'true', '1'].includes(value)) clauses.push(`a_id IS NOT NULL AND danh_gia = '${FAILED}'`);
            else if (['no', 'false', '0'].includes(value)) clauses.push(`(a_id IS NULL OR danh_gia IS NOT '${FAILED}')`); // the complement of analysed=yes
            else throw fail('INVALID_FILTER', 'analysed phải là yes hoặc no');
        }
        if (filter.analyst_cause) {
            const cause = String(filter.analyst_cause);
            if (!CAUSE_BY_CODE.has(cause)) throw fail('INVALID_FILTER', 'analyst_cause không hợp lệ');
            clauses.push(`a_cause = ? AND danh_gia = '${FAILED}'`);
            params.push(cause);
        }
        if (filter.search) {
            clauses.push('(ma_bg LIKE ? OR ma_lo LIKE ?)');
            const needle = `%${String(filter.search).trim().replace(/[%_]/g, '')}%`;
            params.push(needle, needle);
        }
        return { sql: clauses.join(' AND '), params };
    }

    /** The total of a filter: the same WHERE as the list, without loading milestones (used by the parity checks). */
    async count(query, scope) {
        const where = this._where(resolvePeriod(query), scope, query);
        return Number((await this.db.get(`SELECT COUNT(*) AS n FROM ${WITH_ANALYSIS} WHERE ${where.sql}`, where.params)).n);
    }

    // ---- milestones: one JourneyService read per measurement day, cached for a few minutes
    async _dayParcels(day) {
        const cached = this.dayCache.get(day);
        if (cached && this.clock() - cached.at < DAY_CACHE_TTL_MS) return cached.map;
        const parcels = await this.journeyService._parcels(day); // city-wide on purpose: the same rows the builder read
        const map = new Map(parcels.map((parcel) => [parcel.ma_bg, parcel]));
        this.dayCache.set(day, { at: this.clock(), map });
        while (this.dayCache.size > DAY_CACHE_MAX) this.dayCache.delete(this.dayCache.keys().next().value);
        return map;
    }

    _item(row, journey, state) {
        const m = journey?.milestones || null;
        const at = (value, source) => ({ at: value ?? null, source: value ? source : null });
        return {
            ngay_do_kiem: row.ngay_do_kiem,
            ma_bg: row.ma_bg,
            ma_bcvh: row.ma_bcvh,
            ma_tuyen: row.ma_tuyen,
            ten_tuyen: journey?.ten_tuyen ?? null,
            route_scope: row.route_scope,
            ma_buu_ta_first: row.ma_buu_ta_first,
            ten_buu_ta_first: row.ten_buu_ta_first,
            ma_buu_ta_shown: row.ma_buu_ta_shown,
            ten_buu_ta_shown: row.ten_buu_ta_shown,
            danh_gia: row.danh_gia,
            tct: { hours_text: journey?.so_gio_tct ?? null, tct_hours: hours(row.tct_ms), limit_hours: hours(row.limit_ms), recomputed_hours: hours(row.r_ms), remaining_at_arrival_hours: hours(row.remaining_at_arrival_ms) },
            milestones_state: state,
            milestones: m ? {
                tms: at(m.tms, 'F1.3'),
                depart: at(m.depart, 'F1.1'),
                arrive: at(m.arrive, m.arrive_source === 'BF' ? 'BatchFile' : 'F4.1'),
                handover_first: at(m.gbt_first, 'F4.2'),
                handover_shown: at(m.gbt, 'F4.2'),
                ptc: at(m.ptc, 'F1.3'),
            } : null,
            legs: journey?.legs ?? null,
            system: systemOf(row),
            flags: splitList(row.flags),
            hints: splitList(row.hints),
            ma_lo: row.ma_lo,
            khong_tron_lo: Boolean(row.khong_tron_lo),
            a_source: row.a_source ?? null,
            analysis: analysisOf(row),
            can_analyse: row.danh_gia === FAILED,
        };
    }

    /** Paged list. Default order: failed parcels waiting for the Chuyên quản and not yet analysed first (PO V3), then the newest day, then the code. */
    async list(query, scope) {
        const period = resolvePeriod(query);
        const where = this._where(period, scope, query);
        const size = Math.min(Math.max(Number(query.page_size ?? query.pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const total = Number((await this.db.get(`SELECT COUNT(*) AS n FROM ${WITH_ANALYSIS} WHERE ${where.sql}`, where.params)).n);
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(Math.max(Number(query.page) || 1, 1), totalPages);
        const dateOnly = String(query.sort || '') === 'date';
        const direction = String(query.order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const priority = dateOnly ? '' : `(CASE WHEN cause_status = 'CHO_CHUYEN_QUAN' AND danh_gia = '${FAILED}' AND a_id IS NULL THEN 0 ELSE 1 END) ASC, `;
        const rows = await this.db.all(
            `SELECT * FROM ${WITH_ANALYSIS} WHERE ${where.sql} ORDER BY ${priority}ngay_do_kiem ${direction}, ma_bg ASC LIMIT ? OFFSET ?`,
            [...where.params, size, (page - 1) * size],
        );
        const days = [...new Set(rows.map((row) => row.ngay_do_kiem))];
        const loadable = new Set(days.slice(0, MAX_PAGE_DAYS));
        const byDay = new Map();
        for (const day of loadable) {
            try { byDay.set(day, await this._dayParcels(day)); } catch { byDay.set(day, null); }
        }
        const items = rows.map((row) => {
            if (!loadable.has(row.ngay_do_kiem)) return this._item(row, null, 'SKIPPED_TOO_MANY_DAYS');
            const map = byDay.get(row.ngay_do_kiem);
            if (!map) return this._item(row, null, 'UNAVAILABLE');
            const journey = map.get(row.ma_bg);
            return this._item(row, journey, journey ? 'OK' : 'NOT_IN_SOURCE');
        });
        const meta = await this.causeAgg._meta(period, scope, query);
        return { items, meta: { ...meta, total, page, page_size: size, total_pages: totalPages, order: dateOnly ? 'DATE' : 'PRIORITY' } };
    }

    // ---- Excel export of the whole filtered set (server side)
    async _exportPlan(query, scope) {
        const period = resolvePeriod(query);
        const days = Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86400000) + 1;
        if (days > EXPORT_MAX_DAYS) throw fail('EXPORT_TOO_LARGE', `Xuất Excel tối đa ${EXPORT_MAX_DAYS} ngày một lần (đang chọn ${days} ngày). Hãy thu hẹp khoảng thời gian.`);
        const where = this._where(period, scope, query);
        const total = Number((await this.db.get(`SELECT COUNT(*) AS n FROM ${WITH_ANALYSIS} WHERE ${where.sql}`, where.params)).n);
        if (total > EXPORT_MAX_ROWS) throw fail('EXPORT_TOO_LARGE', `Xuất Excel tối đa ${EXPORT_MAX_ROWS} dòng một lần (bộ lọc có ${total} dòng). Hãy thêm bộ lọc.`);
        return { period, where, total };
    }

    /** Writes the xlsx of the filtered set to `stream` (any writable). Returns { total }. The size limits are checked before anything is written. */
    async exportTo(stream, query, scope) {
        const { period, where, total } = await this._exportPlan(query, scope);
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: false, useSharedStrings: false });
        const sheet = workbook.addWorksheet('Minh chứng F1.3');
        sheet.columns = EXPORT_COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.width }));
        const days = (await this.db.all(`SELECT DISTINCT ngay_do_kiem AS d FROM ${WITH_ANALYSIS} WHERE ${where.sql} ORDER BY 1`, where.params)).map((row) => row.d);
        let written = 0;
        for (const day of days) {
            const rows = await this.db.all(`SELECT * FROM ${WITH_ANALYSIS} WHERE ${where.sql} AND ngay_do_kiem = ? ORDER BY ma_bcvh, ma_tuyen, ma_bg`, [...where.params, day]);
            let map = null;
            try { map = await this._dayParcels(day); } catch { map = null; }
            for (const row of rows) {
                const journey = map ? map.get(row.ma_bg) : null;
                sheet.addRow(exportRow(this._item(row, journey, map ? (journey ? 'OK' : 'NOT_IN_SOURCE') : 'UNAVAILABLE'))).commit();
                written += 1;
            }
        }
        sheet.commit();
        await workbook.commit();
        return { total, written, from: period.from, to: period.to };
    }

    async exportPlan(query, scope) {
        const { total, period } = await this._exportPlan(query, scope);
        return { total, from: period.from, to: period.to };
    }

    // ---- analyses
    async _parcelRow(ngay, maBg) {
        return this.db.get(`SELECT * FROM ${WITH_ANALYSIS} WHERE ngay_do_kiem = ? AND ma_bg = ?`, [String(ngay || ''), String(maBg || '')]);
    }

    _assertScope(row, scope, access) {
        const allowed = Array.isArray(scope?.allowedCodes) ? scope.allowedCodes.map(String) : null;
        if (allowed && !allowed.includes(String(row.ma_bcvh))) throw fail('OUT_OF_SCOPE', 'Bưu gửi thuộc đơn vị ngoài phạm vi của bạn');
        return allowed;
    }

    /**
     * Appends one analysis. Refused: no capability (route), a parcel outside the account's BCVH, a parcel that is not Không đạt, a cause outside
     * the list, a missing mandatory note (Khác, a parcel the system already explained, or a choice that differs from the system's cause).
     */
    async record(input, scope, access, actor) {
        const row = await this._parcelRow(input?.ngay_do_kiem, input?.ma_bg);
        if (!row) throw fail('PARCEL_NOT_FOUND', 'Không tìm thấy bưu gửi (ngày đo kiểm, mã bưu gửi) trong bảng phân tích');
        const allowed = this._assertScope(row, scope, access);
        if (allowed === null && access?.position !== 'ADMIN') throw fail('OUT_OF_SCOPE', 'Chỉ được ghi phân tích cho bưu gửi của đơn vị mình');
        if (row.danh_gia !== FAILED) throw fail('NOT_FAILED', 'Chỉ phân tích bưu gửi Không đạt (Đạt và chưa đánh giá chỉ là minh chứng)');
        const cause = CAUSE_BY_CODE.get(String(input?.cause || ''));
        if (!cause) throw fail('INVALID_CAUSE', 'Nguyên nhân phải chọn trong danh sách');
        const note = String(input?.note ?? '').trim();
        if (note.length > NOTE_MAX) throw fail('NOTE_TOO_LONG', `Ghi chú tối đa ${NOTE_MAX} ký tự`);
        const system = systemOf(row);
        const explained = system.line !== null;
        const differs = explained && system.line !== cause.code;
        if (!note && (cause.code === 'KHAC' || explained)) {
            throw fail('NOTE_REQUIRED', cause.code === 'KHAC' ? 'Chọn "Khác" thì phải ghi chú' : (differs ? 'Nguyên nhân khác kết luận của hệ thống: phải ghi lý do' : 'Bưu gửi đã được hệ thống kết luận: phải ghi lý do khi phân tích'));
        }
        if (!actor?.name) throw fail('NO_ACTOR', 'Không xác định được người ghi');
        if (!this.classifierVersion) this.classifierVersion = computeClassifierVersion();
        const previous = await this.db.get('SELECT MAX(id) AS id FROM f13_analysis_log WHERE ngay_do_kiem = ? AND ma_bg = ?', [row.ngay_do_kiem, row.ma_bg]);
        const at = this.now().toISOString();
        const inserted = await this.writeDb.run(
            `INSERT INTO f13_analysis_log (ngay_do_kiem, ma_bg, ma_bcvh, cause_code, phat_detail, note, system_line, system_cause_code, system_cause_detail,
                system_cause_status, system_cause_reason, classifier_version, actor_id, actor_name, actor_position, created_at, supersedes_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [row.ngay_do_kiem, row.ma_bg, String(row.ma_bcvh), cause.code, cause.phat_detail, note || null, system.line, system.code, system.detail, system.status, system.reason,
                this.classifierVersion, actor.id ?? null, actor.name, actor.position ?? null, at, previous?.id ?? null],
        );
        const saved = await this._parcelRow(row.ngay_do_kiem, row.ma_bg);
        return { id: inserted.lastID, analysis: analysisOf(saved), superseded: previous?.id ?? null };
    }

    /** Every row recorded for a parcel, newest first. */
    async history(ngay, maBg, scope) {
        const row = await this._parcelRow(ngay, maBg);
        if (!row) throw fail('PARCEL_NOT_FOUND', 'Không tìm thấy bưu gửi (ngày đo kiểm, mã bưu gửi) trong bảng phân tích');
        this._assertScope(row, scope);
        const entries = await this.db.all('SELECT * FROM f13_analysis_log WHERE ngay_do_kiem = ? AND ma_bg = ? ORDER BY id DESC', [row.ngay_do_kiem, row.ma_bg]);
        return {
            ngay_do_kiem: row.ngay_do_kiem,
            ma_bg: row.ma_bg,
            system: systemOf(row),
            entries: entries.map((entry, index) => ({
                id: entry.id,
                current: index === 0,
                cause: entry.cause_code,
                label: CAUSE_BY_CODE.get(entry.cause_code)?.label ?? entry.cause_code,
                phat_detail: entry.phat_detail,
                note: entry.note,
                system_at_that_time: { line: entry.system_line, code: entry.system_cause_code, detail: entry.system_cause_detail, status: entry.system_cause_status, reason: entry.system_cause_reason },
                classifier_version: entry.classifier_version,
                by: entry.actor_name,
                position: entry.actor_position,
                at: entry.created_at,
                supersedes_id: entry.supersedes_id,
            })),
        };
    }
}

const EXPORT_COLUMNS = [
    { key: 'ngay', header: 'Ngày đo kiểm', width: 12 },
    { key: 'ma_bg', header: 'Mã bưu gửi', width: 18 },
    { key: 'bcvh', header: 'BCVH', width: 10 },
    { key: 'tuyen', header: 'Tuyến', width: 14 },
    { key: 'buu_ta', header: 'Bưu tá nhận đầu tiên', width: 22 },
    { key: 'danh_gia', header: 'Đánh giá', width: 11 },
    { key: 'gio_tct', header: 'Giờ thực hiện (TCT)', width: 14 },
    { key: 'chi_tieu', header: 'Chỉ tiêu (giờ)', width: 12 },
    { key: 'tms', header: 'Quét TMS (F1.3)', width: 19 },
    { key: 'depart', header: 'Đóng đi (F1.1 túi)', width: 19 },
    { key: 'arrive', header: 'Đến BCVH', width: 19 },
    { key: 'arrive_src', header: 'Nguồn mốc đến', width: 11 },
    { key: 'handover', header: 'Giao bưu tá đầu tiên (F4.2)', width: 19 },
    { key: 'ptc', header: 'Phát thành công (F1.3)', width: 19 },
    { key: 'sys_status', header: 'Hệ thống: trạng thái', width: 18 },
    { key: 'sys_cause', header: 'Hệ thống: nguyên nhân', width: 30 },
    { key: 'sys_reason', header: 'Hệ thống: lý do chờ / thiếu căn cứ', width: 28 },
    { key: 'flags', header: 'Cờ dữ liệu', width: 22 },
    { key: 'hints', header: 'Dấu hiệu', width: 22 },
    { key: 'ma_lo', header: 'Mã lô', width: 14 },
    { key: 'an_cause', header: 'Chuyên quản: nguyên nhân', width: 30 },
    { key: 'an_note', header: 'Chuyên quản: ghi chú', width: 36 },
    { key: 'an_by', header: 'Người phân tích', width: 20 },
    { key: 'an_at', header: 'Thời điểm phân tích', width: 22 },
];

function exportRow(item) {
    const m = item.milestones;
    return {
        ngay: item.ngay_do_kiem,
        ma_bg: item.ma_bg,
        bcvh: item.ma_bcvh,
        tuyen: item.ma_tuyen,
        buu_ta: item.ten_buu_ta_first || item.ma_buu_ta_first || '',
        danh_gia: item.danh_gia || 'Chưa đánh giá',
        gio_tct: item.tct.hours_text ?? item.tct.tct_hours ?? '',
        chi_tieu: item.tct.limit_hours ?? '',
        tms: m?.tms.at ?? '',
        depart: m?.depart.at ?? '',
        arrive: m?.arrive.at ?? '',
        arrive_src: m?.arrive.source ?? '',
        handover: m?.handover_first.at ?? '',
        ptc: m?.ptc.at ?? '',
        sys_status: item.system.status ?? '',
        sys_cause: item.system.label ?? '',
        sys_reason: item.system.reason ?? '',
        flags: item.flags.join(', '),
        hints: item.hints.join(', '),
        ma_lo: item.ma_lo ?? '',
        an_cause: item.analysis ? item.analysis.label : '',
        an_note: item.analysis?.note ?? '',
        an_by: item.analysis?.by ?? '',
        an_at: item.analysis?.at ?? '',
    };
}

module.exports = { EvidenceService, ANALYST_CAUSES, EXPORT_MAX_DAYS, EXPORT_MAX_ROWS, MAX_PAGE_DAYS, MAX_PAGE_SIZE, NOTE_MAX, WITH_ANALYSIS, EXPORT_COLUMNS };
