'use strict';

// IMPORT-DAILYLOG-01 -- the "Log ngày mới" picture of a business day.
// Run per file: node --test --experimental-sqlite test_importDailyLogService.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

const { ImportDailyLogService, vietnamDayUtcBounds } = require('./src/services/importDailyLogService');

const DAY = '2026-10-22';
const NOW = new Date('2026-10-22T04:00:00Z'); // 11:00 Vietnam time
const INDICATORS = [{ code: 'F1.3', label: 'F1.3' }, { code: 'F4.1', label: 'F4.1' }];
const WINDOW = ['2026-10-21', '2026-10-20', '2026-10-19'];

function makeDb() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(`
        CREATE TABLE auto_backfill_run (id TEXT PRIMARY KEY, as_of_business_date TEXT, requested_by TEXT, requested_lane TEXT, status TEXT, status_reason TEXT, created_at TEXT, ended_at TEXT);
        CREATE TABLE auto_backfill_job (id TEXT PRIMARY KEY, run_id TEXT, indicator TEXT, source_lane TEXT, business_date TEXT, state TEXT, safety_state TEXT, terminal_reason TEXT, force_reimport INTEGER DEFAULT 0, created_at TEXT, ended_at TEXT);
        CREATE TABLE auto_backfill_attempt (id TEXT PRIMARY KEY, job_id TEXT, attempt_number INTEGER, result_code TEXT, error_signature TEXT, classification TEXT, action_required TEXT);
        CREATE TABLE import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT, ngay_do_kiem TEXT, indicator TEXT, source_lane TEXT, trigger_source TEXT DEFAULT 'AUTO', created_at TEXT, status TEXT, total_records INTEGER DEFAULT 0, error_records INTEGER DEFAULT 0, skipped_records INTEGER DEFAULT 0, actor TEXT, import_mode TEXT);
    `);
    let jobSeq = 0;
    const api = {
        sqlite,
        all: async (sql, params = []) => sqlite.prepare(sql).all(...params).map((row) => ({ ...row })),
        get: async (sql, params = []) => {
            const row = sqlite.prepare(sql).get(...params);
            return row ? { ...row } : undefined;
        },
        run(id, { by = 'scheduler', status = 'COMPLETED', at = '2026-10-22T00:30:00.000Z' } = {}) {
            sqlite.prepare('INSERT INTO auto_backfill_run VALUES (?,?,?,?,?,?,?,?)').run(id, DAY, by, null, status, null, at, at);
        },
        job(runId, indicator, lane, date, state, extra = {}) {
            jobSeq += 1;
            const id = `job-${jobSeq}`;
            const at = extra.at || `2026-10-22T00:3${jobSeq % 10}:00.000Z`;
            sqlite.prepare('INSERT INTO auto_backfill_job (id, run_id, indicator, source_lane, business_date, state, safety_state, terminal_reason, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
                .run(id, runId, indicator, lane, date, state, extra.safety || null, extra.reason || null, at);
            return id;
        },
        importLog(row) {
            sqlite.prepare('INSERT INTO import_log (file_name, ngay_do_kiem, indicator, source_lane, trigger_source, created_at, status, error_records, actor, import_mode) VALUES (?,?,?,?,?,?,?,?,?,?)')
                .run(row.file || 'f.xlsx', row.date, row.indicator || 'F1.3', row.lane || 'HUE', row.trigger || 'AUTO', row.at || '2026-10-22 00:40:00', row.status || 'SUCCESS', row.errors || 0, row.actor || null, row.mode || null);
        }
    };
    return api;
}

function fillAllOk(db, runId = 'run-1') {
    db.run(runId);
    for (const indicator of INDICATORS) for (const lane of ['HUE', 'TCT']) for (const date of WINDOW) db.job(runId, indicator.code, lane, date, 'SUCCESS');
}

const DONE_CYCLE = { day: DAY, slot: '07:30', attempts: 1, done: true, lastSummary: 'all lanes imported after 1 attempt(s)' };

function makeService(db, { cycle = DONE_CYCLE, enabled = true, sessions = {}, now = NOW } = {}) {
    const scheduler = {
        recentDays: () => 3,
        lanes: () => ['HUE', 'TCT'],
        times: () => ['07:30'],
        isEnabled: () => enabled,
        maxAttempts: () => 16,
        retryMs: () => 3600000,
        readState: () => ({ fired: {}, cycle })
    };
    const sessionService = {
        getSessionStatus: async (source) => ({ status: 'SESSION_VALID', ...(sessions[source] || {}) })
    };
    return new ImportDailyLogService({ db, scheduler, sessionService, indicators: INDICATORS, clock: () => now });
}

