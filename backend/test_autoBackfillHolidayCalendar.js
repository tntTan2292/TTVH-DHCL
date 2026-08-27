'use strict';

/**
 * AB-CALENDAR-01 -- LỊCH NGHỈ.
 *
 * Covers the holiday service itself, the coverage-scan overlay (including the
 * SUCCESS > exception > holiday precedence chain), the selectable API that
 * backs "Chọn tất cả chưa hoàn tất", and the R3 guarantee that a holiday never
 * reaches the coverage-exception tables.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { DEFAULT_PERMISSIONS, DEFAULT_RETRY_POLICY, createFilenameDateRule } = require('./src/services/importIndicatorRegistry');
const { AutoBackfillCoverageService } = require('./src/services/autoBackfillCoverageService');
const { AutoBackfillHolidayCalendarService } = require('./src/services/autoBackfillHolidayCalendarService');
const { AutoBackfillHolidayCalendarController } = require('./src/controllers/autoBackfillHolidayCalendarController');
const { AutoBackfillCoverageController } = require('./src/controllers/autoBackfillCoverageController');
const { AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL } = require('./migrate_auto_backfill_holiday_calendar_schema');

const APPROVED_CIRCUIT_SCOPE = Object.freeze({
    dimensions: ['adapter', 'source', 'resource'],
    threshold: 5,
    sameSignatureConsecutive: true,
    integrityFailureStopsImmediately: true,
});

function createLane({ code = 'HUE', priority = 10, targetTable = 'fact_f9_test', completionPolicy }) {
    return {
        code,
        priority,
        parser: () => ({ parsedData: [], totalParsed: 0 }),
        targetTable,
        completionPolicy,
        automationMode: 'MANUAL_ONLY',
        manualOnlyReason: 'PORTAL_ADAPTER_NOT_REGISTERED',
        portalAdapter: null,
        permissions: DEFAULT_PERMISSIONS,
        retryPolicy: DEFAULT_RETRY_POLICY,
        circuitScope: APPROVED_CIRCUIT_SCOPE,
    };
}

function createIndicator({ code = 'F9.TEST', startDate = '2026-01-01', priority = 10, lanes }) {
    const filenameDateRule = createFilenameDateRule({ id: `${code}_TEST_DATE`, prefix: code, parse: () => startDate });
    return {
        code,
        key: code,
        name: `${code} Test Indicator`,
        status: 'ACTIVE',
        priority,
        trackingStartDate: startDate,
        businessTimezone: 'Asia/Ho_Chi_Minh',
        folder: code,
        filenamePattern: /\.xlsx$/i,
        filenameDateRule,
        extractDate: filenameDateRule.parse,
        formatFilename: filenameDateRule.format,
        processedDir: path.join(os.tmpdir(), 'qis-ab-holiday-unused'),
        lanes,
    };
}

function createMapPolicy(statusByKey = new Map()) {
    return {
        id: 'F9_TEST_MAP_POLICY',
        async evaluate({ indicator, lane, businessDate }) {
            const key = `${indicator.code}|${lane.code}|${businessDate}`;
            const status = statusByKey.get(key) || 'MISSING';
            return { status, reason: status === 'SUCCESS' ? 'COMPLETE_EVIDENCE' : 'NO_IMPORT_EVIDENCE', evidence: { key } };
        },
    };
}

function createMemoryDb() {
    const raw = new sqlite3.Database(':memory:');
    return {
        run(sql, params = []) {
            return new Promise((resolve, reject) => raw.run(sql, params, function onRun(error) {
                if (error) reject(error);
                else resolve(this);
            }));
        },
        get(sql, params = []) {
            return new Promise((resolve, reject) => raw.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
        },
        all(sql, params = []) {
            return new Promise((resolve, reject) => raw.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
        },
        exec(sql) {
            return new Promise((resolve, reject) => raw.exec(sql, (error) => error ? reject(error) : resolve()));
        },
        close() {
            return new Promise((resolve, reject) => raw.close((error) => error ? reject(error) : resolve()));
        },
    };
}

const EXCEPTION_TABLES_SQL = `
CREATE TABLE auto_backfill_coverage_exception (
    id TEXT PRIMARY KEY, indicator TEXT NOT NULL, source_lane TEXT NOT NULL, business_date TEXT NOT NULL,
    exception_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', reason TEXT NOT NULL, evidence_json TEXT,
    registry_version TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
    revoked_by TEXT, revoked_at TEXT, revoke_reason TEXT
);
CREATE TABLE auto_backfill_coverage_exception_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT, exception_id TEXT NOT NULL, event_type TEXT NOT NULL, exception_type TEXT NOT NULL,
    indicator TEXT NOT NULL, source_lane TEXT NOT NULL, business_date TEXT NOT NULL, reason TEXT, evidence_json TEXT,
    actor TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

async function createFixture() {
    const db = createMemoryDb();
    await db.exec(AUTO_BACKFILL_HOLIDAY_CALENDAR_SCHEMA_SQL);
    await db.exec(EXCEPTION_TABLES_SQL);
    return db;
}

const markHoliday = (db, businessDate, reason = 'Nghỉ lễ') => new AutoBackfillHolidayCalendarService({
    db,
    clock: () => new Date('2026-02-01T00:00:00Z'),
}).create({ businessDate, reason, actor: 'admin' });

// --------------------------------------------------------------------------
// Holiday service
// --------------------------------------------------------------------------

test('AB-CAL-01 a holiday is recorded once per date with an append-only CREATED event', async () => {
    const db = await createFixture();
    try {
        const holiday = await markHoliday(db, '2026-01-02', 'Tết');
        assert.equal(holiday.business_date, '2026-01-02');
        assert.equal(holiday.status, 'ACTIVE');
        assert.equal(holiday.reason, 'Tết');
        assert.deepEqual(holiday.events.map((event) => event.event_type), ['CREATED']);

        await assert.rejects(
            markHoliday(db, '2026-01-02'),
            (error) => error.code === 'HOLIDAY_ALREADY_ACTIVE' && error.statusCode === 409,
        );
    } finally {
        await db.close();
    }
});

test('AB-CAL-02 a holiday is revoked, never hard-deleted, and the ledger keeps both events', async () => {
    const db = await createFixture();
    try {
        const service = new AutoBackfillHolidayCalendarService({ db, clock: () => new Date('2026-02-01T00:00:00Z') });
        const created = await service.create({ businessDate: '2026-01-02', reason: 'Nghỉ lễ', actor: 'admin' });
        const revoked = await service.revoke({ holidayId: created.id, reason: 'ghi nhầm ngày', actor: 'admin' });

        assert.equal(revoked.status, 'REVOKED');
        assert.equal(revoked.revoke_reason, 'ghi nhầm ngày');
        assert.deepEqual(revoked.events.map((event) => event.event_type), ['CREATED', 'REVOKED']);

        // The row survives revocation, and the same date can be marked again.
        const rows = await db.all('SELECT id, status FROM auto_backfill_holiday_calendar');
        assert.equal(rows.length, 1);
        const again = await service.create({ businessDate: '2026-01-02', reason: 'ghi lại', actor: 'admin' });
        assert.equal(again.status, 'ACTIVE');

        await assert.rejects(
            service.revoke({ holidayId: created.id, reason: 'lần hai', actor: 'admin' }),
            (error) => error.code === 'HOLIDAY_NOT_ACTIVE' && error.statusCode === 409,
        );
    } finally {
        await db.close();
    }
});

test('AB-CAL-03 reason, actor, date validity and future dates are all enforced', async () => {
    const db = await createFixture();
    try {
        const service = new AutoBackfillHolidayCalendarService({ db, clock: () => new Date('2026-02-01T00:00:00Z') });
        await assert.rejects(service.create({ businessDate: '2026-01-02', reason: '  ', actor: 'admin' }),
            (error) => error.code === 'HOLIDAY_REASON_REQUIRED');
        await assert.rejects(service.create({ businessDate: '2026-01-02', reason: 'x', actor: null }),
            (error) => error.code === 'HOLIDAY_ACTOR_REQUIRED');
        await assert.rejects(service.create({ businessDate: '02/01/2026', reason: 'x', actor: 'admin' }),
            (error) => error.code === 'INVALID_DATE');
        // Business clock is 2026-02-01 in Asia/Ho_Chi_Minh, so N-1 is 2026-01-31.
        await assert.rejects(service.create({ businessDate: '2026-02-05', reason: 'x', actor: 'admin' }),
            (error) => error.code === 'HOLIDAY_BUSINESS_DATE_IN_FUTURE');
        assert.equal((await service.create({ businessDate: '2026-01-31', reason: 'biên', actor: 'admin' })).status, 'ACTIVE');
    } finally {
        await db.close();
    }
});

test('AB-CAL-04 loadActiveHolidayMap degrades to an empty map when the db double has no .all', async () => {
    const service = new AutoBackfillHolidayCalendarService({ db: {} });
    const map = await service.loadActiveHolidayMap({ fromDate: '2026-01-01', toDate: '2026-01-31' });
    assert.equal(map.size, 0);
});

test('AB-CAL-05 loadActiveHolidayMap returns only ACTIVE rows inside the window', async () => {
    const db = await createFixture();
    try {
        const service = new AutoBackfillHolidayCalendarService({ db, clock: () => new Date('2026-02-01T00:00:00Z') });
        const revoked = await service.create({ businessDate: '2026-01-05', reason: 'sẽ thu hồi', actor: 'admin' });
        await service.revoke({ holidayId: revoked.id, reason: 'undo', actor: 'admin' });
        await service.create({ businessDate: '2026-01-10', reason: 'trong cửa sổ', actor: 'admin' });
        await service.create({ businessDate: '2026-01-25', reason: 'ngoài cửa sổ', actor: 'admin' });

        const map = await service.loadActiveHolidayMap({ fromDate: '2026-01-01', toDate: '2026-01-20' });
        assert.deepEqual([...map.keys()], ['2026-01-10']);
    } finally {
        await db.close();
    }
});

// --------------------------------------------------------------------------
// Coverage scan overlay
// --------------------------------------------------------------------------

async function scanWith(db, statuses, { asOf = '2026-01-05' } = {}) {
    const indicator = createIndicator({
        startDate: '2026-01-01',
        lanes: { HUE: createLane({ completionPolicy: createMapPolicy(statuses) }) },
    });
    const service = new AutoBackfillCoverageService({ db, registryProvider: () => [indicator] });
    return service.scan({ asOf, roles: ['admin'] });
}

const itemFor = (coverage, businessDate) => coverage.items.find((item) => item.business_date === businessDate);

test('AB-CAL-06 a holiday on a MISSING day is excluded from "còn thiếu" without changing status', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        const coverage = await scanWith(db, new Map());
        const holidayItem = itemFor(coverage, '2026-01-03');
        const normalItem = itemFor(coverage, '2026-01-02');

        assert.equal(holidayItem.holiday.reason, 'Nghỉ lễ');
        assert.equal(holidayItem.counts_as_missing, false);
        // The frozen 6-state model is untouched: the day still reports
        // TRUE_MISSING and still counts in the lane's TRUE_MISSING bucket.
        assert.equal(holidayItem.status, 'TRUE_MISSING');
        assert.equal(coverage.lanes[0].counts.TRUE_MISSING, 4);
        assert.equal(coverage.lanes[0].holiday_skipped_count, 1);
        assert.equal(coverage.holiday_skipped_total, 1);

        assert.equal(normalItem.holiday, null);
        assert.equal(normalItem.counts_as_missing, true);
    } finally {
        await db.close();
    }
});

test('AB-CAL-07 a holiday on a day that really has data is ignored entirely', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        const coverage = await scanWith(db, new Map([['F9.TEST|HUE|2026-01-03', 'SUCCESS']]));
        const item = itemFor(coverage, '2026-01-03');

        assert.equal(item.status, 'DATA_COMPLETE_WITH_EVIDENCE');
        assert.equal(item.holiday, null, 'real committed data must win over LỊCH NGHỈ');
        assert.equal(item.counts_as_missing, false);
        assert.equal(coverage.holiday_skipped_total, 0);
    } finally {
        await db.close();
    }
});

test('AB-CAL-08 a holiday never hides a day that needs manual review', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        const coverage = await scanWith(db, new Map([['F9.TEST|HUE|2026-01-03', 'MANUAL_REVIEW_REQUIRED']]));
        const item = itemFor(coverage, '2026-01-03');

        assert.equal(item.status, 'MANUAL_REVIEW_REQUIRED');
        assert.equal(item.holiday, null);
        assert.equal(item.counts_as_missing, true);
    } finally {
        await db.close();
    }
});

test('AB-CAL-09 an ACTIVE coverage exception outranks a holiday on the same day', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        await db.run(`INSERT INTO auto_backfill_coverage_exception
            (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
            VALUES ('exc-1', 'F9.TEST', 'HUE', '2026-01-03', 'PO_EXEMPTED', 'ACTIVE', 'PO xác nhận', 'test', 'admin', ?)`,
            [new Date().toISOString()]);

        const coverage = await scanWith(db, new Map());
        const item = itemFor(coverage, '2026-01-03');

        assert.equal(item.status, 'PO_EXEMPTED');
        assert.equal(item.exception.exception_type, 'PO_EXEMPTED');
        assert.equal(item.holiday, null, 'the audited exception must win over the calendar');
        assert.equal(item.counts_as_missing, false);
    } finally {
        await db.close();
    }
});

test('AB-CAL-10 a holiday does not change queue_eligible (PO decision 2, design R4)', async () => {
    const db = await createFixture();
    try {
        const before = await scanWith(db, new Map());
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        const after = await scanWith(db, new Map());

        const dispositions = (coverage) => coverage.items.map((item) => `${item.business_date}:${item.queue_eligible}:${item.queue_ineligible_reason}`);
        assert.deepEqual(dispositions(after), dispositions(before));
        assert.equal(after.runnable_portal_jobs, before.runnable_portal_jobs);
    } finally {
        await db.close();
    }
});

test('AB-CAL-11 R3: marking a holiday writes nothing to the coverage-exception tables', async () => {
    const db = await createFixture();
    try {
        const holiday = await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        await new AutoBackfillHolidayCalendarService({ db, clock: () => new Date('2026-02-01T00:00:00Z') })
            .revoke({ holidayId: holiday.id, reason: 'undo', actor: 'admin' });

        assert.equal((await db.get('SELECT COUNT(*) AS n FROM auto_backfill_coverage_exception')).n, 0);
        assert.equal((await db.get('SELECT COUNT(*) AS n FROM auto_backfill_coverage_exception_event')).n, 0);

        // Structural proof, not just a behavioral one: the holiday service
        // must not reach the exception service or its adapter-proof gate.
        // Comments are stripped first -- the design documentation legitimately
        // names the exception mechanism it is being kept away from.
        const source = require('fs').readFileSync(path.join(__dirname, 'src/services/autoBackfillHolidayCalendarService.js'), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '');
        assert.doesNotMatch(source, /auto_backfill_coverage_exception/);
        assert.doesNotMatch(source, /validateAdapterProof|VERIFIED_NO_DATA|CoverageExceptionService/);
    } finally {
        await db.close();
    }
});

test('AB-CAL-12 coverage still scans on a database that has not run the calendar migration', async () => {
    // LỊCH NGHỈ is additive to a coverage scan that predates it: a database
    // without the calendar table must scan normally with no holidays, never
    // break. This is what keeps the pre-existing coverage and exception suites
    // passing unmodified (design Section 7, R7).
    const db = createMemoryDb();
    try {
        await db.exec(EXCEPTION_TABLES_SQL);
        const coverage = await scanWith(db, new Map());
        assert.equal(coverage.total_items, 4);
        assert.equal(coverage.holiday_skipped_total, 0);
        assert.ok(coverage.items.every((item) => item.holiday === null && item.counts_as_missing === true));
    } finally {
        await db.close();
    }
});

test('AB-CAL-13 a database error other than the missing table is never swallowed', async () => {
    const service = new AutoBackfillHolidayCalendarService({
        db: { all: async () => { throw new Error('SQLITE_CORRUPT: database disk image is malformed'); } },
    });
    await assert.rejects(service.loadActiveHolidayMap({}), /SQLITE_CORRUPT/);
});

// --------------------------------------------------------------------------
// Selectable API -- "Chọn tất cả chưa hoàn tất"
// --------------------------------------------------------------------------

async function selectableWith(db, statuses, query) {
    const indicator = createIndicator({
        startDate: '2026-01-01',
        lanes: { HUE: createLane({ completionPolicy: createMapPolicy(statuses) }) },
    });
    const service = new AutoBackfillCoverageService({
        db,
        clock: () => new Date('2026-02-03T00:00:00Z'),
        registryProvider: () => [indicator],
    });
    return service.selectable({ roles: ['admin'], ...query });
}

test('AB-CAL-14 selectable returns every unfinished day of a month, minus holidays and exceptions', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        await db.run(`INSERT INTO auto_backfill_coverage_exception
            (id, indicator, source_lane, business_date, exception_type, status, reason, registry_version, created_by, created_at)
            VALUES ('exc-1', 'F9.TEST', 'HUE', '2026-01-04', 'PO_EXEMPTED', 'ACTIVE', 'PO xác nhận', 'test', 'admin', ?)`,
            [new Date().toISOString()]);

        const result = await selectableWith(db, new Map([['F9.TEST|HUE|2026-01-05', 'SUCCESS']]), { month: '2026-01' });

        assert.equal(result.month, '2026-01');
        assert.equal(result.total_candidates, 31, 'the whole month is in scope, not just one page');
        assert.equal(result.excluded_complete, 1);
        assert.deepEqual(result.excluded_holiday.map((row) => row.business_date), ['2026-01-03']);
        assert.deepEqual(result.excluded_exception.map((row) => row.business_date), ['2026-01-04']);

        const dates = result.items.map((item) => item.business_date);
        assert.equal(dates.length, 28);
        assert.ok(!dates.includes('2026-01-03'), 'holiday must not be selected');
        assert.ok(!dates.includes('2026-01-04'), 'exempted day must not be selected');
        assert.ok(!dates.includes('2026-01-05'), 'complete day must not be selected');
        assert.equal(result.items[0].key, `${result.items[0].indicator}|${result.items[0].source_lane}|${result.items[0].business_date}`);
    } finally {
        await db.close();
    }
});

test('AB-CAL-15 selectable scopes to one month and rejects a malformed month', async () => {
    const db = await createFixture();
    try {
        const february = await selectableWith(db, new Map(), { month: '2026-02' });
        assert.ok(february.items.every((item) => item.business_date.startsWith('2026-02-')));
        assert.deepEqual(february.items.map((item) => item.business_date), ['2026-02-02', '2026-02-01']);

        const everything = await selectableWith(db, new Map(), { month: null });
        assert.equal(everything.month, 'ALL');
        assert.equal(everything.total_candidates, 33);

        await assert.rejects(selectableWith(db, new Map(), { month: '01-2026' }),
            (error) => error.code === 'COVERAGE_MONTH_INVALID');
    } finally {
        await db.close();
    }
});

// --------------------------------------------------------------------------
// Controllers
// --------------------------------------------------------------------------

function createRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
    };
}

test('AB-CAL-16 the holiday controller creates, lists and revokes with the authenticated actor', async () => {
    const db = await createFixture();
    try {
        const controller = new AutoBackfillHolidayCalendarController({
            holidayCalendarService: new AutoBackfillHolidayCalendarService({ db, clock: () => new Date('2026-02-01T00:00:00Z') }),
        });
        const req = { auth: { user: { username: 'po-admin', role: 'admin' } }, body: { business_date: '2026-01-03', reason: 'Nghỉ lễ' }, query: {}, params: {} };

        const createRes_ = createRes();
        await controller.create(req, createRes_);
        assert.equal(createRes_.statusCode, 201);
        assert.equal(createRes_.body.data.created_by, 'po-admin');

        const listRes = createRes();
        await controller.list({ ...req, query: { status: 'ACTIVE' } }, listRes);
        assert.equal(listRes.statusCode, 200);
        assert.equal(listRes.body.data.total, 1);

        const revokeRes = createRes();
        await controller.revoke({ ...req, params: { holidayId: createRes_.body.data.id }, body: { reason: 'undo' } }, revokeRes);
        assert.equal(revokeRes.statusCode, 200);
        assert.equal(revokeRes.body.data.status, 'REVOKED');

        const missingReason = createRes();
        await controller.create({ ...req, body: { business_date: '2026-01-04' } }, missingReason);
        assert.equal(missingReason.statusCode, 400);
        assert.equal(missingReason.body.error.code, 'HOLIDAY_REASON_REQUIRED');
    } finally {
        await db.close();
    }
});

test('AB-CAL-17 the coverage controller exposes selectable and surfaces its errors', async () => {
    const db = await createFixture();
    try {
        await markHoliday(db, '2026-01-03', 'Nghỉ lễ');
        const indicator = createIndicator({ startDate: '2026-01-01', lanes: { HUE: createLane({ completionPolicy: createMapPolicy() }) } });
        const controller = new AutoBackfillCoverageController({
            coverageService: new AutoBackfillCoverageService({
                db,
                clock: () => new Date('2026-02-03T00:00:00Z'),
                registryProvider: () => [indicator],
            }),
        });
        const auth = { user: { username: 'po-admin', role: 'admin' } };

        const okRes = createRes();
        await controller.getSelectable({ auth, query: { month: '2026-01' } }, okRes);
        assert.equal(okRes.statusCode, 200);
        assert.equal(okRes.body.success, true);
        assert.equal(okRes.body.data.excluded_holiday.length, 1);
        assert.ok(!okRes.body.data.items.some((item) => item.business_date === '2026-01-03'));

        const badRes = createRes();
        await controller.getSelectable({ auth, query: { month: 'thang-1' } }, badRes);
        assert.equal(badRes.statusCode, 400);
        assert.equal(badRes.body.error.code, 'COVERAGE_MONTH_INVALID');
    } finally {
        await db.close();
    }
});
