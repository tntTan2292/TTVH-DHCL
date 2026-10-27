'use strict';

// HANGTON-INVENTORY-01 phase 2. Run per file: node --test test_hangtonInventory.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();
const { applyHangtonInventory01Schema } = require('./migrate_hangton_inventory_01_schema');
const { selectScope, tonRank, SCOPE_STATUSES } = require('./src/services/hangtonInventory/scope');
const { takeSnapshot } = require('./src/services/hangtonInventory/snapshotService');
const inventory = require('./src/services/hangtonInventory/compareService');
const { dueSlot, createScheduler } = require('./src/services/hangtonInventory/scheduler');
const { fetchStockData } = require('./src/services/hangtonInventory/client');
const XLSX = require('xlsx');
const { buildItemsXlsx, buildItemsCsv } = require('./src/services/hangtonInventory/itemsExport');

async function makeDb() {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hangton-')), 'test.sqlite');
    await applyHangtonInventory01Schema(file);
    const handle = new sqlite3.Database(file);
    return {
        handle,
        run: (sql, p = []) => new Promise((res, rej) => handle.run(sql, p, function (e) { e ? rej(e) : res(this); })),
        get: (sql, p = []) => new Promise((res, rej) => handle.get(sql, p, (e, r) => (e ? rej(e) : res(r)))),
        all: (sql, p = []) => new Promise((res, rej) => handle.all(sql, p, (e, r) => (e ? rej(e) : res(r)))),
    };
}

const row = (code, level, extra = {}) => ({
    ItemCode: code, StatusName: 'Đã xác nhận đến', DK1: 'LM', 'Loại Tồn': level, 'Bưu cục Phát': 'BCVH Thuận Hóa',
    COD: 1000, 'Ngày Quét TMS': 1, ...extra,
});

test('scope: only DK1 LM + the 5 statuses, any Loại Tồn, no duplicates', () => {
    const rows = [
        row('A1', '<1 ngày'), row('A2', '≥14 ngày'),
        row('B1', '≥3 ngày', { DK1: 'FM' }),
        row('C1', '≥3 ngày', { DK1: 'LMH' }),
        row('D1', '≥3 ngày', { StatusName: 'Đã đóng chuyến thư đi' }),
        row('E1', '≥2 ngày', { StatusName: 'Vu hồi về bưu cục' }),
        row('A1', '<1 ngày'),
        { ...row('F1', '≥1 ngày'), ItemCode: null },
    ];
    assert.deepEqual(selectScope(rows).map((i) => i.item_code), ['A1', 'A2', 'E1']);
    assert.equal(SCOPE_STATUSES.length, 5);
    assert.deepEqual(['<1 ngày', '≥1 ngày', '≥1.5 ngày', '≥14 ngày'].map(tonRank), [0, 1, 1.5, 14]);
});

test('snapshot stores the scoped set, replaces the same slot, flags stale portal data', async () => {
    const db = await makeDb();
    const rows = [row('A1', '≥3 ngày'), row('A2', '≥5 ngày'), row('X', '≥5 ngày', { DK1: 'FM' })];
    const fetchStock = async () => ({ rows, portalTimestamp: 'T1', count: rows.length });
    const now = new Date(2026, 9, 17, 7, 31);
    const first = await takeSnapshot({ db, fetchStock, slot: '0730', now });
    assert.equal(first.keptRows, 2);
    assert.equal(first.sourceRows, 3);
    assert.equal(first.isStale, false);
    const again = await takeSnapshot({ db, fetchStock, slot: '0730', now: new Date(2026, 9, 17, 7, 40) });
    assert.equal((await db.all('SELECT * FROM hangton_snapshot')).length, 1);
    assert.equal((await db.all('SELECT * FROM hangton_snapshot_item')).length, 2);
    assert.equal(again.isStale, false, 'replacing the same slot is not compared with itself');
    const noon = await takeSnapshot({ db, fetchStock, slot: '1130', now: new Date(2026, 9, 17, 11, 31) });
    assert.equal(noon.isStale, true, 'same portal timestamp as the previous snapshot');
    await assert.rejects(takeSnapshot({ db, fetchStock, slot: '0900', now }), /HANGTON_BAD_SLOT/);
});

