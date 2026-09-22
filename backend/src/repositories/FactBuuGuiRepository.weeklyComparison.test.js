const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');

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

const CODES = ['535790', '536250', '535470', '537220', '537015', '533140'];

test('getBcvhWeeksList groups rows into Thursday-start weeks and reports real first/last data dates', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    database.exec(`
        CREATE TABLE fact_f13 (
            ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT, ten_bcvh TEXT, ma_tuyen TEXT, danh_gia_2026 TEXT
        );
    `);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    // Week 36 (Thu 2026-09-03 .. Wed 2026-09-09): full 7-day coverage.
    ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09'].forEach((date, i) => {
        insert.run(date, `W36-${i}`, CODES[0], 'BCVH 535790', '53579001', 'Đạt');
    });
    // Week 38 (Thu 2026-09-17 .. Wed 2026-09-23): only imported through 2026-09-21 (in progress).
    ['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'].forEach((date, i) => {
        insert.run(date, `W38-${i}`, CODES[0], 'BCVH 535790', '53579001', i === 0 ? 'Không đạt' : 'Đạt');
    });
    // Outside canonical -- must not create or affect a week row.
    insert.run('2026-09-17', 'OUTSIDE', '531600', 'Ngoài canonical', '53160001', 'Đạt');

    const weeks = await repository.getBcvhWeeksList(CODES);
    database.close();

    assert.equal(weeks.length, 2, 'exactly the two weeks with canonical data appear');
    const week36 = weeks.find((w) => w.week_start === '2026-09-03');
    assert.equal(week36.first_date, '2026-09-03');
    assert.equal(week36.last_date, '2026-09-09');
    assert.equal(week36.days_with_data, 7);

    const week38 = weeks.find((w) => w.week_start === '2026-09-17');
    assert.equal(week38.first_date, '2026-09-17');
    assert.equal(week38.last_date, '2026-09-21', 'last_date never assumes data past the real import');
    assert.equal(week38.days_with_data, 5);
});

test('getBcvhWeeklyComparisonAggregate sums two arbitrary weeks per BCVH using COUNT(ma_bg)/Đạt semantics', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    database.exec(`
        CREATE TABLE fact_f13 (
            ngay_do_kiem TEXT, ma_bg TEXT, ma_bcvh TEXT, ten_bcvh TEXT, ma_tuyen TEXT, danh_gia_2026 TEXT
        );
    `);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    CODES.forEach((code) => {
        // Week A (36): 3 bg, 2 pass.
        insert.run('2026-09-03', `A1-${code}`, code, `BCVH ${code}`, `${code}01`, 'Đạt');
        insert.run('2026-09-04', `A2-${code}`, code, `BCVH ${code}`, `${code}01`, 'Đạt');
        insert.run('2026-09-05', `A3-${code}`, code, `BCVH ${code}`, `${code}01`, 'Không đạt');
        // Week B (38): 2 bg, 1 pass, plus 1 row with a null ma_bg that must not count toward volume.
        insert.run('2026-09-17', `B1-${code}`, code, `BCVH ${code}`, `${code}01`, 'Đạt');
        insert.run('2026-09-18', `B2-${code}`, code, `BCVH ${code}`, `${code}01`, 'Không đạt');
        insert.run('2026-09-19', null, code, `BCVH ${code}`, `${code}01`, 'Đạt');
    });
    // A week not requested at all -- must never leak into either bucket.
    insert.run('2026-09-10', 'IGNORED', CODES[0], 'BCVH 535790', '53579001', 'Đạt');

    const rows = await repository.getBcvhWeeklyComparisonAggregate(
        { from: '2026-09-03', to: '2026-09-09' },
        { from: '2026-09-17', to: '2026-09-21' },
        CODES,
    );
    database.close();

    assert.equal(rows.length, 6);
    const row0 = rows.find((r) => r.ma_bcvh === CODES[0]);
    assert.equal(row0.volume_a, 3);
    assert.equal(row0.passed_a, 2);
    assert.equal(row0.volume_b, 2, 'null ma_bg row excluded from volume_b');
    assert.equal(row0.passed_b, 1);
});
