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

test('four BCVH overview SQL aggregates execute on SQLite and preserve the approved contract', async () => {
    const { database, repository } = loadRepositoryWithInMemoryDb();
    database.exec(`
        CREATE TABLE fact_f13 (
            ngay_do_kiem TEXT,
            ma_bg TEXT,
            ma_bcvh TEXT,
            ten_bcvh TEXT,
            ma_tuyen TEXT,
            danh_gia_2026 TEXT
        );
    `);
    const insert = database.prepare(`
        INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, danh_gia_2026)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const codes = ['535790', '536250', '535470', '537220', '537015', '533140'];
    codes.forEach((code, index) => {
        insert.run('2026-02-01', `FEB-${code}`, code, `BCVH ${code}`, `${code}01`, index === 0 ? 'Không đạt' : 'Đạt');
        insert.run('2026-08-01', `A-${code}`, code, `BCVH ${code}`, `${code}01`, 'Đạt');
        insert.run('2026-08-02', `B-${code}`, code, `BCVH ${code}`, `${code}01`, 'Không đạt');
    });
    insert.run('2026-08-02', 'OUTSIDE', '531600', 'Ngoài canonical', '53160001', 'Đạt');
    insert.run('2026-08-02', null, '535790', 'BCVH 535790', '53579002', 'Đạt');

    const [monthly, daily, mtd, routes] = await Promise.all([
        repository.getBcvhOverviewMonthly('2026-08-27', codes),
        repository.getBcvhOverviewDaily('2026-08-27', codes),
        repository.getBcvhOverviewMtd('2026-08-27', codes),
        repository.getBcvhOverviewRoutes('2026-08-27', codes),
    ]);

    assert.deepEqual([...new Set(monthly.map((row) => row.ma_bcvh))].sort(), [...codes].sort());
    assert.deepEqual([...new Set(daily.map((row) => row.ma_bcvh))].sort(), [...codes].sort());
    assert.deepEqual([...new Set(mtd.map((row) => row.ma_bcvh))].sort(), [...codes].sort());
    assert.deepEqual([...new Set(routes.map((row) => row.ma_bcvh))].sort(), [...codes].sort());
    assert.equal(monthly.find((row) => row.month === '2026-02').days_in_period, 1);
    assert.equal(monthly.find((row) => row.month === '2026-08' && row.ma_bcvh === '535790').volume, 2);
    assert.equal(routes.filter((row) => row.ma_bcvh === '535790' && row.ma_tuyen === '53579001').length, 1);
    assert.equal(routes.find((row) => row.ma_bcvh === '535790' && row.ma_tuyen === '53579001').total_bg, 2);
    assert.ok(monthly.every((row) => row.anchor_date === '2026-08-02'));
    assert.ok(daily.every((row) => row.anchor_date === '2026-08-02'));

    database.close();
});