test('compare classifies resolved / aged_up / new / unchanged and defaults to same slot yesterday', async () => {
    const db = await makeDb();
    const yesterday = [row('R', '≥5 ngày'), row('U', '≥3 ngày'), row('S', '≥4 ngày'), row('O', '≥1 ngày', { 'Bưu cục Phát': 'BCVH Phú Lộc' })];
    const today = [row('U', '≥4 ngày'), row('S', '≥4 ngày'), row('N', '<1 ngày'), row('O', '≥1 ngày', { 'Bưu cục Phát': 'BCVH Phú Lộc' })];
    await takeSnapshot({ db, fetchStock: async () => ({ rows: yesterday, portalTimestamp: 'Y', count: 4 }), slot: '0730', now: new Date(2026, 9, 16, 7, 30) });
    await takeSnapshot({ db, fetchStock: async () => ({ rows: today, portalTimestamp: 'Z', count: 4 }), slot: '0730', now: new Date(2026, 9, 17, 7, 30) });

    const to = await inventory.resolveSnapshot(db, {});
    assert.equal(to.business_date, '2026-10-17');
    const from = await inventory.resolveDefaultBase(db, to, {});
    assert.equal(from.business_date, '2026-10-16');
    const result = await inventory.compare(db, from.id, to.id, { detail: true });
    assert.deepEqual(result.summary, { resolved: 1, aged_up: 1, aged_down: 0, new: 1, unchanged: 2 });
    assert.deepEqual(result.resolved.map((r) => r.item_code), ['R']);
    assert.deepEqual(result.aged_up.map((r) => [r.item_code, r.from_level, r.to_level]), [['U', '≥3 ngày', '≥4 ngày']]);
    assert.deepEqual(result.new.map((r) => r.item_code), ['N']);

    const list = await inventory.items(db, to.id, { minRank: 3, sort: 'rank' });
    assert.equal(list.total, 2);
    assert.deepEqual(list.rows.map((r) => r.item_code), ['S', 'U']);
    assert.deepEqual((await inventory.items(db, to.id, { sort: 'rank', dir: 'asc' })).rows.map((r) => r.item_code), ['N', 'O', 'S', 'U']);
    assert.deepEqual((await inventory.items(db, to.id, { sort: 'item_code', dir: 'desc' })).rows.map((r) => r.item_code), ['U', 'S', 'O', 'N']);
    assert.deepEqual((await inventory.items(db, to.id, { sort: 'bad; DROP TABLE x', dir: 'x' })).rows.map((r) => r.item_code), ['S', 'U', 'O', 'N'], 'unknown sort falls back to rank desc');
    assert.equal((await inventory.items(db, to.id, { office: 'BCVH Phú Lộc' })).total, 1);

    assert.deepEqual((await inventory.items(db, to.id, { levels: '≥4 ngày|<1 ngày' })).rows.map((r) => r.item_code).sort(), ['N', 'S', 'U']);
    assert.equal((await inventory.items(db, to.id, { levels: '≥4 ngày' })).total, 2, 'exact level');
    assert.equal((await inventory.items(db, to.id, { levels: ['≥1 ngày'], office: 'BCVH Phú Lộc' })).total, 1, 'exact level + office');
    assert.equal((await inventory.items(db, to.id, { limit: 5000 })).rows.length, 4, 'a large page is allowed (full view / export)');

    const ov = await inventory.overview(db, to.id);
    assert.ok(ov.by_office.every((r) => typeof r.cod_ge5 === 'number' && r.cod_ge5 <= r.cod), 'COD of the 5-day-and-more stock is part of the office COD');
    assert.ok(ov.by_office_level.every((r) => typeof r.cod === 'number'), 'each office/level group carries its COD sum');
    assert.equal(ov.total, 4);
    assert.equal(ov.ge5, 0);
    assert.equal(ov.by_office.find((o) => o.office === 'BCVH Phú Lộc').n, 1);
});

