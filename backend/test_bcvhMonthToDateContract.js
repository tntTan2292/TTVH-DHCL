const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = __dirname;
const serviceSource = fs.readFileSync(path.join(repoRoot, 'src/services/F13DashboardService.js'), 'utf8');
const repositorySource = fs.readFileSync(path.join(repoRoot, 'src/repositories/FactBuuGuiRepository.js'), 'utf8');

test('BCVH month-to-date contract uses selected end-date month and latest available cutoff', () => {
    assert.match(serviceSource, /_getMonthStart\(date\)/);
    assert.match(serviceSource, /getLatestBcvhDataDateInRange\(monthStart,\s*date\)/);
    assert.match(serviceSource, /const effectiveDate = monthToDateCutoff \|\| date/);
    assert.match(serviceSource, /getBcvhOperationMetricsBetween\(monthStart,\s*monthToDateCutoff\)/);
    assert.match(serviceSource, /used_latest_available:\s*Boolean\(monthToDateCutoff && monthToDateCutoff !== date\)/);
});

test('BCVH month-to-date repository does not fabricate zero dates or read after selected end date', () => {
    const methodStart = repositorySource.indexOf('getBcvhOperationMetricsBetween');
    const methodEnd = repositorySource.indexOf('getRouteRanking', methodStart);
    const monthToDateMethod = repositorySource.slice(methodStart, methodEnd);

    assert.match(monthToDateMethod, /date\(ngay_do_kiem\) BETWEEN date\(\?\) AND date\(\?\)/);
    assert.match(monthToDateMethod, /GROUP BY ma_bcvh/);
    assert.doesNotMatch(monthToDateMethod, /WITH RECURSIVE/);
});

test('BCVH month-to-date total row recalculates pass rate from summed pass and volume', () => {
    assert.match(serviceSource, /const totalMonthToDate = monthToDateMetrics\.reduce/);
    assert.match(serviceSource, /totalRow\.month_to_date_sl_bg_ptc = monthToDateCutoff \? totalMonthToDate\.sl_bg_ptc : null/);
    assert.match(serviceSource, /totalRow\.month_to_date_dat_kpi_2026 = monthToDateCutoff \? totalMonthToDate\.dat_kpi_2026 : null/);
    assert.match(serviceSource, /totalRow\.month_to_date_khong_dat_kpi_2026 = monthToDateCutoff \? totalMonthToDate\.khong_dat_kpi_2026 : null/);
    assert.match(
        serviceSource,
        /totalRow\.month_to_date_kpi_2026 = monthToDateCutoff\s*\?\s*this\._calculateRate\(totalMonthToDate\.dat_kpi_2026,\s*totalMonthToDate\.sl_bg_ptc\)/
    );
});

test('BCVH month-to-date contract exposes separate evaluation-day metadata and failed count', () => {
    assert.match(serviceSource, /month_to_date_khong_dat_kpi_2026:\s*monthToDateMap\[item\.ma_bcvh\]\?\.khong_dat_kpi_2026 \?\? null/);
    assert.match(serviceSource, /evaluation_date:\s*\{/);
    assert.match(serviceSource, /date:\s*effectiveDate/);
    assert.match(serviceSource, /requested_to_date:\s*date/);
});

test('BCVH month-to-date comparison uses same-period previous month, not full previous month', () => {
    assert.match(serviceSource, /_getPreviousMonthComparablePeriod\(dateStr\)/);
    assert.match(serviceSource, /const previousMonthPeriod = this\._getPreviousMonthComparablePeriod\(effectiveDate\)/);
    assert.match(serviceSource, /getBcvhOperationMetricsBetween\(previousMonthPeriod\.start,\s*previousMonthPeriod\.end\)/);
    assert.match(serviceSource, /previous_month_to_date_sl_bg_ptc:\s*previousMonthToDateMap\[item\.ma_bcvh\]\?\.sl_bg_ptc \?\? null/);
    assert.match(serviceSource, /previous_month_to_date_kpi_2026:\s*previousMonthToDateMap\[item\.ma_bcvh\]/);
    assert.match(serviceSource, /totalRow\.previous_month_to_date_kpi_2026 = monthToDateCutoff/);
    assert.match(serviceSource, /previous_month_to_date:\s*\{/);
});

test('BCVH total row uses full evaluation-day metrics instead of paginated rows', () => {
    assert.match(serviceSource, /const totalCurrent = currentMetrics\.reduce/);
    assert.match(serviceSource, /totalRow\.sl_bg_ptc = totalCurrent\.sl_bg_ptc/);
    assert.match(serviceSource, /totalRow\.dat_kpi_2026 = totalCurrent\.dat_kpi_2026/);
    assert.match(serviceSource, /totalRow\.kpi_2026 = this\._calculateRate\(totalCurrent\.dat_kpi_2026,\s*totalCurrent\.sl_bg_ptc\)/);
});
