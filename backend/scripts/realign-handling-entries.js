'use strict';

/**
 * HANGTON-HANDLING-01: brings the entries already typed (the newest entry of each parcel, dated today) in line with the
 * rules the PO fixed on 2026-10-27, as same-day corrections (a new row of action EDIT that supersedes the old one; nothing is
 * deleted or overwritten, the author stays the person who typed it, the approver column says who realigned it).
 * NOTHING THE PERSON WROTE IS LOST: what the new structure has no place for goes to the note, and the old rows stay in the log.
 *   - a wording typed under "Nguyên nhân khác" that is one of the contents of the list becomes that content:
 *       "hoàn" / "chuyển hoàn" -> Chuyển hoàn (plan Chuyển hoàn ngày, dated today),
 *       "ptc" / "phát hoàn TC" / "đã phát thành công" ... -> Phát thành công (what was written as plan, e.g. "27/10", becomes the
 *       detail: "Phát thành công 27/10"),
 *       "chờ hoàn" -> Chờ hoàn (its plan and date are kept);
 *   - a plan written as "mất 27/10" -> content "Mất" with the detail "27/10", the old wording ("chậm giao") goes to the note;
 *   - the result is recomputed from the content: Phát thành công, Mất, Vô thừa nhận, Chuyển hoàn = Đã xử lý, any other = Chưa xử lý.
 * Not guessed: an entry the person marked "Chưa xử lý" although its wording says it is settled (e.g. "ptc" + Chưa xử lý) is
 * left as typed and listed; so is every free wording whose result changes from Đã xử lý to Chưa xử lý, for the PO to look at.
 *
 *   node scripts/realign-handling-entries.js            dry run, writes nothing
 *   node scripts/realign-handling-entries.js --apply    writes (run it after the backend runs the new code); first it saves a
 *                                                       copy of the handling tables and a before/after list in exports/
 *
 * Idempotent: a second run finds nothing to change.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const catalog = require('../src/services/hangtonInventory/handling/catalog');

const REALIGNED_BY = 'Điều chỉnh theo quy hoạch 27/10 (Claude Code)';
// wordings of "Nguyên nhân khác" that are really a content of the list
const CONVERTIBLE = Object.freeze(['PHAT_THANH_CONG', 'CHUYEN_HOAN', 'CHO_HOAN']);
const FIELDS = ['cause_code', 'cause_text', 'plan_code', 'plan_text', 'result_code', 'due_date', 'note'];
const LOST_PLAN = /^\s*mất(?:\s+(.*))?$/i; // a plan written as "mất 27/10"

const norm = (value) => (value === undefined || value === null || value === '' ? null : String(value));
const upperFirst = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const appendNote = (note, add) => (add ? (note ? `${note} | ${add}` : add) : note || null);

/** The plan of a row as the person wrote it, for the note ("Phát lại ngày 29/10/2026 (chờ khách)"). */
function describePlan(row) {
    if (!row.plan_code) return '';
    const label = row.plan_code === catalog.OTHER ? '' : (catalog.optionOf('plan', row.plan_code)?.label || row.plan_code);
    const date = row.due_date ? row.due_date.split('-').reverse().join('/') : '';
    return [label, date, row.plan_text].filter(Boolean).join(' ');
}

/**
 * Pure. `latest` = the newest row of each parcel; returns one item per row that has to change or needs a look:
 * { item_code, id, status: 'CHANGE' | 'LEFT_AS_TYPED' | 'INVALID', kind, from, to, why }.
 */