test('scheduler decides the due slot with catch-up window and retry back-off', () => {
    const at = (h, m) => new Date(2026, 9, 17, h, m);
    const none = new Set();
    assert.equal(dueSlot({ now: at(7, 29), stored: none }), null);
    assert.equal(dueSlot({ now: at(7, 30), stored: none }), '0730');
    assert.equal(dueSlot({ now: at(8, 0), stored: new Set(['2026-10-17|0730']) }), null);
    assert.equal(dueSlot({ now: at(7, 55), stored: none }), '0730', 'catch-up of a missed slot inside 30 minutes');
    assert.equal(dueSlot({ now: at(8, 0), stored: none }), '0730', 'exactly 30 minutes late is still caught up');
    assert.equal(dueSlot({ now: at(8, 1), stored: none }), null, 'older than the catch-up window');
    assert.equal(dueSlot({ now: at(9, 41), stored: none }), null, 'a restart at 09:41 must not label its data 07:30');
    assert.equal(dueSlot({ now: at(11, 50), stored: none }), '1130', 'the next slot is still taken when due');
    const attempt = { '2026-10-17|1130': at(11, 35).getTime() };
    assert.equal(dueSlot({ now: at(11, 40), stored: none, lastAttempt: attempt }), null);
    assert.equal(dueSlot({ now: at(11, 46), stored: none, lastAttempt: attempt }), '1130');
});

test('scheduler tick stores a snapshot once and logs a failure without throwing', async () => {
    const db = await makeDb();
    const quiet = { log() {}, error() {} };
    const ok = createScheduler({ db, fetchStock: async () => ({ rows: [row('A', '≥3 ngày')], portalTimestamp: 'T', count: 1 }), log: quiet });
    assert.equal((await ok.tick(new Date(2026, 9, 17, 21, 5))).keptRows, 1);
    assert.equal(await ok.tick(new Date(2026, 9, 17, 21, 6)), null, 'already stored');
    const bad = createScheduler({ db: await makeDb(), fetchStock: async () => { throw new Error('boom'); }, log: quiet });
    assert.equal(await bad.tick(new Date(2026, 9, 17, 7, 31)), null);
});

test('client: JSON login then data fetch; missing credentials and failed login are errors', async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
        calls.push([url, options.method || 'GET']);
        if (url.endsWith('/login')) {
            assert.deepEqual(JSON.parse(options.body), { username: 'u', password: 'p' });
            return { ok: true, status: 200, json: async () => ({ success: true }), headers: { getSetCookie: () => ['session=abc; Path=/; HttpOnly'] } };
        }
        assert.equal(options.headers.cookie, 'session=abc');
        return { ok: true, status: 200, json: async () => ({ data: [row('A', '≥3 ngày')], timestamp: 'TS', count: 1 }) };
    };
    const out = await fetchStockData({ credentials: { username: 'u', password: 'p' }, fetchImpl, baseUrl: 'https://x.test' });
    assert.equal(out.portalTimestamp, 'TS');
    assert.deepEqual(calls.map((c) => c[1]), ['POST', 'GET']);
    await assert.rejects(fetchStockData({ credentials: { username: '', password: '' }, fetchImpl }), /CREDENTIALS_MISSING/);
    const denied = async () => ({ ok: false, status: 401, json: async () => ({ success: false }), headers: { getSetCookie: () => [] } });
    await assert.rejects(fetchStockData({ credentials: { username: 'u', password: 'p' }, fetchImpl: denied }), /LOGIN_FAILED_401/);
});

