'use strict';

// OPS-JOURNAL-01 (A2): the black-spot candidates the Giám đốc TTVH picks from on the journal day.
// Nothing is recomputed: every rate comes from the same adapters the Home page uses (HomeExecutiveService.buildDefaultAdapters:
// the indicator's own summary / ranking / pair / office services), so the journal cannot disagree with the dashboards.
// Data day = N-1: the latest loaded day on or before (journal day - 1) of each indicator, compared with the same weekday of
// the week before, plus the month to date. Hàng tồn is the 07:30 snapshot of the journal day (newest one on or before it).
//
// Scoring (CTO default, PO 2026-10-30 "Mặc định"; weights are constants below):
//   F1.1 / F1.2 / F1.3 / F4.1: a unit is a candidate when it is below the indicator's target and has at least MIN_VOLUME
//     parcels; score = failed parcels x week-on-week drop (points). When the rate did not fall (or last week has no data)
//     the score is failed x gap-to-target x FALLBACK_WEIGHT, so units that fell always come first.
//   Hàng tồn: a candidate when it holds parcels >= 5 days; score = parcels >= 5 days, COD of those parcels breaks ties.
// Scores of different indicators are not comparable, so the list is ordered by score / best score of the same indicator,
// at most PER_INDICATOR_CAP per indicator and MAX_CANDIDATES in all. Pre-selected: the top PRESELECT_COUNT, at most
// PRESELECT_PER_INDICATOR per indicator.
const { TARGETS } = require('../HomeExecutiveService');

/** The figures are being written right now (an import or a snapshot holds a transaction on the shared connection). */
class DataUpdatingError extends Error {
    constructor() {
        super('Dữ liệu đang được cập nhật, vui lòng thử lại sau ít phút.');
        this.code = 'DATA_UPDATING';
        this.status = 409;
    }
}

const LABELS = Object.freeze({ f11: 'F1.1', f12: 'F1.2', f13: 'F1.3', f41: 'F4.1' });
const INDICATOR_ORDER = Object.freeze(['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON']);
const MIN_VOLUME = Object.freeze({ f11: 5, f12: 5, f13: 10, f41: 10 });
const FALLBACK_WEIGHT = 0.1;
const MAX_CANDIDATES = 20;
const PER_INDICATOR_CAP = 6;
const PRESELECT_COUNT = 8;
const PRESELECT_PER_INDICATOR = 3;
const HANGTON_MIN_RANK = 5;

const round1 = (value) => Number(Number(value).toFixed(1));
const num = (value) => (value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value));

function shiftDate(day, delta) {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}
const dm = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const pct = (value) => `${round1(value).toString().replace('.', ',')}%`;
const money = (value) => Math.round(Number(value) || 0).toLocaleString('vi-VN');

// ---- units of one indicator over a range ------------------------------------------------------------------------------

/** [{ key, scopeType, officeCode, officeName, label, total, fail, rate }] for the range, whatever the indicator's service shape. */
async function collectUnits(id, adapter, from, to, canonical) {
    const units = [];
    const push = (unit) => { if (unit.total > 0 && unit.rate !== null) units.push({ ...unit, rate: Number(unit.rate) }); };
    if (id === 'f11' && adapter.pairs) {
        const table = await adapter.pairs(from, to);
        for (const row of table?.rows || []) {
            for (const column of table.columns || []) {
                if (column.ma_bcvh === 'OTHER') continue; // "Khác" lumps many delivery offices: not one pair
                const cell = row.cells?.[column.ma_bcvh];
                if (!cell) continue;
                push({
                    key: `${row.ma_chap_nhan}|${column.ma_bcvh}`, scopeType: 'PAIR', officeCode: String(column.ma_bcvh), officeName: column.ten_bcvh,
                    label: `${row.ten_chap_nhan} → ${column.ten_bcvh}`, total: num(cell.volume) || 0, fail: num(cell.failed) || 0, rate: num(cell.rate),
                });
            }
        }
    }
    if (id === 'f12') {
        const result = await adapter.offices(from, to);
        for (const row of result?.data || []) {
            push({
                key: String(row.ma_bcvh), scopeType: 'BCVH', officeCode: String(row.ma_bcvh), officeName: row.ten_bcvh, label: row.ten_bcvh,
                total: num(row.total_bg) || 0, fail: num(row.total_failed) || 0, rate: num(row.passed_rate),
            });
        }
        return units;
    }
    const ranking = await adapter.ranking(from, to);
    for (const row of ranking?.data || []) {
        if (!canonical.has(String(row.ma_bcvh))) continue; // a stray code is not a BCVH
        push({
            key: String(row.ma_bcvh), scopeType: 'BCVH', officeCode: String(row.ma_bcvh), officeName: row.ten_bcvh, label: row.ten_bcvh,
            total: num(row.total_bg ?? row.sl_bg_ptc) || 0, fail: num(row.total_failed ?? row.khong_dat_kpi_2026) || 0, rate: num(row.passed_rate),
        });
    }
    return units;
}