function planRealign(latest, { today }) {
    const out = [];
    for (const row of latest) {
        if (row.business_date !== today) continue; // an older day would need the chuyên quản's approval
        let content = { cause_code: row.cause_code, cause_text: row.cause_text, plan_code: row.plan_code, plan_text: row.plan_text, due_date: row.due_date };
        let note = row.note;
        let kind = 'RESULT_ONLY';
        const lostPlan = row.cause_code === catalog.OTHER && row.plan_code === catalog.OTHER ? String(row.plan_text || '').match(LOST_PLAN) : null;
        if (lostPlan) {
            // "chậm giao" + plan "mất 27/10": content "Mất 27/10", the old wording goes to the note
            content = { cause_code: 'MAT', cause_text: (lostPlan[1] || '').trim() || null, plan_code: '', plan_text: null, due_date: null };
            note = appendNote(note, upperFirst(String(row.cause_text || '').trim()));
            kind = 'CONVERT_CAUSE';
        } else if (row.cause_code === catalog.OTHER) {
            const group = catalog.groupOf('cause', catalog.OTHER, row.cause_text);
            if (CONVERTIBLE.includes(group)) {
                if (group !== 'CHO_HOAN' && row.result_code === catalog.NOT_DONE) {
                    out.push({ item_code: row.item_code, id: row.id, status: 'LEFT_AS_TYPED', kind: 'CONFLICT', from: row, why: `"${row.cause_text}" nghĩa là ${catalog.optionOf('cause', group).label} nhưng người nhập chọn Chưa xử lý` });
                    continue;
                }
                if (group === 'CHO_HOAN') {
                    content = { ...content, cause_code: group, cause_text: null };
                } else {
                    // what was written as plan ("27/10") becomes the detail of the content; a plan with real substance goes to the note
                    const asDetail = row.plan_code === catalog.OTHER && row.plan_text ? String(row.plan_text).trim() : null;
                    const samePlan = group === 'CHUYEN_HOAN' && row.plan_code === 'CHUYEN_HOAN' && !row.plan_text;
                    if (!asDetail && !samePlan && row.plan_code) note = appendNote(note, `Hướng xử lý trước đó: ${describePlan(row)}`);
                    content = { cause_code: group, cause_text: asDetail, plan_code: '', plan_text: null, due_date: null };
                }
                kind = 'CONVERT_CAUSE';
            }
        }
        const checked = catalog.validateEntry({
            ...content, note, postman_code: row.postman_code, postman_name: row.postman_name,
        }, { today });
        if (!checked.ok) {
            out.push({ item_code: row.item_code, id: row.id, status: 'INVALID', kind, from: row, why: checked.errors.map((e) => e.message).join('; ') });
            continue;
        }
        const to = checked.value;
        if (FIELDS.every((field) => norm(to[field]) === norm(row[field]))) continue; // already in line
        const wasDone = row.result_code === catalog.DONE;
        const nowDone = to.result_code === catalog.DONE;
        out.push({ item_code: row.item_code, id: row.id, status: 'CHANGE', kind, from: row, to, lostDone: wasDone && !nowDone && kind === 'RESULT_ONLY' });
    }
    return out;
}

function open(dbPath, mode) {
    return new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(dbPath, mode, (error) => (error ? reject(error) : resolve(handle)));
    });
}
const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function onRun(e) { return e ? reject(e) : resolve(this); }));

const NEWEST_PER_PARCEL = 'SELECT * FROM hangton_handling_log WHERE id IN (SELECT MAX(id) FROM hangton_handling_log GROUP BY item_code)';
const BACKUP_TABLES = ['hangton_handling_log', 'hangton_edit_request', 'hangton_reason_map', 'hangton_option_group'];