test('items export: every row, Vietnamese headers, xlsx opens back, csv carries a BOM and quotes', () => {
    const rows = [
        { item_code: 'A1', office: 'BCVH Thuận Hóa', ton_level: '≥5 ngày', cod: 1000, reason: 'có, dấu phẩy "và" nháy' },
        { item_code: 'A2', office: 'BCVH Phú Lộc', ton_level: '<1 ngày', cod: null },
    ];
    const book = XLSX.read(buildItemsXlsx(rows), { type: 'buffer' });
    const sheet = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 });
    assert.equal(sheet.length, 3, 'header + 2 rows');
    assert.deepEqual(sheet[0].slice(0, 2), ['Số hiệu bưu gửi', 'Bưu cục phát']);
    assert.equal(sheet[1][0], 'A1');
    const csv = buildItemsCsv(rows);
    assert.equal(csv.charCodeAt(0), 0xFEFF);
    assert.match(csv, /"có, dấu phẩy ""và"" nháy"/);
    assert.equal(csv.split('\r\n').length, 3);
});

test('customer-group filter: overview, items and compare follow the selected groups; the group cards stay complete', async () => {
    const db = await makeDb();
    const kh = (c, level, cls, extra = {}) => row(c, level, { 'Phân Loại KH': cls, ...extra });
    const yesterday = [kh('R1', '≥5 ngày', 'KH Mới'), kh('U1', '≥3 ngày', 'KH Shopee'), kh('S1', '≥4 ngày', 'KH Thường'), kh('R2', '≥7 ngày', 'KH Thường')];
    const today = [kh('U1', '≥4 ngày', 'KH Shopee'), kh('S1', '≥4 ngày', 'KH Thường'), kh('N1', '≥5 ngày', 'KH Mới'), kh('N2', '<1 ngày', 'KH Tiktok')];
    await takeSnapshot({ db, fetchStock: async () => ({ rows: yesterday, portalTimestamp: 'Y', count: 4 }), slot: '0730', now: new Date(2026, 9, 16, 7, 30) });
    await takeSnapshot({ db, fetchStock: async () => ({ rows: today, portalTimestamp: 'Z', count: 4 }), slot: '0730', now: new Date(2026, 9, 17, 7, 30) });
    const to = await inventory.resolveSnapshot(db, {});
    const from = await inventory.resolveDefaultBase(db, to, {});

    const all = await inventory.overview(db, to.id);
    assert.equal(all.total, 4);
    const two = await inventory.overview(db, to.id, { customers: 'KH Mới|KH Shopee' });
    assert.equal(two.total, 2, 'only the two selected groups');
    assert.deepEqual([...new Set(two.by_level_customer.map((r) => r.customer_class))].sort(), ['KH Mới', 'KH Shopee']);
    assert.equal(two.by_customer.length, 4, 'selector cards list every group of the snapshot, not only the selected ones');
    assert.equal(two.by_customer.find((r) => r.customer_class === 'KH Mới').n_ge5, 1);
    assert.equal((await inventory.overview(db, to.id, { customers: ['KH Tiktok'] })).ge5, 0);

    assert.equal((await inventory.items(db, to.id, { customers: 'KH Thường' })).total, 1);
    assert.equal((await inventory.items(db, to.id, { customers: 'KH Mới|KH Tiktok', levels: '≥5 ngày' })).total, 1);

    const full = await inventory.compare(db, from.id, to.id, { detail: true });
    assert.deepEqual(full.summary, { resolved: 2, aged_up: 1, aged_down: 0, new: 2, unchanged: 1 });
    const moi = await inventory.compare(db, from.id, to.id, { detail: true, customers: 'KH Mới' });
    assert.deepEqual(moi.summary, { resolved: 1, aged_up: 0, aged_down: 0, new: 1, unchanged: 0 });
    assert.deepEqual(moi.resolved.map((r) => [r.item_code, r.customer_class]), [['R1', 'KH Mới']]);
    assert.deepEqual(moi.new.map((r) => r.item_code), ['N1']);
    const shopee = await inventory.compare(db, from.id, to.id, { customers: ['KH Shopee'] });
    assert.deepEqual(shopee.summary, { resolved: 0, aged_up: 1, aged_down: 0, new: 0, unchanged: 0 });
    const none = await inventory.compare(db, from.id, to.id, { customers: 'KH Không Có' });
    assert.deepEqual(none.summary, { resolved: 0, aged_up: 0, aged_down: 0, new: 0, unchanged: 0 });
});

