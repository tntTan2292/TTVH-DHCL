'use strict';

// PROV-PKG-01 (S3c): the call sites read the province code from provinceConfig.
//   T3  route-prefix SQL on a fixture with 53..., 55... and unclassified routes: the Hue edition answers as before
//   P1  province 46: the HUE (province) report identities and portal parameters carry 46, the TCT lane does not change
//   P4  route prefix 46: only 46... routes are postman routes
//   P5  tctF13BackfillService picks the province's own row from the national table

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-pkg-callsites-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(tmpDir, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(tmpDir, 'data-root', 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F41 = path.join(tmpDir, 'data-root', 'F4.1');

const sqlite3 = require('sqlite3').verbose();
const provinceConfig = require('./provinceConfig');
const dbModule = require('./db');
const repo = require('../repositories/FactBuuGuiRepository');

const DATE = '2026-11-15';
const BCVH = '533140';
const NON_POSTMAN = ['53314018'];

function memoryDb(rows) {
    const db = new sqlite3.Database(':memory:');
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('CREATE TABLE system_config (config_key VARCHAR(50) PRIMARY KEY, config_value TEXT NOT NULL, description TEXT)');
            rows.forEach(([key, value]) => db.run('INSERT INTO system_config (config_key, config_value) VALUES (?, ?)', [key, value]));
            db.get('SELECT 1', (error) => (error ? reject(error) : resolve(db)));
        });
    });
}

const provinceRows = (code) => [
    ['default_province_code', code], ['province_configured', '1'],
    ['display_unit_name', 'Đơn vị X'], ['display_legal_name', 'Đơn vị X'], ['display_short_name', 'Nghệ An'],
    ['display_brand_short', 'VNPost Nghệ An'], ['unit_leader_label', 'đơn vị'], ['unit_catalog_autofill', 'on'],
];

async function asProvince(code, fn) {
    const previous = process.env.QIS_EDITION;
    process.env.QIS_EDITION = 'province';
    provinceConfig._reset();
    try {
        await provinceConfig.load(await memoryDb(provinceRows(code)));
        return await fn();
    } finally {
        if (previous === undefined) delete process.env.QIS_EDITION; else process.env.QIS_EDITION = previous;
        provinceConfig._reset();
    }
}

async function asFull(fn) {
    const previous = process.env.QIS_EDITION;
    delete process.env.QIS_EDITION;
    provinceConfig._reset();
    try { return await fn(); } finally {
        if (previous !== undefined) process.env.QIS_EDITION = previous;
        provinceConfig._reset();
    }
}

// ---- fixture: fact_f13 with routes of two provinces and an unclassified one, in one BCVH, one day ----
// route            rows  danh_gia
// 53100001 (Hue)     3   Đạt, Đạt, Không đạt
// 53314018 (Hue)     2   Đạt, Không đạt     <- confirmed non-postman (customer pick-up)
// 46100001 (46)      2   Đạt, Đạt
// 55100001 (55)      1   Đạt
// Khong Xac Dinh     1   Không đạt          <- not a province route
// (no route)         1   Đạt
const FIXTURE = [
    ['53100001', 'Đạt'], ['53100001', 'Đạt'], ['53100001', 'Không đạt'],
    ['53314018', 'Đạt'], ['53314018', 'Không đạt'],
    ['46100001', 'Đạt'], ['46100001', 'Đạt'],
    ['55100001', 'Đạt'],
    ['Khong Xac Dinh', 'Không đạt'],
    [null, 'Đạt'],
];

test.before(async () => {
    const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    await new Promise((resolve, reject) => dbModule.db.exec(schema, (e) => (e ? reject(e) : resolve())));
    let n = 0;
    for (const [route, rating] of FIXTURE) {
        n += 1;
        await dbModule.run(
            `INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, ma_bcvh, ten_bcvh, ma_tuyen, ten_tuyen, danh_gia_2026)
             VALUES (?, ?, ?, 'BCVH Thuận Hóa', ?, ?, ?)`,
            [DATE, `BG${n}`, BCVH, route, route ? `Tuyến ${route}` : null, rating],
        );
    }
});

const routeMap = (rows) => Object.fromEntries(rows.map((r) => [r.ma_tuyen, r.total_bg]));

