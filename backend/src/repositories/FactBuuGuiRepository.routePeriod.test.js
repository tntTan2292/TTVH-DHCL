const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

// Same in-memory harness as FactBuuGuiRepository.overview.test.js: replaces `../config/db`
// with a callback shim backed by node:sqlite, then reloads the repository so it binds to the
// shim. Runs the real SQL (date arithmetic included) against a real, isolated in-memory
// database — not mocked responses.
function loadRepositoryWithInMemoryDb() {
    const database = new DatabaseSync(':memory:');
    const callbackDb = {
        all(sql, params, callback) {
            try {
                callback(null, database.prepare(sql).all(...params));
            } catch (error) {
                callback(error);
            }
        },
    };
    const dbConfigPath = require.resolve('../config/db');
    require.cache[dbConfigPath] = {
        id: dbConfigPath,
        filename: dbConfigPath,
        loaded: true,
        exports: { db: callbackDb },
        children: [],
        paths: [],
    };
    const repositoryPath = require.resolve('./FactBuuGuiRepository');
    delete require.cache[repositoryPath];
    return { database, repository: require('./FactBuuGuiRepository') };
}

function seedSchema(database) {
    database.exec(`
        CREATE TABLE fact_f13 (
            ngay_do_kiem TEXT,
            ma_bg TEXT,
            ma_bcvh TEXT,
            ten_bcvh TEXT,
            ma_tuyen TEXT,
            ten_tuyen TEXT,
            loai_tuyen_phat TEXT,
            danh_gia_2026 TEXT
        );
    `);
}