test('COD of the stock aged 5 days and more is reported apart from the total COD (office and customer group)', async () => {
    const db = await makeDb();
    const kh = (c, level, cls, cod, office = 'BCVH Thuận Hóa') => row(c, level, { 'Phân Loại KH': cls, COD: cod, 'Bưu cục Phát': office });
    const rows = [kh('A', '<1 ngày', 'KH Mới', 100), kh('B', '≥5 ngày', 'KH Mới', 1000), kh('C', '≥14 ngày', 'KH Thường', 20), kh('D', '≥7 ngày', 'KH Thường', 5, 'BCVH Phú Lộc')];
    await takeSnapshot({ db, fetchStock: async () => ({ rows, portalTimestamp: 'T', count: 4 }), slot: '0730', now: new Date(2026, 9, 17, 7, 30) });
    const snap = await inventory.resolveSnapshot(db, {});
    const ov = await inventory.overview(db, snap.id);
    const office = (name) => ov.by_office.find((o) => o.office === name);
    assert.deepEqual([office('BCVH Thuận Hóa').cod, office('BCVH Thuận Hóa').cod_ge5], [1120, 1020]);
    assert.deepEqual([office('BCVH Phú Lộc').cod, office('BCVH Phú Lộc').cod_ge5], [5, 5]);
    const group = (name) => ov.by_customer.find((g) => g.customer_class === name);
    assert.deepEqual([group('KH Mới').cod, group('KH Mới').cod_ge5, group('KH Mới').n_ge5], [1100, 1000, 1]);
    assert.deepEqual([group('KH Thường').cod, group('KH Thường').cod_ge5], [25, 25]);
    const mixed = await inventory.overview(db, snap.id, { customers: 'KH Mới' });
    assert.equal(mixed.by_office.find((o) => o.office === 'BCVH Thuận Hóa').cod_ge5, 1000, 'office figures follow the selected groups');
    assert.equal(mixed.by_customer.length, 2, 'group cards stay complete');
});

// ---- Import Center: manual points, make-up, delete (PO 2026-10-27)
const importService = require('./src/services/hangtonInventory/hangtonImportService');
const scopeModule = require('./src/services/hangtonInventory/scope');
const express = require('express');
const createImportRouter = require('./src/routes/hangtonImportRoutes');

const oneRow = (code, level = '≥3 ngày') => row(code, level, { 'Phân Loại KH': 'KH Mới' });
const stock = (rows, ts = 'T') => async () => ({ rows, portalTimestamp: ts, count: rows.length });

test('slot helpers: manual slots, clock text, validity', () => {
    assert.equal(scopeModule.manualSlotFor(new Date(2026, 9, 27, 10, 45, 32)), 'M104532');
    assert.equal(scopeModule.isManualSlot('M104532'), true);
    assert.equal(scopeModule.isManualSlot('0730'), false);
    assert.equal(scopeModule.isManualSlot('M1045'), false);
    assert.equal(scopeModule.isValidSlot('1130'), true);
    assert.equal(scopeModule.isValidSlot('M000000'), true);
    assert.equal(scopeModule.isValidSlot('0900'), false);
    assert.equal(scopeModule.slotClock('M104532'), '10:45');
    assert.equal(scopeModule.slotClock('2100'), '21:00');
});