// ---------------- T3 (Hue edition) ----------------
test('T3: Hue route ranking keeps only 53... routes (postman excludes the confirmed non-postman route)', async () => {
    await asFull(async () => {
        const postman = await repo.getRouteRanking(DATE, BCVH, 1, 50, 'total_bg', 'desc', { routeType: 'postman', confirmedNonPostmanRouteCodes: NON_POSTMAN });
        assert.deepEqual(routeMap(postman.data), { 53100001: 3 });
        assert.equal(postman.totalItems, 1);
        const all = await repo.getRouteRanking(DATE, BCVH, 1, 50, 'total_bg', 'desc', { routeType: 'all', confirmedNonPostmanRouteCodes: NON_POSTMAN });
        assert.deepEqual(routeMap(all.data), { 53100001: 3, 53314018: 2 });
        assert.equal(all.totalItems, 2);
    });
});

test('T3: Hue route facts / period facts / previous month use the same 53 scope', async () => {
    await asFull(async () => {
        const facts = await repo.getRouteRankingFacts(DATE, BCVH, { routeType: 'all', confirmedNonPostmanRouteCodes: NON_POSTMAN });
        assert.equal(facts.length, 5);
        const daily = await repo.getRoutePeriodDailyFacts(BCVH, '2026-11-01', DATE, { routeType: 'postman', confirmedNonPostmanRouteCodes: NON_POSTMAN });
        assert.deepEqual(daily.map((r) => [r.ma_tuyen, r.volume]), [['53100001', 3]]);
        const prev = await repo.getRoutePeriodPreviousMonth(BCVH, '2026-12-15', { routeType: 'all', confirmedNonPostmanRouteCodes: NON_POSTMAN });
        assert.deepEqual(prev.routes.map((r) => [r.ma_tuyen, r.volume]).sort(), [['53100001', 3], ['53314018', 2]]);
    });
});

test('T3: Hue reconciliation counts (ranked / pickup / non-Hue / no route)', async () => {
    await asFull(async () => {
        const row = await repo.getRouteScopeReconciliation(BCVH, DATE, '2026-11-01', '2026-11-30', NON_POSTMAN);
        assert.equal(row.day_bcvh_total, 10);
        assert.equal(row.day_ranked, 3);
        assert.equal(row.day_pickup_at_office, 2);
        assert.equal(row.day_non_hue, 4); // 46100001 x2, 55100001, Khong Xac Dinh
        assert.equal(row.day_no_route, 1);
        assert.equal(row.month_bcvh_total, 10);
        assert.equal(row.month_ranked, 3);
        assert.equal(row.month_pickup_at_office, 2);
        assert.equal(row.month_non_hue, 4);
        assert.equal(row.month_no_route, 1);
        const noCodes = await repo.getRouteScopeReconciliation(BCVH, DATE, '2026-11-01', '2026-11-30', []);
        assert.equal(noCodes.day_ranked, 5);
        assert.equal(noCodes.month_ranked, 5);
        assert.equal(noCodes.day_pickup_at_office, 0);
    });
});

test('T3: isHueRouteCode keeps its name and the 53 prefix in the Hue edition', async () => {
    await asFull(async () => {
        const { isHueRouteCode } = require('./f13RouteClassificationCatalog');
        assert.equal(isHueRouteCode('53100001'), true);
        assert.equal(isHueRouteCode(' 53100001 '), true);
        assert.equal(isHueRouteCode('46100001'), false);
        assert.equal(isHueRouteCode('Khong Xac Dinh'), false);
        assert.equal(isHueRouteCode(null), false);
    });
});