function localToday(now = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Writes the corrections as EDIT rows, re-reading the newest row of each parcel inside the transaction. */
async function applyPlan(db, plan, { now = new Date() } = {}) {
    let written = 0;
    let skipped = 0;
    await run(db, 'BEGIN IMMEDIATE');
    try {
        for (const item of plan.filter((p) => p.status === 'CHANGE')) {
            const [current] = await all(db, 'SELECT * FROM hangton_handling_log WHERE item_code = ? ORDER BY id DESC LIMIT 1', [item.item_code]);
            if (!current || current.id !== item.id) { skipped += 1; continue; } // somebody typed meanwhile: leave it to the next run
            const to = item.to;
            await run(db,
                `INSERT INTO hangton_handling_log (item_code, business_date, snapshot_id, slot, office_code, office, ton_level, customer_class, action,
                    cause_code, cause_text, plan_code, plan_text, result_code, result_text, due_date, postman_code, postman_name, note,
                    actor_id, actor_name, actor_position, approved_by_id, approved_by_name, supersedes_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EDIT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
                [current.item_code, current.business_date, current.snapshot_id, current.slot, current.office_code, current.office, current.ton_level, current.customer_class,
                    to.cause_code, to.cause_text, to.plan_code, to.plan_text, to.result_code, to.result_text, to.due_date, to.postman_code, to.postman_name, to.note,
                    current.actor_id, current.actor_name, current.actor_position, REALIGNED_BY, current.id, now.getTime()]);
            written += 1;
        }
        await run(db, 'COMMIT');
    } catch (error) {
        await run(db, 'ROLLBACK').catch(() => {});
        throw error;
    }
    return { written, skipped };
}

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Before / after of every change, one line per parcel (for the PO to read in Excel). */
function changesCsv(plan) {
    const head = ['Mã bưu gửi', 'Trước: nội dung', 'Trước: chi tiết', 'Trước: hướng xử lý', 'Trước: kết quả', 'Trước: ghi chú', 'Sau: nội dung', 'Sau: chi tiết', 'Sau: hướng xử lý', 'Sau: kết quả', 'Sau: ghi chú', 'Cần xem'];
    const lines = [head.map(csvCell).join(',')];
    for (const p of plan) {
        const f = p.from;
        const to = p.to;
        const label = (kind, code) => (code ? (catalog.optionOf(kind, code)?.label || code) : '');
        lines.push([
            p.item_code, label('cause', f.cause_code), f.cause_text, describePlan(f), label('result', f.result_code), f.note,
            to ? label('cause', to.cause_code) : '', to ? to.cause_text : '', to ? describePlan(to) : '', to ? label('result', to.result_code) : '', to ? to.note : '',
            p.status === 'CHANGE' ? (p.lostDone ? 'Đã xử lý -> Chưa xử lý' : '') : p.why,
        ].map(csvCell).join(','));
    }
    return `﻿${lines.join('\r\n')}\r\n`;
}

function describe(plan) {
    const count = (predicate) => plan.filter(predicate).length;
    const lines = [
        `To change: ${count((p) => p.status === 'CHANGE')} (content becomes one of the list: ${count((p) => p.status === 'CHANGE' && p.kind === 'CONVERT_CAUSE')}, result recomputed only: ${count((p) => p.status === 'CHANGE' && p.kind === 'RESULT_ONLY')})`,
        `Left as typed (conflict): ${count((p) => p.status === 'LEFT_AS_TYPED')}   Cannot be realigned: ${count((p) => p.status === 'INVALID')}`,
    ];
    const byTarget = new Map();
    for (const p of plan.filter((q) => q.status === 'CHANGE')) {
        const to = catalog.optionOf('cause', p.to.cause_code)?.label + (p.to.cause_text && p.to.cause_code !== catalog.OTHER ? ` ${p.to.cause_text}` : '');
        const label = `${p.from.cause_code === 'OTHER' ? `"${p.from.cause_text}"` : p.from.cause_code} -> ${to}${p.kind === 'CONVERT_CAUSE' ? '' : ' (same content)'}, ${p.from.result_code} -> ${p.to.result_code}${norm(p.to.note) !== norm(p.from.note) ? `, note: ${p.to.note}` : ''}`;
        byTarget.set(label, (byTarget.get(label) || 0) + 1);
    }
    for (const [label, n] of [...byTarget].sort((a, b) => b[1] - a[1])) lines.push(`  ${String(n).padStart(3)} x ${label}`);
    const lost = plan.filter((p) => p.lostDone);
    if (lost.length > 0) lines.push(`Free wordings that were "Đã xử lý" and become "Chưa xử lý" (for the PO to check): ${[...new Set(lost.map((p) => p.from.cause_text).filter(Boolean))].join(' | ')}`);
    for (const p of plan.filter((q) => q.status !== 'CHANGE')) lines.push(`  ${p.item_code}: ${p.status} - ${p.why}`);
    return lines.join('\n');
}

/** A JSON copy of the handling tables and the before/after list, in exports/ (git-ignored). */
async function saveSafetyCopies(db, plan, now = new Date()) {
    const dir = path.resolve(__dirname, '../../exports');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = `${localToday(now)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const copy = { taken_at: now.toISOString(), note: 'Copy of the stock-handling tables taken before the entries were realigned.' };
    for (const table of BACKUP_TABLES) copy[table] = await all(db, `SELECT * FROM ${table}`);
    const backupFile = path.join(dir, `hangton_xu_ly_truoc_dieu_chinh_${stamp}.json`);
    const changesFile = path.join(dir, `hangton_xu_ly_dieu_chinh_${stamp}.csv`);
    fs.writeFileSync(backupFile, JSON.stringify(copy, null, 1), 'utf8');
    fs.writeFileSync(changesFile, changesCsv(plan), 'utf8');
    return { backupFile, changesFile };
}

async function main(argv) {
    const apply = argv.includes('--apply');
    const dbPath = path.resolve(__dirname, '../src/db/database.sqlite');
    const today = localToday();
    const db = await open(dbPath, apply ? sqlite3.OPEN_READWRITE : sqlite3.OPEN_READONLY);
    try {
        await run(db, 'PRAGMA busy_timeout = 30000');
        const plan = planRealign(await all(db, NEWEST_PER_PARCEL), { today });
        console.log(describe(plan));
        if (!apply) { console.log('\nDry run: nothing written. Add --apply to write.'); return; }
        const files = await saveSafetyCopies(db, plan);
        console.log(`\nSaved: ${files.backupFile}\n       ${files.changesFile}`);
        const result = await applyPlan(db, plan);
        console.log(`Written ${result.written} EDIT rows (${result.skipped} skipped because the parcel was typed meanwhile: run again).`);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    main(process.argv.slice(2)).catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { planRealign, applyPlan, describe, changesCsv, REALIGNED_BY };