test('a manual point is an extra snapshot: it never replaces a scheduled slot, keeps the actor, and compares with the one right before it', async () => {
    const db = await makeDb();
    await takeSnapshot({ db, fetchStock: stock([oneRow('A'), oneRow('B')], 'T1'), slot: '0730', now: new Date(2026, 9, 27, 7, 30) });
    const manual = await importService.runManualSnapshot({ db, fetchStock: stock([oneRow('B'), oneRow('C'), oneRow('D')], 'T2'), actor: 'admin1', now: new Date(2026, 9, 27, 10, 45, 32) });
    assert.equal(manual.slot, 'M104532');
    const all = await db.all('SELECT slot, trigger, actor FROM hangton_snapshot ORDER BY id');
    assert.deepEqual(all.map((r) => [r.slot, r.trigger, r.actor]), [['0730', 'SCHEDULE', null], ['M104532', 'MANUAL', 'admin1']]);
    assert.equal((await db.all("SELECT * FROM hangton_snapshot_item WHERE snapshot_id = (SELECT id FROM hangton_snapshot WHERE slot = '0730')")).length, 2, '07:30 data untouched');

    const point = await inventory.resolveSnapshot(db, { id: manual.snapshotId });
    const base = await inventory.resolveDefaultBase(db, point, {});
    assert.equal(base.slot, '0730', 'the default base of a manual point is the snapshot right before it');
    const diff = await inventory.compare(db, base.id, point.id, { detail: true });
    assert.deepEqual(diff.summary, { resolved: 1, aged_up: 0, aged_down: 0, new: 2, unchanged: 1 });

    const list = await inventory.listSnapshots(db, {});
    assert.deepEqual(list.map((r) => r.slot), ['M104532', '0730'], 'listed by time of day, the manual point after the 07:30 slot');
    // a scheduled slot still compares with the same slot of the day before
    await takeSnapshot({ db, fetchStock: stock([oneRow('E')], 'T3'), slot: '0730', now: new Date(2026, 9, 28, 7, 30) });
    const next = await inventory.resolveSnapshot(db, { date: '2026-10-28', slot: '0730' });
    const nextBase = await inventory.resolveDefaultBase(db, next, {});
    assert.deepEqual([nextBase.business_date, nextBase.slot], ['2026-10-27', '0730']);
});

test('make-up fills a missed slot of today once, only when due, never overwrites; the real capture time is kept', async () => {
    const db = await makeDb();
    const at = (h, m) => new Date(2026, 9, 27, h, m);
    await assert.rejects(importService.runMakeupSnapshot({ db, fetchStock: stock([oneRow('A')]), slot: '1130', now: at(10, 0) }), /HANGTON_SLOT_NOT_DUE/);
    await assert.rejects(importService.runMakeupSnapshot({ db, fetchStock: stock([oneRow('A')]), slot: '0900', now: at(10, 0) }), /HANGTON_BAD_SLOT/);
    const made = await importService.runMakeupSnapshot({ db, fetchStock: stock([oneRow('A')]), slot: '0730', actor: 'admin1', now: at(9, 41) });
    assert.equal(made.slot, '0730');
    const stored = await db.get("SELECT * FROM hangton_snapshot WHERE slot = '0730'");
    assert.equal(stored.trigger, 'MAKEUP');
    assert.equal(stored.actor, 'admin1');
    assert.equal(stored.captured_at, at(9, 41).toISOString(), 'the label is the slot, the real time stays in captured_at');
    await assert.rejects(importService.runMakeupSnapshot({ db, fetchStock: stock([oneRow('B')]), slot: '0730', now: at(9, 50) }), /HANGTON_SLOT_EXISTS/);
    assert.equal((await db.all('SELECT * FROM hangton_snapshot_item')).length, 1, 'the first make-up is intact');
});