const cellOf = (data, indicator, lane, date) => data.grid.find((row) => row.indicator === indicator && row.lane === lane).days.find((c) => c.date === date);

test('a full day: every cell OK, verdict COMPLETE, nothing to do', async () => {
    const db = makeDb();
    fillAllOk(db);
    const data = await makeService(db, { cycle: { day: DAY, slot: '07:30', attempts: 1, done: true, lastSummary: 'all lanes imported after 1 attempt(s)' } }).build({ date: DAY });
    assert.equal(data.summary.expected, 12);
    assert.equal(data.summary.OK, 12);
    assert.equal(data.summary.verdict, 'COMPLETE');
    assert.deepEqual(data.window.days, WINDOW);
    assert.equal(data.window.new_day, '2026-10-21');
    assert.deepEqual(data.attention, []);
    assert.equal(data.runs.length, 1);
    assert.equal(data.runs[0].job_counts.SUCCESS, 12);
});

test('a failed job is FAILED with its reason, and a later success of the same day clears it', async () => {
    const db = makeDb();
    db.run('run-1');
    for (const indicator of INDICATORS) for (const lane of ['HUE', 'TCT']) for (const date of WINDOW) {
        if (indicator.code === 'F4.1' && lane === 'TCT' && date === '2026-10-21') {
            const id = db.job('run-1', 'F4.1', 'TCT', date, 'FAILED_TERMINAL', { reason: 'F41_TCT_EXPORT_FAILED', at: '2026-10-22T00:31:00.000Z' });
            db.sqlite.prepare('INSERT INTO auto_backfill_attempt VALUES (?,?,?,?,?,?,?)').run('a1', id, 1, 'ERR', 'EXPORT_TIMEOUT', 'TRANSIENT', 'RETRY_LATER');
        } else {
            db.job('run-1', indicator.code, lane, date, 'SUCCESS');
        }
    }
    const service = makeService(db, { cycle: { day: DAY, slot: '07:30', attempts: 1, done: false, nextAttemptAt: Date.parse('2026-10-22T01:30:00Z'), lastSummary: 'retry needed' } });
    const failed = await service.build({ date: DAY });
    const cell = cellOf(failed, 'F4.1', 'TCT', '2026-10-21');
    assert.equal(cell.state, 'FAILED');
    assert.equal(cell.reason, 'F41_TCT_EXPORT_FAILED');
    assert.equal(cell.detail, 'EXPORT_TIMEOUT');
    assert.equal(failed.summary.FAILED, 1);
    assert.equal(failed.summary.verdict, 'ATTENTION');
    assert.equal(failed.attention[0].code, 'CELL_FAILED');
    assert.equal(failed.attention[0].severity, 'high');

    db.run('run-2', { at: '2026-10-22T01:31:00.000Z' });
    db.job('run-2', 'F4.1', 'TCT', '2026-10-21', 'SUCCESS', { at: '2026-10-22T01:32:00.000Z' });
    const fixed = await service.build({ date: DAY });
    assert.equal(cellOf(fixed, 'F4.1', 'TCT', '2026-10-21').state, 'OK');
    assert.equal(fixed.summary.FAILED, 0);
});

test('waiting for login, running and queued cells; an unfinished day is IN_PROGRESS unless something needs the PO', async () => {
    const db = makeDb();
    db.run('run-1', { status: 'RUNNING' });
    db.job('run-1', 'F1.3', 'HUE', '2026-10-21', 'RUNNING');
    db.job('run-1', 'F1.3', 'HUE', '2026-10-20', 'QUEUED');
    db.job('run-1', 'F1.3', 'TCT', '2026-10-21', 'QUEUED', { safety: 'WAITING_AUTH' });
    const data = await makeService(db).build({ date: DAY });
    assert.equal(cellOf(data, 'F1.3', 'HUE', '2026-10-21').state, 'RUNNING');
    assert.equal(cellOf(data, 'F1.3', 'HUE', '2026-10-20').state, 'QUEUED');
    assert.equal(cellOf(data, 'F1.3', 'TCT', '2026-10-21').state, 'WAITING_AUTH');
    assert.ok(data.attention.some((item) => item.code === 'CELL_WAITING_AUTH' && item.severity === 'high'));
    assert.equal(data.summary.verdict, 'ATTENTION');

    const quiet = makeDb();
    quiet.run('run-1', { status: 'RUNNING' });
    for (const indicator of INDICATORS) for (const lane of ['HUE', 'TCT']) for (const date of WINDOW) quiet.job('run-1', indicator.code, lane, date, 'SUCCESS');
    quiet.sqlite.prepare("UPDATE auto_backfill_job SET state = 'RUNNING' WHERE rowid = 1").run();
    const running = await makeService(quiet).build({ date: DAY });
    assert.equal(running.summary.RUNNING, 1);
    assert.equal(running.summary.verdict, 'IN_PROGRESS');
});

