const test = require('node:test');
const assert = require('node:assert/strict');

const timelineService = require('./timelineService');

function dailyRows(startDate, endDate) {
    const rows = [];
    const current = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    while (current <= end) {
        rows.push({
            date: current.toISOString().split('T')[0],
            total: 10,
            passed: 8,
            kpi_rate: 80
        });
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return rows;
}

function datedCells(calendar) {
    return calendar.flat().filter(Boolean);
}

function monthKeys(calendar) {
    return [...new Set(datedCells(calendar).map((day) => day.date.slice(0, 7)))];
}

test('heatmap calendar ignores older source months and returns only previous and latest-data months', () => {
    const calendar = timelineService._buildHeatmapCalendar(dailyRows('2026-05-01', '2026-07-16'), '2026-07-16');

    assert.deepEqual(monthKeys(calendar), ['2026-06', '2026-07']);
    assert.equal(datedCells(calendar)[0].date, '2026-06-01');
    assert.equal(datedCells(calendar).at(-1).date, '2026-07-16');
});

test('heatmap calendar keeps full previous month at month-end boundaries', () => {
    const calendar = timelineService._buildHeatmapCalendar(dailyRows('2026-02-01', '2026-03-31'), '2026-03-31');
    const februaryCells = datedCells(calendar).filter((day) => day.date.startsWith('2026-02-'));
    const marchCells = datedCells(calendar).filter((day) => day.date.startsWith('2026-03-'));

    assert.deepEqual(monthKeys(calendar), ['2026-02', '2026-03']);
    assert.equal(februaryCells[0].date, '2026-02-01');
    assert.equal(februaryCells.at(-1).date, '2026-02-28');
    assert.equal(marchCells.at(-1).date, '2026-03-31');
});

test('heatmap calendar handles December to January transition', () => {
    const calendar = timelineService._buildHeatmapCalendar(dailyRows('2025-11-01', '2026-01-05'), '2026-01-05');

    assert.deepEqual(monthKeys(calendar), ['2025-12', '2026-01']);
    assert.equal(datedCells(calendar)[0].date, '2025-12-01');
    assert.equal(datedCells(calendar).at(-1).date, '2026-01-05');
});

test('heatmap weekday padding does not create an additional dated month block', () => {
    const calendar = timelineService._buildHeatmapCalendar(dailyRows('2026-06-25', '2026-08-16'), '2026-08-16');

    assert.equal(calendar[0][0], null);
    assert.deepEqual(monthKeys(calendar), ['2026-07', '2026-08']);
    assert.equal(datedCells(calendar).some((day) => day.date.startsWith('2026-06-')), false);
});

test('quality timeline mode stays compatible and recognizes lazy-load surfaces', () => {
    assert.equal(timelineService._normalizeTimelineMode(), 'all');
    assert.equal(timelineService._normalizeTimelineMode('all'), 'all');
    assert.equal(timelineService._normalizeTimelineMode('month'), 'month');
    assert.equal(timelineService._normalizeTimelineMode('weekday'), 'weekday');
    assert.equal(timelineService._normalizeTimelineMode('heatmap'), 'heatmap');
    assert.equal(timelineService._normalizeTimelineMode('unknown'), 'all');
});

test('heatmap national rank enrichment is applied from a date map without changing cells', () => {
    const calendar = timelineService._buildHeatmapCalendar(dailyRows('2026-07-01', '2026-07-02'), '2026-07-02');
    const enriched = timelineService._applyNationalRanksToHeatmap(calendar, {
        '2026-07-01': { available: true, rank: 24, total: 34, period: '2026-07-01' },
        '2026-07-02': { available: false, message: 'Chưa có dữ liệu xếp hạng toàn quốc cho ngày 2026-07-02' }
    });
    const cells = datedCells(enriched);

    assert.equal(cells[0].date, '2026-07-01');
    assert.equal(cells[0].national_rank.rank, 24);
    assert.equal(cells[1].national_rank.available, false);
    assert.equal(enriched[0][0], null);
});