test('only extra points and make-ups can be deleted', async () => {
    const db = await makeDb();
    const t = (h) => new Date(2026, 9, 27, h, 5);
    await takeSnapshot({ db, fetchStock: stock([oneRow('A')]), slot: '0730', now: t(7), trigger: 'SCHEDULE' });
    const manual = await importService.runManualSnapshot({ db, fetchStock: stock([oneRow('B')]), now: t(10) });
    const makeup = await importService.runMakeupSnapshot({ db, fetchStock: stock([oneRow('C')]), slot: '1130', now: new Date(2026, 9, 27, 12, 0) });
    const scheduled = (await db.get("SELECT id FROM hangton_snapshot WHERE slot = '0730'")).id;
    await assert.rejects(importService.deleteExtraSnapshot(db, scheduled), /HANGTON_NOT_DELETABLE/);
    await assert.rejects(importService.deleteExtraSnapshot(db, 99999), /HANGTON_NOT_FOUND/);
    assert.deepEqual(await importService.deleteExtraSnapshot(db, manual.snapshotId), { id: manual.snapshotId, deleted: true });
    await importService.deleteExtraSnapshot(db, makeup.snapshotId);
    assert.equal((await db.all('SELECT * FROM hangton_snapshot')).length, 1);
    assert.equal((await db.all('SELECT * FROM hangton_snapshot_item')).length, 1, 'items of the deleted snapshots are gone, the scheduled ones stay');
});

test('status: three slots with OK / MISSED / WAITING, extra points, last 7 days only', async () => {
    const db = await makeDb();
    const day = (d, h, m = 0, s = 0) => new Date(2026, 9, d, h, m, s);
    await takeSnapshot({ db, fetchStock: stock([oneRow('OLD')]), slot: '0730', now: day(19, 7, 30) });
    await takeSnapshot({ db, fetchStock: stock([oneRow('X')]), slot: '0730', now: day(27, 7, 31) });
    await importService.runManualSnapshot({ db, fetchStock: stock([oneRow('Y')]), now: day(27, 9, 0, 0) });
    const status = await importService.importStatus(db, day(27, 13, 0));
    assert.equal(status.business_date, '2026-10-27');
    assert.deepEqual(status.slots.map((s) => [s.clock, s.state]), [['07:30', 'OK'], ['11:30', 'MISSED'], ['21:00', 'WAITING']]);
    assert.equal(status.slots[0].snapshot.kept_row_count, 1);
    assert.equal(status.extra.length, 1);
    assert.equal(status.extra[0].slot, 'M090000');
    assert.deepEqual([...new Set(status.recent.map((r) => r.business_date))], ['2026-10-27'], '10/19 is older than 7 days');
    assert.equal(status.busy, false);
});

test('one fetch at a time: a second caller gets HANGTON_BUSY, the lock is released afterwards, no interval or cap', async () => {
    const db = await makeDb();
    let release;
    const slow = () => new Promise((resolve) => { release = () => resolve({ rows: [oneRow('A')], portalTimestamp: 'T', count: 1 }); });
    const first = importService.runManualSnapshot({ db, fetchStock: slow, now: new Date(2026, 9, 27, 10, 0, 1) });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal((await importService.importStatus(db, new Date(2026, 9, 27, 10, 0, 2))).busy, true);
    await assert.rejects(importService.runManualSnapshot({ db, fetchStock: stock([oneRow('B')]), now: new Date(2026, 9, 27, 10, 0, 3) }), /HANGTON_BUSY/);
    release();
    await first;
    const again = await importService.runManualSnapshot({ db, fetchStock: stock([oneRow('C')]), now: new Date(2026, 9, 27, 10, 0, 4) });
    assert.equal(again.keptRows, 1, 'the next run is allowed right away');
});