// ---------------- P4 ----------------
test('P4: with province 46 only 46... routes are postman routes (ranking, facts, reconciliation, catalog)', async () => {
    await asProvince('46', async () => {
        const postman = await repo.getRouteRanking(DATE, BCVH, 1, 50, 'total_bg', 'desc', { routeType: 'postman', confirmedNonPostmanRouteCodes: [] });
        assert.deepEqual(routeMap(postman.data), { 46100001: 2 });
        const facts = await repo.getRouteRankingFacts(DATE, BCVH, { routeType: 'all', confirmedNonPostmanRouteCodes: [] });
        assert.equal(facts.length, 2);
        const daily = await repo.getRoutePeriodDailyFacts(BCVH, '2026-11-01', DATE, { routeType: 'all', confirmedNonPostmanRouteCodes: [] });
        assert.deepEqual(daily.map((r) => [r.ma_tuyen, r.volume]), [['46100001', 2]]);
        const prev = await repo.getRoutePeriodPreviousMonth(BCVH, '2026-12-15', { routeType: 'all', confirmedNonPostmanRouteCodes: [] });
        assert.deepEqual(prev.routes.map((r) => [r.ma_tuyen, r.volume]), [['46100001', 2]]);
        const row = await repo.getRouteScopeReconciliation(BCVH, DATE, '2026-11-01', '2026-11-30', []);
        assert.equal(row.day_ranked, 2);
        assert.equal(row.month_ranked, 2);
        assert.equal(row.day_non_hue, 7); // every other classified route, 53... included (3 + 2 + 55... + unclassified)
        assert.equal(row.month_non_hue, 7);
        const { isHueRouteCode } = require('./f13RouteClassificationCatalog');
        assert.equal(isHueRouteCode('46100001'), true);
        assert.equal(isHueRouteCode('53100001'), false);
        const f13 = require('../services/F13DashboardService');
        const ranking = await f13.getRouteRanking(DATE, BCVH, 1, 50, 'total_bg', 'desc', { routeType: 'all' });
        assert.equal(ranking.meta.route_scope.hue_prefix, '46');
    });
});