async function latestLoadedDay(db, adapter, onOrBefore) {
    if (!adapter.localTable) return onOrBefore;
    const row = await db.get(`SELECT MAX(ngay_do_kiem) AS d FROM ${adapter.localTable} WHERE ngay_do_kiem <= ?`, [onOrBefore]);
    return row?.d || null;
}

function rateHeadline(label, unit, day, compareDay, mtd, kindText) {
    const parts = [`Chỉ tiêu ${label} của ${kindText} ngày ${dm(day)} đạt ${pct(unit.rate)} (${unit.total} BG, ${unit.fail} BG không đạt)`];
    if (unit.compareRate !== null) {
        const delta = round1(unit.rate - unit.compareRate);
        const change = delta === 0 ? 'không đổi' : `${delta < 0 ? 'giảm' : 'tăng'} ${pct(Math.abs(delta))}`;
        parts[0] += `, ${change} so với cùng kỳ tuần trước (${dm(compareDay)}: ${pct(unit.compareRate)}, ${unit.compareTotal} BG)`;
    }
    let text = `${parts[0]}.`;
    if (mtd !== null) text += ` Lũy kế tháng ${day.slice(5, 7)} đến ${dm(day)} đạt ${pct(mtd)}.`;
    return text;
}

async function rateCandidates(db, id, adapter, journalDay, canonical) {
    const label = LABELS[id];
    const target = TARGETS[id];
    const day = await latestLoadedDay(db, adapter, shiftDate(journalDay, -1));
    if (!day) return { asOf: null, items: [] };
    const compareDay = shiftDate(day, -7);
    const monthStart = `${day.slice(0, 7)}-01`;
    const [current, previous, month] = await Promise.all([
        collectUnits(id, adapter, day, day, canonical),
        collectUnits(id, adapter, compareDay, compareDay, canonical).catch(() => []),
        collectUnits(id, adapter, monthStart, day, canonical).catch(() => []),
    ]);
    const prevByKey = new Map(previous.map((u) => [u.key, u]));
    const monthByKey = new Map(month.map((u) => [u.key, u]));
    const items = [];
    for (const unit of current) {
        if (unit.total < MIN_VOLUME[id] || !(unit.rate < target)) continue;
        const prev = prevByKey.get(unit.key);
        const withCompare = { ...unit, compareRate: prev ? prev.rate : null, compareTotal: prev ? prev.total : null };
        const drop = withCompare.compareRate === null ? 0 : withCompare.compareRate - unit.rate;
        const score = drop > 0 ? unit.fail * drop : unit.fail * (target - unit.rate) * FALLBACK_WEIGHT;
        const mtd = monthByKey.get(unit.key)?.rate ?? null;
        const kindText = unit.scopeType === 'PAIR' ? `cặp ${unit.label}` : (id === 'f12' ? `đơn vị chấp nhận ${unit.officeName}` : `${unit.officeName}`);
        items.push({
            candidateId: `${label}:${unit.scopeType}:${unit.key}`,
            indicator: label,
            scopeType: unit.scopeType,
            scopeKey: unit.key,
            officeCode: unit.officeCode,
            officeName: unit.officeName,
            title: `${label} - ${unit.label}`,
            headline: rateHeadline(label, withCompare, day, compareDay, mtd, kindText),
            metrics: {
                rate: round1(unit.rate), total: unit.total, fail: unit.fail, notEvaluated: null,
                compareRate: withCompare.compareRate === null ? null : round1(withCompare.compareRate), compareTotal: withCompare.compareTotal,
                delta: withCompare.compareRate === null ? null : round1(unit.rate - withCompare.compareRate),
                mtdRate: mtd === null ? null : round1(mtd),
                stockGe5: null, stockGe7: null, stockGe14: null, cod: null,
            },
            score,
        });
    }
    return { asOf: day, compareDay, items };
}