test('import routes: status, manual point, make-up, delete, and readable errors', async () => {
    const db = await makeDb();
    const when = new Date(2026, 9, 27, 13, 0, 0);
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.auth = { user: { username: 'admin1' } }; next(); });
    app.use('/hangton', createImportRouter({ db, fetchStock: stock([oneRow('A'), oneRow('B')]), now: () => when }));
    const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/hangton`;
    const call = async (p, method = 'GET', body) => {
        const res = await fetch(base + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        return { status: res.status, json: await res.json() };
    };
    try {
        let r = await call('/status');
        assert.equal(r.status, 200);
        assert.deepEqual(r.json.data.slots.map((s) => s.state), ['MISSED', 'MISSED', 'WAITING']);
        r = await call('/snapshots', 'POST', { kind: 'MANUAL' });
        assert.equal(r.status, 200);
        assert.equal(r.json.data.keptRows, 2);
        const manualId = r.json.data.snapshotId;
        assert.equal((await db.get('SELECT actor FROM hangton_snapshot WHERE id = ?', [manualId])).actor, 'admin1', 'who pressed the button is recorded');
        r = await call('/snapshots', 'POST', { kind: 'MAKEUP', slot: '0730' });
        assert.equal(r.status, 200);
        r = await call('/snapshots', 'POST', { kind: 'MAKEUP', slot: '0730' });
        assert.equal(r.status, 409);
        assert.match(r.json.error.message, /đã có snapshot/);
        r = await call('/snapshots', 'POST', { kind: 'MAKEUP', slot: '2100' });
        assert.equal(r.status, 409);
        assert.match(r.json.error.message, /chưa đến/);
        r = await call('/snapshots', 'POST', { kind: 'NOPE' });
        assert.equal(r.status, 400);
        r = await call('/snapshots/' + (await db.get("SELECT id FROM hangton_snapshot WHERE slot = '0730'")).id, 'DELETE');
        assert.equal(r.status, 200, 'a make-up can be deleted');
        r = await call('/snapshots/' + manualId, 'DELETE');
        assert.equal(r.status, 200);
        r = await call('/snapshots/12345', 'DELETE');
        assert.equal(r.status, 404);
        await takeSnapshot({ db, fetchStock: stock([oneRow('S')]), slot: '1130', now: new Date(2026, 9, 27, 11, 30) });
        r = await call('/snapshots/' + (await db.get("SELECT id FROM hangton_snapshot WHERE slot = '1130'")).id, 'DELETE');
        assert.equal(r.status, 403);
        assert.match(r.json.error.message, /không xóa mốc của lịch/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
    const { describeError } = createImportRouter;
    assert.equal(describeError(new Error('HANGTON_LOGIN_FAILED_401'))[0], 502);
    assert.equal(describeError(new Error('HANGTON_CREDENTIALS_MISSING'))[0], 503);
    assert.equal(describeError(new Error('HANGTON_BUSY'))[0], 409);
});

test('migration adds the actor column to a table made before it existed', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hangton-old-')), 'old.sqlite');
    const raw = new sqlite3.Database(file);
    await new Promise((res, rej) => raw.exec("CREATE TABLE hangton_snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, business_date TEXT NOT NULL, slot TEXT NOT NULL, captured_at TEXT NOT NULL, portal_timestamp TEXT, source_row_count INTEGER NOT NULL DEFAULT 0, kept_row_count INTEGER NOT NULL DEFAULT 0, is_stale INTEGER NOT NULL DEFAULT 0, trigger TEXT NOT NULL DEFAULT 'SCHEDULE', UNIQUE (business_date, slot)); INSERT INTO hangton_snapshot (business_date, slot, captured_at) VALUES ('2026-10-17','0730','2026-10-17T00:30:00Z');", (e) => (e ? rej(e) : res())));
    await new Promise((res) => raw.close(res));
    await applyHangtonInventory01Schema(file);
    await applyHangtonInventory01Schema(file);
    const check = new sqlite3.Database(file);
    const cols = await new Promise((res, rej) => check.all('PRAGMA table_info(hangton_snapshot)', (e, r) => (e ? rej(e) : res(r))));
    const kept = await new Promise((res, rej) => check.get('SELECT COUNT(*) AS n FROM hangton_snapshot', (e, r) => (e ? rej(e) : res(r))));
    await new Promise((res) => check.close(res));
    assert.ok(cols.some((c) => c.name === 'actor'));
    assert.equal(kept.n, 1, 'existing snapshots are kept');
});
