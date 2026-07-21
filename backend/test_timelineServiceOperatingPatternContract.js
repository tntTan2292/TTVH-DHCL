'use strict';

const assert = require('assert');

const dbPath = require.resolve('./src/config/db');
const servicePath = require.resolve('./src/services/timelineService');
const originalDb = require.cache[dbPath];

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        all: async (sql) => {
            if (sql.includes('GROUP BY ngay_do_kiem')) {
                return [{ ngay_do_kiem: '2026-07-20', total_bg: 100, passed_bg: 60 }];
            }
            if (sql.includes('GROUP BY substr(ngay_do_kiem, 1, 7)')) {
                return [{ month_key: '2026-07', total_bg: 100, passed_bg: 60, from_date: '2026-07-20', to_date: '2026-07-20' }];
            }
            if (sql.includes('MAX(ngay_do_kiem)')) {
                return [{ latest_date: '2026-07-20' }];
            }
            throw new Error(`Unexpected SQL: ${sql}`);
        }
    }
};
delete require.cache[servicePath];
const timelineService = require('./src/services/timelineService');

(async () => {
    const result = await timelineService.getQualityTimeline('2026-07-20', 'all');
    const monday = result.weekly.find((item) => item.day === 'T2');
    const july = result.monthly_ytd.find((item) => item.month === '2026-07');

    assert.strictEqual(monday.total_volume, 100, 'weekday contract includes shipment volume');
    assert.strictEqual(monday.pass_rate, 60, 'weekday contract includes pass rate');
    assert.strictEqual(july.total_volume, 100, 'monthly YTD contract includes shipment volume');
    assert.strictEqual(july.pass_rate, 60, 'monthly YTD contract includes pass rate');
    assert.strictEqual(july.is_current_month, true, 'current month is anchored to the latest business date');
    assert.strictEqual(result.latest_business_date, '2026-07-20', 'timeline exposes the latest business date');

    console.log('PASS timelineService operating-pattern contract');
})().finally(() => {
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
    delete require.cache[servicePath];
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