// ---- hàng tồn -------------------------------------------------------------------------------------------------------------

async function hangtonCandidates(db, journalDay) {
    const snapshot = await db.get(
        `SELECT * FROM hangton_snapshot WHERE business_date <= ? ORDER BY business_date DESC, is_stale ASC,
            CASE WHEN slot = '0730' THEN 0 ELSE 1 END, slot DESC LIMIT 1`, [journalDay]);
    if (!snapshot) return { asOf: null, items: [] };
    const rows = await db.all(
        `SELECT office_code, MAX(office) AS office,
                SUM(CASE WHEN ton_rank >= 5 THEN 1 ELSE 0 END) AS ge5,
                SUM(CASE WHEN ton_rank >= 7 THEN 1 ELSE 0 END) AS ge7,
                SUM(CASE WHEN ton_rank >= 14 THEN 1 ELSE 0 END) AS ge14,
                COALESCE(SUM(CASE WHEN ton_rank >= 5 THEN cod END), 0) AS cod_ge5
           FROM hangton_snapshot_item
          WHERE snapshot_id = ? AND office_code IS NOT NULL AND office_code <> ''
          GROUP BY office_code HAVING ge5 > 0`, [snapshot.id]);
    const items = rows.map((row) => ({
        candidateId: `HANGTON:BCVH:${row.office_code}`,
        indicator: 'HANGTON',
        scopeType: 'BCVH',
        scopeKey: String(row.office_code),
        officeCode: String(row.office_code),
        officeName: row.office,
        title: `Hàng tồn - ${row.office}`,
        headline: `Hàng tồn của ${row.office} lúc ${snapshot.slot === '0730' ? '07:30' : snapshot.slot} ngày ${dm(snapshot.business_date)}: ${row.ge5} bưu gửi tồn từ ${HANGTON_MIN_RANK} ngày trở lên `
            + `(từ 7 ngày: ${row.ge7}, từ 14 ngày: ${row.ge14}), COD ${money(row.cod_ge5)} đồng.`,
        metrics: {
            rate: null, total: null, fail: null, notEvaluated: null, compareRate: null, compareTotal: null, delta: null, mtdRate: null,
            stockGe5: row.ge5, stockGe7: row.ge7, stockGe14: row.ge14, cod: Math.round(row.cod_ge5),
        },
        score: row.ge5,
        tieBreak: row.cod_ge5,
    }));
    return { asOf: snapshot.business_date, items, snapshotId: snapshot.id };
}

// ---- ranking and selection --------------------------------------------------------------------------------------------------