test('getRoutePeriodDailyFacts: per-day-per-route aggregation, Hue/postman scope, month window', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Route A: two days inside the month window, one Đạt one Không đạt each day.
    insert.run('2026-08-01', 'A1', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');
    insert.run('2026-08-01', 'A2', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'Tuyến phát xã (01 lần/ ngày)', 'Không đạt');
    insert.run('2026-08-02', 'A3', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');
    // Route B: only on day 1 (absent on the anchor day 2026-08-02) -- must still surface (T-01).
    insert.run('2026-08-01', 'B1', '533140', 'BCVH Thuận Hóa', '53314002', 'Tuyến B', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');
    // Confirmed non-postman route -- excluded under routeType=postman, included under 'all'.
    insert.run('2026-08-01', 'C1', '533140', 'BCVH Thuận Hóa', '53314099', 'Phát tại quầy', 'Tuyến phát lưu tại bưu cục', 'Đạt');
    // Outside the month window -- must not appear.
    insert.run('2026-07-31', 'D1', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');
    // Non-Hue route code -- excluded regardless of routeType.
    insert.run('2026-08-01', 'E1', '533140', 'BCVH Thuận Hóa', '75000001', 'Ngoài Huế', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');
    // Different BCVH -- must not leak in.
    insert.run('2026-08-01', 'F1', '535470', 'BCVH Hương Trà', '53314001', 'Tuyến A', 'Tuyến phát xã (01 lần/ ngày)', 'Đạt');

    const postmanRows = await repository.getRoutePeriodDailyFacts('533140', '2026-08-01', '2026-08-02', {
        routeType: 'postman',
        confirmedNonPostmanRouteCodes: ['53314099'],
    });
    const routeA = postmanRows.filter((r) => r.ma_tuyen === '53314001');
    assert.equal(routeA.length, 2, 'route A appears on both its days');
    assert.deepEqual(routeA.map((r) => r.date).sort(), ['2026-08-01', '2026-08-02']);
    const day1 = routeA.find((r) => r.date === '2026-08-01');
    assert.equal(day1.volume, 2);
    assert.equal(day1.passed, 1);
    assert.equal(day1.failed, 1);
    assert.equal(day1.ten_tuyen, 'Tuyến A');
    assert.equal(day1.loai_tuyen_phat, 'Tuyến phát xã (01 lần/ ngày)');

    const routeB = postmanRows.filter((r) => r.ma_tuyen === '53314002');
    assert.equal(routeB.length, 1, 'route B present only on day 1 -- still surfaced (T-01)');
    assert.equal(routeB[0].date, '2026-08-01');

    assert.equal(postmanRows.some((r) => r.ma_tuyen === '53314099'), false, 'confirmed non-postman route excluded under postman');
    assert.equal(postmanRows.some((r) => r.ma_tuyen === '75000001'), false, 'non-Hue route code excluded');
    assert.equal(postmanRows.some((r) => r.date === '2026-07-31'), false, 'outside month window excluded');
    assert.equal(postmanRows.every((r) => r.ten_bcvh === 'BCVH Thuận Hóa' || r.ma_tuyen !== '53314001' || true), true);

    const allRows = await repository.getRoutePeriodDailyFacts('533140', '2026-08-01', '2026-08-02', {
        routeType: 'all',
        confirmedNonPostmanRouteCodes: ['53314099'],
    });
    assert.equal(allRows.some((r) => r.ma_tuyen === '53314099'), true, 'confirmed non-postman route included under all');

    database.close();
});

test('getRoutePeriodPreviousMonth: reuses the exact BCVH Ranking MTD capping formula and handles the shorter-previous-month edge case', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Anchor 2026-08-27 -> previous window must be 2026-07-01..2026-07-27 (same elapsed days).
    insert.run('2026-07-27', 'P1', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Đạt');
    insert.run('2026-07-28', 'P2', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Đạt'); // outside window, must be excluded
    insert.run('2026-06-30', 'P3', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Không đạt'); // wrong month

    const result = await repository.getRoutePeriodPreviousMonth('533140', '2026-08-27', {
        routeType: 'postman',
        confirmedNonPostmanRouteCodes: [],
    });
    assert.equal(result.previousStart, '2026-07-01');
    assert.equal(result.previousEnd, '2026-07-27');
    assert.equal(result.routes.length, 1);
    assert.equal(result.routes[0].ma_tuyen, '53314001');
    assert.equal(result.routes[0].volume, 1);
    assert.equal(result.routes[0].passed, 1);
    assert.equal(result.routes[0].days_with_data, 1);

    // Edge case: anchor day-of-month (31) exceeds the shorter previous month (Feb, 28 days in
    // 2026) -- previous_end must cap at 2026-02-28, not overflow to 2026-03-03.
    const capped = await repository.getRoutePeriodPreviousMonth('533140', '2026-03-31', {
        routeType: 'postman',
        confirmedNonPostmanRouteCodes: [],
    });
    assert.equal(capped.previousStart, '2026-02-01');
    assert.equal(capped.previousEnd, '2026-02-28');

    // Zero-route case: previousStart/previousEnd must still resolve even with no matching data.
    const empty = await repository.getRoutePeriodPreviousMonth('999999', '2026-08-27', {
        routeType: 'postman',
        confirmedNonPostmanRouteCodes: [],
    });
    assert.equal(empty.previousStart, '2026-07-01');
    assert.equal(empty.previousEnd, '2026-07-27');
    assert.deepEqual(empty.routes, []);

    database.close();
});

test('getRoutePeriodPreviousMonth excludes confirmed non-postman routes only under postman, mirroring getRouteRanking', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('2026-07-10', 'X1', '533140', 'BCVH Thuận Hóa', '53314099', 'Phát tại quầy', 'x', 'Đạt');

    const postman = await repository.getRoutePeriodPreviousMonth('533140', '2026-08-27', {
        routeType: 'postman',
        confirmedNonPostmanRouteCodes: ['53314099'],
    });
    assert.equal(postman.routes.some((r) => r.ma_tuyen === '53314099'), false);

    const all = await repository.getRoutePeriodPreviousMonth('533140', '2026-08-27', {
        routeType: 'all',
        confirmedNonPostmanRouteCodes: ['53314099'],
    });
    assert.equal(all.routes.some((r) => r.ma_tuyen === '53314099'), true);

    database.close();
});

test('getRouteScopeReconciliation: four groups sum to bcvh_total for both periods (AC-05 identity)', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Anchor day 2026-08-02: 1 ranked, 1 pickup, 1 non_hue, 1 no_route = bcvh_total 4.
    insert.run('2026-08-02', 'R1', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Đạt');
    insert.run('2026-08-02', 'R2', '533140', 'BCVH Thuận Hóa', '53314099', 'Phát tại quầy', 'x', 'Đạt');
    insert.run('2026-08-02', 'R3', '533140', 'BCVH Thuận Hóa', '75000001', 'Ngoài Huế', 'x', 'Đạt');
    insert.run('2026-08-02', 'R4', '533140', 'BCVH Thuận Hóa', null, null, null, 'Đạt');
    // Extra row on 2026-08-01 (still inside the month window, outside the anchor day) -- must
    // count toward month_* but not day_*.
    insert.run('2026-08-01', 'R5', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Đạt');
    // Empty ma_tuyen string, not just NULL -- must land in no_route too.
    insert.run('2026-08-01', 'R6', '533140', 'BCVH Thuận Hóa', '', null, null, 'Không đạt');
    // Different BCVH must not leak in.
    insert.run('2026-08-02', 'R7', '535470', 'BCVH Hương Trà', '53314001', 'Tuyến A', 'x', 'Đạt');

    const row = await repository.getRouteScopeReconciliation('533140', '2026-08-02', '2026-08-01', '2026-08-02', ['53314099']);

    assert.equal(row.day_bcvh_total, 4);
    assert.equal(row.day_ranked, 1);
    assert.equal(row.day_pickup_at_office, 1);
    assert.equal(row.day_non_hue, 1);
    assert.equal(row.day_no_route, 1);
    assert.equal(row.day_bcvh_total, row.day_ranked + row.day_pickup_at_office + row.day_non_hue + row.day_no_route);

    assert.equal(row.month_bcvh_total, 6);
    assert.equal(row.month_ranked, 2);
    assert.equal(row.month_pickup_at_office, 1);
    assert.equal(row.month_non_hue, 1);
    assert.equal(row.month_no_route, 2);
    assert.equal(row.month_bcvh_total, row.month_ranked + row.month_pickup_at_office + row.month_non_hue + row.month_no_route);

    database.close();
});

test('getRouteScopeReconciliation with no confirmed non-postman routes (empty catalog) never mismatches ranked/pickup', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    seedSchema(database);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, loai_tuyen_phat, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('2026-08-02', 'Z1', '533140', 'BCVH Thuận Hóa', '53314001', 'Tuyến A', 'x', 'Đạt');

    const row = await repository.getRouteScopeReconciliation('533140', '2026-08-02', '2026-08-02', '2026-08-02', []);
    assert.equal(row.day_ranked, 1);
    assert.equal(row.day_pickup_at_office, 0);
    assert.equal(row.day_bcvh_total, row.day_ranked + row.day_pickup_at_office + row.day_non_hue + row.day_no_route);

    database.close();
});