test('a cell with no job takes the import log: data present is OK, nothing is MISSING', async () => {
    const db = makeDb();
    db.run('run-1');
    for (const indicator of INDICATORS) for (const lane of ['HUE', 'TCT']) for (const date of WINDOW) {
        if (!(indicator.code === 'F1.3' && lane === 'HUE' && date === '2026-10-19') && !(indicator.code === 'F4.1' && lane === 'TCT' && date === '2026-10-20')) {
            db.job('run-1', indicator.code, lane, date, 'SUCCESS');
        }
    }
    db.importLog({ date: '2026-10-19', indicator: 'F1.3', lane: 'HUE', status: 'SUCCESS', at: '2026-10-21 03:00:00' });
    const data = await makeService(db).build({ date: DAY });
    assert.equal(cellOf(data, 'F1.3', 'HUE', '2026-10-19').state, 'OK');
    assert.equal(cellOf(data, 'F1.3', 'HUE', '2026-10-19').reason, 'NO_JOB_TODAY_DATA_PRESENT');
    assert.equal(cellOf(data, 'F4.1', 'TCT', '2026-10-20').state, 'MISSING');
    assert.equal(data.summary.verdict, 'INCOMPLETE');
    assert.ok(data.attention.some((item) => item.code === 'CELL_MISSING' && item.severity === 'medium'));
});

test('scheduler: gave up and overdue are high, a retry in progress is medium; bad sessions are flagged for today only', async () => {
    const db = makeDb();
    fillAllOk(db);
    const gaveUp = await makeService(db, { cycle: { day: DAY, slot: '07:30', attempts: 16, done: true, lastSummary: 'gave up after 16 attempts' } }).build({ date: DAY });
    assert.ok(gaveUp.attention.some((item) => item.code === 'SCHEDULE_GAVE_UP'));
    assert.equal(gaveUp.summary.verdict, 'ATTENTION');

    const retrying = await makeService(db, { cycle: { day: DAY, slot: '07:30', attempts: 3, done: false, nextAttemptAt: Date.parse('2026-10-22T05:00:00Z'), lastSummary: 'retry needed' } }).build({ date: DAY });
    const retryItem = retrying.attention.find((item) => item.code === 'SCHEDULE_RETRYING');
    assert.equal(retryItem.severity, 'medium');
    assert.equal(retrying.scheduler.cycle.next_attempt_at, '2026-10-22T05:00:00.000Z');

    // 11:00 and no cycle for today although the schedule is on and 07:30 is long past
    const overdue = await makeService(db, { cycle: null }).build({ date: DAY });
    assert.equal(overdue.scheduler.overdue, true);
    assert.ok(overdue.attention.some((item) => item.code === 'SCHEDULE_NOT_STARTED'));
    // before the slot there is nothing overdue
    const early = await makeService(db, { cycle: null, now: new Date('2026-10-21T22:00:00Z') }).build({ date: DAY });
    assert.equal(early.scheduler.overdue, false);
    // schedule switched off: nothing is overdue
    assert.equal((await makeService(db, { cycle: null, enabled: false }).build({ date: DAY })).scheduler.overdue, false);

    const sessions = { TCT: { status: 'DISCONNECTED', disconnected: true } };
    const today = await makeService(db, { cycle: { day: DAY, slot: '07:30', attempts: 1, done: true, lastSummary: 'ok' }, sessions }).build({ date: DAY });
    assert.ok(today.attention.some((item) => item.code === 'SESSION_NOT_READY' && item.source === 'TCT'));
    const past = await makeService(db, { sessions }).build({ date: '2026-10-21' });
    assert.ok(!past.attention.some((item) => item.code === 'SESSION_NOT_READY'), 'a past day does not flag today\'s session');
});