/** Orders candidates of all indicators, applies the caps and marks the pre-selection. Pure. */
function rankAndSelect(all) {
    const bestOf = new Map();
    for (const item of all) bestOf.set(item.indicator, Math.max(bestOf.get(item.indicator) || 0, item.score));
    const scored = all.map((item) => ({ ...item, rankScore: bestOf.get(item.indicator) > 0 ? item.score / bestOf.get(item.indicator) : 0 }));
    scored.sort((a, b) => (b.rankScore - a.rankScore) || (b.score - a.score) || ((b.tieBreak || 0) - (a.tieBreak || 0))
        || (INDICATOR_ORDER.indexOf(a.indicator) - INDICATOR_ORDER.indexOf(b.indicator)) || a.candidateId.localeCompare(b.candidateId));
    const used = new Map();
    const kept = [];
    for (const item of scored) {
        if (kept.length >= MAX_CANDIDATES) break;
        if ((used.get(item.indicator) || 0) >= PER_INDICATOR_CAP) continue;
        used.set(item.indicator, (used.get(item.indicator) || 0) + 1);
        kept.push(item);
    }
    const picked = new Map();
    let preselected = 0;
    return kept.map(({ tieBreak, ...item }) => {
        const take = preselected < PRESELECT_COUNT && (picked.get(item.indicator) || 0) < PRESELECT_PER_INDICATOR;
        if (take) {
            preselected += 1;
            picked.set(item.indicator, (picked.get(item.indicator) || 0) + 1);
        }
        return { ...item, score: Math.round(item.score * 100) / 100, rankScore: Math.round(item.rankScore * 1000) / 1000, preselected: take };
    });
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // journal day -> { generation, at, promise }

function clearCandidateCache() { cache.clear(); }

/**
 * GET /candidates: the ranked candidates for the journal day. A source that fails is listed in `unavailable` and the others
 * still answer (one broken indicator must not hide the rest of the day).
 */
async function buildCandidates({ db, date, adapters }) {
    // Reads on the single shared connection also see the uncommitted rows of an open import / snapshot transaction. The figures are
    // frozen into the journal, so refuse to build while one is open, or when one opened or closed during the build.
    const tx = db.txState || { active: 0, generation: 0 };
    if (tx.active > 0) throw new DataUpdatingError();
    const generation = tx.generation;
    // Building takes ~3 s (four indicators, three periods each). The answer only changes when data is loaded, and every load moves
    // txState.generation, so a result is reused while the generation is the same (bounded by CACHE_TTL_MS); a build in flight is shared.
    const cached = cache.get(date);
    if (cached && cached.adapters === adapters && cached.db === db && cached.generation === generation && Date.now() - cached.at < CACHE_TTL_MS) {
        return structuredClone(await cached.promise);
    }
    const promise = buildCandidatesUnguarded({ db, date, adapters });
    cache.set(date, { adapters, db, generation, at: Date.now(), promise });
    let result;
    try {
        result = await promise;
    } catch (error) {
        if (cache.get(date)?.promise === promise) cache.delete(date);
        throw error;
    }
    if (tx.active > 0 || tx.generation !== generation) {
        if (cache.get(date)?.promise === promise) cache.delete(date);
        throw new DataUpdatingError();
    }
    return structuredClone(result);
}

async function buildCandidatesUnguarded({ db, date, adapters }) {
    const { CANONICAL_CODES } = require('../F11RankingService');
    const canonical = new Set(CANONICAL_CODES.map(String));
    const all = [];
    const asOfByIndicator = {};
    const unavailable = [];
    for (const id of ['f11', 'f12', 'f13', 'f41']) {
        try {
            const result = await rateCandidates(db, id, adapters[id], date, canonical);
            asOfByIndicator[LABELS[id]] = result.asOf;
            all.push(...result.items);
        } catch (error) {
            asOfByIndicator[LABELS[id]] = null;
            unavailable.push({ indicator: LABELS[id], message: 'Không đọc được số liệu chỉ tiêu này' });
            console.error(`[ops-journal] candidates ${LABELS[id]}:`, error.message);
        }
    }
    try {
        const stock = await hangtonCandidates(db, date);
        asOfByIndicator.HANGTON = stock.asOf;
        all.push(...stock.items);
    } catch (error) {
        asOfByIndicator.HANGTON = null;
        unavailable.push({ indicator: 'HANGTON', message: 'Không đọc được số liệu hàng tồn' });
        console.error('[ops-journal] candidates HANGTON:', error.message);
    }
    const days = Object.entries(asOfByIndicator).filter(([key, value]) => key !== 'HANGTON' && value).map(([, value]) => value).sort();
    const asOfDate = days.length ? days[days.length - 1] : null;
    return {
        asOfDate,
        compareDate: asOfDate ? shiftDate(asOfDate, -7) : null,
        asOfByIndicator,
        unavailable,
        items: rankAndSelect(all),
    };
}

module.exports = {
    DataUpdatingError, buildCandidates, clearCandidateCache, rankAndSelect, collectUnits,
    LIMITS: { MIN_VOLUME, FALLBACK_WEIGHT, MAX_CANDIDATES, PER_INDICATOR_CAP, PRESELECT_COUNT, PRESELECT_PER_INDICATOR },
};