// ---------------- P1 ----------------
test('P1: province 46 report identities of the province lane carry 46; the TCT lane is unchanged', async () => {
    await asProvince('46', async () => {
        const f11 = require('../services/autoBackfillF11Contract').F11_EXECUTOR_IDENTITIES;
        const f12 = require('../services/autoBackfillF12Contract').F12_EXECUTOR_IDENTITIES;
        const f13 = require('../services/autoBackfillF13Contract').F13_EXECUTOR_IDENTITIES;
        const f41 = require('../services/autoBackfillF41Contract').F41_EXECUTOR_IDENTITIES;
        assert.equal(f11.HUE.reportIdentity, 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_ChiTiet|GR=BC|TINH_CHAP_NHAN=46|TINH_PHAT=46');
        assert.equal(f12.HUE.reportIdentity, 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_ChiTiet|GR=BC|TINH_NHAN=46');
        assert.equal(f13.HUE.reportIdentity, 'DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=BC|TINH_PHAT=46|DETAIL');
        assert.equal(f41.HUE.reportIdentity, 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_BuuCuc_V2|GR=BC|TINH_PHAT=46');
        assert.equal(f11.TCT.reportIdentity, 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_Tinh|GR=TINH|TINH_CHAP_NHAN=ALL|TINH_PHAT=ALL');
        assert.equal(f12.TCT.reportIdentity, 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_Tinh|GR=TINH|TINH_NHAN=ALL');
        assert.equal(f13.TCT.reportIdentity, 'DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=TINH|TINH_PHAT=ALL|SUMMARY');
        assert.equal(f41.TCT.reportIdentity, 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_Tinh_V2|GR=TINH|TINH_PHAT=ALL');
    });
});

test('P1: the indicator registry keeps the live (province) report identity', async () => {
    const registry = require('../services/importIndicatorRegistry');
    const indicators = registry.INDICATORS || registry.getIndicatorRegistry?.() || null;
    assert.ok(indicators, 'registry exposes the indicators');
    const laneAdapter = (code, lane) => indicators[code].lanes[lane].portalAdapter;
    await asFull(async () => {
        assert.match(laneAdapter('F1.3', 'HUE').reportIdentity, /TINH_PHAT=53\|DETAIL$/);
        assert.equal(laneAdapter('F1.3', 'HUE').verified, true);
    });
    await asProvince('46', async () => {
        assert.match(laneAdapter('F1.3', 'HUE').reportIdentity, /TINH_PHAT=46\|DETAIL$/);
        assert.match(laneAdapter('F4.1', 'HUE').reportIdentity, /TINH_PHAT=46$/);
        assert.match(laneAdapter('F1.1', 'HUE').reportIdentity, /TINH_CHAP_NHAN=46\|TINH_PHAT=46$/);
        assert.match(laneAdapter('F1.2', 'HUE').reportIdentity, /TINH_NHAN=46$/);
        assert.match(laneAdapter('F1.3', 'TCT').reportIdentity, /TINH_PHAT=ALL\|SUMMARY$/);
    });
});

test('P1: province 46 portal request parameters (plain and N-quoted forms)', async () => {
    await asProvince('46', async () => {
        const f11 = require('../services/f11PortalClientMethods');
        const f12 = require('../services/f12PortalClientMethods');
        const f41 = require('../services/dkclHueF13PortalClient');
        assert.deepEqual({ ...f11.F11_LANE_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhChapNhan: '46', stMaTinhPhat: '46' });
        assert.deepEqual({ ...f12.F12_LANE_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhNhan: '46' });
        assert.deepEqual({ ...f41.F41_LANE_QUERY_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhPhat: '46' });
        assert.deepEqual({ ...f11.F11_LANE_FILTERS.TCT }, { TuyChonGR: 'TINH', stMaTinhChapNhan: 'ALL', stMaTinhPhat: 'ALL' });
        assert.match(f11.buildF11ReportQuery('HUE', DATE), /stMaTinhChapNhan=46&.*stMaTinhPhat=46&/);
        assert.match(f11.buildF11HueDetailQuery(DATE, 10), /^stMaTinhPhat=46&.*stMaTinhChapNhan=46&/);
        assert.match(f12.buildF12ReportQuery('HUE', DATE), /stMaTinhNhan=46&/);
        assert.match(f12.buildF12HueDetailQuery(DATE, 10), /^stMaTinhNhan=N%2746%27&/);
        assert.match(f41.buildF41ReportQuery('HUE', DATE), /stMaTinhPhat=46&/);
        assert.doesNotMatch(f11.buildF11HueDetailQuery(DATE, 10), /=53(&|$)/);
    });
});

// ---------------- P5 ----------------
test('P5: tctF13BackfillService.loadHueEvidence picks the province row (46) and still 53 for Hue', async () => {
    const { TctF13BackfillService } = require('../services/tctF13BackfillService');
    const rows = [
        { ma_tinh_phat: '10', sl_bg_ptc: 100, sl_ptc_dung_qd_ct: 99, tl_ptc_dung_qd_ct: 99 },
        { ma_tinh_phat: '53', sl_bg_ptc: 200, sl_ptc_dung_qd_ct: 190, tl_ptc_dung_qd_ct: 95 },
        { ma_tinh_phat: '46', sl_bg_ptc: 300, sl_ptc_dung_qd_ct: 270, tl_ptc_dung_qd_ct: 90 },
    ];
    const service = new TctF13BackfillService({ db: { all: async () => rows } });
    await asFull(async () => {
        assert.deepEqual(await service.loadHueEvidence(DATE), { volume: 200, pass: 190, kpi: 95, rank: 2 });
    });
    await asProvince('46', async () => {
        assert.deepEqual(await service.loadHueEvidence(DATE), { volume: 300, pass: 270, kpi: 90, rank: 3 });
    });
    await asProvince('99', async () => {
        assert.deepEqual(await service.loadHueEvidence(DATE), { volume: null, pass: null, kpi: null, rank: null });
    });
});

// ---------------- national rank services + display strings ----------------
test('national rank services read the province code and the short name from provinceConfig', async () => {
    const { F11NationalRankService } = require('../services/F11NationalRankService');
    const { F41NationalRankService } = require('../services/F41NationalRankService');
    const mkDb = () => ({ get: (s, p, cb) => cb(null, null), all: (s, p, cb) => cb(null, []) });
    await asFull(async () => {
        assert.equal(await new F11NationalRankService(mkDb())._provinceCode(), '53');
        assert.equal(await new F41NationalRankService(mkDb())._provinceCode(), '53');
        const unavailable = new F11NationalRankService(mkDb())._unavailableForDate(DATE, '53', 'missing_province');
        assert.equal(unavailable.message, `Chưa có dữ liệu xếp hạng của Huế trong bảng toàn quốc ngày ${DATE}`);
        const f41 = new F41NationalRankService(mkDb())._unavailableForDate(DATE, '53', 'missing_province');
        assert.equal(f41.message, `Chưa có dữ liệu xếp hạng của Huế trong bảng toàn quốc ngày ${DATE}`);
    });
    await asProvince('46', async () => {
        assert.equal(await new F11NationalRankService(mkDb())._provinceCode(), '46');
        assert.equal(await new F41NationalRankService(mkDb())._provinceCode(), '46');
        assert.equal(new F11NationalRankService(mkDb())._unavailableForDate(DATE, '46', 'missing_province').message, `Chưa có dữ liệu xếp hạng của Nghệ An trong bảng toàn quốc ngày ${DATE}`);
    });
});