test('old failed days are grouped, kept apart from the grid, and dropped once a later job succeeded', async () => {
    const db = makeDb();
    fillAllOk(db);
    db.run('run-old');
    db.job('run-old', 'F1.2', 'TCT', '2026-02-15', 'FAILED_TERMINAL', { reason: 'QUEUE_EXECUTION_ERROR', at: '2026-10-22T00:40:00.000Z' });
    db.job('run-old', 'F1.2', 'TCT', '2026-02-16', 'FAILED_TERMINAL', { reason: 'QUEUE_EXECUTION_ERROR', at: '2026-10-22T00:40:01.000Z' });
    db.job('run-old', 'F1.1', 'HUE', '2026-01-08', 'FAILED_TERMINAL', { reason: 'F11_HUE_RECONCILIATION_FAILED', at: '2026-10-22T00:40:02.000Z' });
    db.run('run-later', { at: '2026-10-22T02:00:00.000Z' });
    db.job('run-later', 'F1.1', 'HUE', '2026-01-08', 'SUCCESS', { at: '2026-10-22T02:01:00.000Z' });

    const data = await makeService(db).build({ date: DAY });
    assert.equal(data.summary.verdict, 'COMPLETE', 'old failures never turn the day red');
    assert.equal(data.old_failures.length, 1);
    assert.deepEqual(
        { indicator: data.old_failures[0].indicator, lane: data.old_failures[0].lane, count: data.old_failures[0].count, first: data.old_failures[0].first_date, last: data.old_failures[0].last_date },
        { indicator: 'F1.2', lane: 'TCT', count: 2, first: '2026-02-15', last: '2026-02-16' }
    );
    const low = data.attention.find((item) => item.code === 'OLD_FAILURES');
    assert.equal(low.severity, 'low');
});

test('imports of the day: a failed file not yet re-imported needs the PO, a re-imported one does not; scheduler imports are left out', async () => {
    const db = makeDb();
    fillAllOk(db);
    // 2026-10-22 03:00 UTC = 10:00 Vietnam, inside business day 2026-10-22
    db.importLog({ file: 'F1.3-bad.xlsx', date: '2026-10-21', status: 'FAILED', errors: 10, actor: 'admin', at: '2026-10-22 03:00:00', trigger: 'MANUAL' });
    db.importLog({ file: 'F4.1-bad.xlsx', date: '2026-10-20', indicator: 'F4.1', status: 'FAILED', actor: 'admin', at: '2026-10-22 03:05:00', trigger: 'MANUAL' });
    db.importLog({ file: 'F4.1-good.xlsx', date: '2026-10-20', indicator: 'F4.1', status: 'SUCCESS', actor: 'admin', at: '2026-10-22 03:20:00', trigger: 'MANUAL' });
    db.importLog({ file: 'sched.xlsx', date: '2026-10-21', lane: 'TCT', status: 'SUCCESS', actor: 'scheduler', at: '2026-10-22 00:30:00', trigger: 'DKCL_HUE_SYNC' });
    db.importLog({ file: 'yesterday.xlsx', date: '2026-10-20', status: 'FAILED', actor: 'admin', at: '2026-10-21 03:00:00', trigger: 'MANUAL' });

    const data = await makeService(db).build({ date: DAY });
    const names = data.manual_imports.map((row) => row.file_name).sort();
    assert.deepEqual(names, ['F1.3-bad.xlsx', 'F4.1-bad.xlsx', 'F4.1-good.xlsx']);
    const unresolved = data.attention.filter((item) => item.code === 'FILE_IMPORT_FAILED');
    assert.equal(unresolved.length, 1);
    assert.match(unresolved[0].message, /F1\.3-bad\.xlsx/);
    assert.equal(data.manual_imports.find((row) => row.file_name === 'F4.1-bad.xlsx').resolved, true);
});

test('vietnamDayUtcBounds and an invalid date', async () => {
    assert.deepEqual(vietnamDayUtcBounds('2026-10-22'), { start: '2026-10-21 17:00:00', end: '2026-10-22 17:00:00' });
    const db = makeDb();
    await assert.rejects(() => makeService(db).build({ date: '22/10/2026' }), (error) => error.code === 'INVALID_DATE');
    const empty = await makeService(db).build({});
    assert.equal(empty.as_of, DAY, 'defaults to today in Vietnam time');
    assert.equal(empty.summary.OK, 0);
    assert.equal(empty.summary.MISSING, 12);
});
