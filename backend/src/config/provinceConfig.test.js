'use strict';

// PROV-PKG-01 (S3b): provinceConfig, the key migration, and the Hue regression locks T1 (reportIdentity, byte for
// byte) and T2 (portal request parameters) that must keep passing unchanged after S3c.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-pkg-config-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = process.env.QIS_TEST_DB_PATH || path.join(tmpDir, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = process.env.QIS_TEST_DATA_ROOT || path.join(tmpDir, 'data-root', 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F41 = process.env.QIS_TEST_DATA_ROOT_F41 || path.join(tmpDir, 'data-root', 'F4.1');

const sqlite3 = require('sqlite3').verbose();
const provinceConfig = require('./provinceConfig');
const { applyProvPkg01SystemConfigKeysSchema } = require('../../migrate_prov_pkg_01_system_config_keys');
const HUE_DEFAULTS = require('./hueDefaults');

function memoryDb(rows = []) {
    const db = new sqlite3.Database(':memory:');
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('CREATE TABLE system_config (config_key VARCHAR(50) PRIMARY KEY, config_value TEXT NOT NULL, description TEXT)');
            rows.forEach(([key, value]) => db.run('INSERT INTO system_config (config_key, config_value) VALUES (?, ?)', [key, value]));
            db.get('SELECT 1', (error) => (error ? reject(error) : resolve(db)));
        });
    });
}

function withEdition(value, fn) {
    const previous = process.env.QIS_EDITION;
    if (value === undefined) delete process.env.QIS_EDITION; else process.env.QIS_EDITION = value;
    provinceConfig._reset();
    return Promise.resolve(fn()).finally(() => {
        if (previous === undefined) delete process.env.QIS_EDITION; else process.env.QIS_EDITION = previous;
        provinceConfig._reset();
    });
}

const PROVINCE_ROWS = (code, configured = '1') => [
    ['default_province_code', code],
    ['province_configured', configured],
    ['display_unit_name', 'Bưu điện tỉnh X'],
    ['display_legal_name', 'Bưu điện tỉnh X'],
    ['display_short_name', 'X'],
    ['display_brand_short', 'VNPost X'],
    ['unit_leader_label', 'đơn vị'],
    ['unit_catalog_autofill', 'on'],
];

// ---- T1: the eight report identities as committed at 3662965e (the strings the stored queue rows carry) ----
const T1_EXPECTED = Object.freeze({
    F11: { HUE: 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_ChiTiet|GR=BC|TINH_CHAP_NHAN=53|TINH_PHAT=53', TCT: 'DKCL:/kpi/chat-luong-toan-trinh-buu-gui-noi-tinh|sp_TT_NoiTinh_Tinh|GR=TINH|TINH_CHAP_NHAN=ALL|TINH_PHAT=ALL' },
    F12: { HUE: 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_ChiTiet|GR=BC|TINH_NHAN=53', TCT: 'DKCL:/kpi/chat-luong-thu-gom-buu-lien-tinh|sp_TT_ThuGom_LienTinh_Tinh|GR=TINH|TINH_NHAN=ALL' },
    F13: { HUE: 'DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=BC|TINH_PHAT=53|DETAIL', TCT: 'DKCL:/kpi/chat-luong-phat-buu-gui-lien-tinh|GR=TINH|TINH_PHAT=ALL|SUMMARY' },
    F41: { HUE: 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_BuuCuc_V2|GR=BC|TINH_PHAT=53', TCT: 'DKCL:/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc|sp_Phat_ChatLuong_PTC_Tinh_V2|GR=TINH|TINH_PHAT=ALL' },
});

function contractIdentities() {
    return {
        F11: require('../services/autoBackfillF11Contract').F11_EXECUTOR_IDENTITIES,
        F12: require('../services/autoBackfillF12Contract').F12_EXECUTOR_IDENTITIES,
        F13: require('../services/autoBackfillF13Contract').F13_EXECUTOR_IDENTITIES,
        F41: require('../services/autoBackfillF41Contract').F41_EXECUTOR_IDENTITIES,
    };
}

function assertT1(label) {
    const identities = contractIdentities();
    for (const [indicator, lanes] of Object.entries(T1_EXPECTED)) {
        for (const [lane, expected] of Object.entries(lanes)) {
            const actual = identities[indicator][lane].reportIdentity;
            assert.equal(actual, expected, `${label}: ${indicator}.${lane}`);
            assert.equal(Buffer.compare(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8')), 0, `${label}: ${indicator}.${lane} bytes`);
        }
    }
}

test('T1: reportIdentity is byte-identical to 3662965e before provinceConfig.load()', async () => {
    await withEdition(undefined, async () => assertT1('not loaded'));
});

test('T1: reportIdentity is byte-identical to 3662965e after load() with code 53', async () => {
    await withEdition(undefined, async () => {
        await provinceConfig.load(await memoryDb(PROVINCE_ROWS('53')));
        assertT1('loaded 53');
    });
});

// ---- T2: portal request parameters of the Hue lane (strings captured from the code before S3c) ----
const EXPECTED_QUERIES = Object.freeze({
    f11Report: 'TuyChonGR=BC&stMaTinhChapNhan=53&stMaBuuCucNhan=NULL&stMaTinhPhat=53&stMaBCKTTinhChapNhan=NULL&stMaBCKTTinhPhat=NULL&stMaLoaiBCKT=NULL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=11%2F15%2F2026&iTo=11%2F15%2F2026',
    f11Detail: 'stMaTinhPhat=53&stMaBuuCucPhat=NULL&stMaTinhChapNhan=53&stMaBuuCucNhan=NULL&stMaBCKTTinhPhat=NULL&stMaLoaiBCKT=NULL&stMaBCKTTinhChapNhan=NULL&iFrom=20261115&iTo=20261115&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stMaKHL=NULL&stPhuongTien=NULL&stKhoiLuong=NULL&name_store=sp_TT_NoiTinh_ChiTiet&iDetailReport=1&iTotal=120',
    f12Report: 'TuyChonGR=BC&stMaTinhNhan=53&stMaBuuCucNhan=NULL&stMaBCKTTinhNhan=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&iFrom=11%2F15%2F2026&iTo=11%2F15%2F2026',
    f12Detail: 'stMaTinhNhan=N%2753%27&stMaBuuCucNhan=NULL&iFrom=20261115&iTo=20261115&stMaDichVu=NULL&stNhomLoaiBuuGui=NULL&stLoaiDichVu=NULL&stMaLoaiBuuGui=NULL&stNhomLoaiKH=NULL&stMaBCKTTinhNhan=NULL&stMaKHL=NULL&stPhuongTien=NULL&stKhoiLuong=NULL&name_store=sp_TT_ThuGom_LienTinh_ChiTiet&iDetailReport=6&iTotal=120',
    f41Report: 'TuyChonGR=BC&stMaHuyenPhat=&stMaTinhPhat=53&stMaLoaiBCPhat=NULL&stMaBuuCucPhat=NULL&stLoaiDichVu=ALL&stNhomLoaiKH=ALL&stPhamViTinh=NULL&stLoaiTuyenPhat=NULL&stLoaiPhuongXa=NULL&iFrom=11%2F15%2F2026&iTo=11%2F15%2F2026&iPageSize=50000&iPage=1',
});

function assertT2(label) {
    const f11 = require('../services/f11PortalClientMethods');
    const f12 = require('../services/f12PortalClientMethods');
    const f41 = require('../services/dkclHueF13PortalClient');
    assert.deepEqual({ ...f11.F11_LANE_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhChapNhan: '53', stMaTinhPhat: '53' }, label);
    assert.deepEqual({ ...f11.F11_LANE_FILTERS.TCT }, { TuyChonGR: 'TINH', stMaTinhChapNhan: 'ALL', stMaTinhPhat: 'ALL' }, label);
    assert.deepEqual({ ...f12.F12_LANE_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhNhan: '53' }, label);
    assert.deepEqual({ ...f12.F12_LANE_FILTERS.TCT }, { TuyChonGR: 'TINH', stMaTinhNhan: 'ALL' }, label);
    assert.deepEqual({ ...f41.F41_LANE_QUERY_FILTERS.HUE }, { TuyChonGR: 'BC', stMaTinhPhat: '53' }, label);
    assert.deepEqual({ ...f41.F41_LANE_QUERY_FILTERS.TCT }, { TuyChonGR: 'TINH', stMaTinhPhat: 'ALL' }, label);
    // same JavaScript type as before (string, not number)
    assert.equal(typeof f11.F11_LANE_FILTERS.HUE.stMaTinhPhat, 'string', label);
    assert.equal(typeof f12.F12_LANE_FILTERS.HUE.stMaTinhNhan, 'string', label);
    assert.equal(typeof f41.F41_LANE_QUERY_FILTERS.HUE.stMaTinhPhat, 'string', label);
    // the complete request strings, in the observed parameter order
    assert.equal(f11.buildF11ReportQuery('HUE', '2026-11-15'), EXPECTED_QUERIES.f11Report, label);
    assert.equal(f11.buildF11HueDetailQuery('2026-11-15', 120), EXPECTED_QUERIES.f11Detail, label);
    assert.equal(f12.buildF12ReportQuery('HUE', '2026-11-15'), EXPECTED_QUERIES.f12Report, label);
    assert.equal(f12.buildF12HueDetailQuery('2026-11-15', 120), EXPECTED_QUERIES.f12Detail, label);
    assert.equal(f41.buildF41ReportQuery('HUE', '2026-11-15'), EXPECTED_QUERIES.f41Report, label);
}

test('T2: portal request parameters of the HUE lane are unchanged (value, type, whole request) before load()', async () => {
    await withEdition(undefined, async () => assertT2('not loaded'));
});

test('T2: portal request parameters of the HUE lane are unchanged after load() with code 53', async () => {
    await withEdition(undefined, async () => {
        await provinceConfig.load(await memoryDb(PROVINCE_ROWS('53')));
        assertT2('loaded 53');
    });
});

// ---- provinceConfig ----
test('full edition before load(): Hue defaults, so existing code and tests keep working', async () => {
    await withEdition(undefined, async () => {
        assert.equal(provinceConfig.isLoaded(), false);
        assert.equal(provinceConfig.getProvinceCode(), '53');
        assert.equal(provinceConfig.formatForPortal('plain'), '53');
        assert.equal(provinceConfig.formatForPortal('nquoted'), "N'53'");
        assert.equal(provinceConfig.formatForPortal('numeric'), 53);
        assert.equal(provinceConfig.getRoutePrefix(), '53');
        assert.equal(provinceConfig.getRouteLikePattern(), '53%');
        assert.deepEqual({ ...provinceConfig.getDisplay() }, {
            unitName: HUE_DEFAULTS.display_unit_name,
            legalName: HUE_DEFAULTS.display_legal_name,
            shortName: 'Huế',
            brandShort: 'VNPost Huế',
            leaderLabel: 'BĐTP',
        });
        assert.equal(provinceConfig.isCatalogAutofillEnabled(), false);
        assert.equal(provinceConfig.hasConfiguredProvinceCode(), false);
        assert.throws(() => provinceConfig.formatForPortal('other'), { code: 'PROVINCE_FORMAT_INVALID' });
    });
});

test('P2: province edition throws PROVINCE_CONFIG_NOT_LOADED before load()', async () => {
    await withEdition('province', async () => {
        assert.throws(() => provinceConfig.getProvinceCode(), { code: 'PROVINCE_CONFIG_NOT_LOADED' });
        assert.throws(() => provinceConfig.formatForPortal('plain'), { code: 'PROVINCE_CONFIG_NOT_LOADED' });
        assert.throws(() => provinceConfig.getDisplay(), { code: 'PROVINCE_CONFIG_NOT_LOADED' });
        assert.throws(() => provinceConfig.getRouteLikePattern(), { code: 'PROVINCE_CONFIG_NOT_LOADED' });
    });
});

test('P2: province edition refuses to load while province_configured is not 1', async () => {
    await withEdition('province', async () => {
        await assert.rejects(provinceConfig.load(await memoryDb(PROVINCE_ROWS('46', '0'))), { code: 'PROVINCE_NOT_CONFIGURED' });
        await assert.rejects(provinceConfig.load(await memoryDb([])), { code: 'PROVINCE_NOT_CONFIGURED' });
        assert.equal(provinceConfig.isLoaded(), false);
    });
});

test('province edition: code 46 loaded, three portal formats and route pattern', async () => {
    await withEdition('province', async () => {
        await provinceConfig.load(await memoryDb(PROVINCE_ROWS('46')));
        assert.equal(provinceConfig.getProvinceCode(), '46');
        assert.equal(provinceConfig.formatForPortal('plain'), '46');
        assert.equal(provinceConfig.formatForPortal('nquoted'), "N'46'");
        assert.equal(provinceConfig.formatForPortal('numeric'), 46);
        assert.equal(provinceConfig.getRouteLikePattern(), '46%');
        assert.equal(provinceConfig.getDisplay().shortName, 'X');
        assert.equal(provinceConfig.isCatalogAutofillEnabled(), true);
    });
});

test('P3: a malformed province code is refused by load()', async () => {
    for (const bad of ['4', '046', "46' OR 1=1", '4a', '', ' 46']) {
        await withEdition(undefined, async () => {
            await assert.rejects(provinceConfig.load(await memoryDb([['default_province_code', bad]])), { code: 'PROVINCE_CODE_INVALID' }, `full ${JSON.stringify(bad)}`);
        });
        await withEdition('province', async () => {
            await assert.rejects(provinceConfig.load(await memoryDb(PROVINCE_ROWS(bad))), { code: 'PROVINCE_CODE_INVALID' }, `province ${JSON.stringify(bad)}`);
        });
    }
});

test('an unknown QIS_EDITION value stops', async () => {
    await withEdition('weird', async () => {
        assert.throws(() => provinceConfig.getProvinceCode(), { code: 'PROVINCE_EDITION_INVALID' });
    });
});

test('reload() picks up an edited display name', async () => {
    await withEdition(undefined, async () => {
        const db = await memoryDb([['default_province_code', '53'], ['display_short_name', 'A']]);
        await provinceConfig.load(db);
        assert.equal(provinceConfig.getDisplay().shortName, 'A');
        await new Promise((resolve, reject) => db.run("UPDATE system_config SET config_value = 'B' WHERE config_key = 'display_short_name'", (e) => (e ? reject(e) : resolve())));
        await provinceConfig.reload(db);
        assert.equal(provinceConfig.getDisplay().shortName, 'B');
        assert.equal(provinceConfig.hasConfiguredProvinceCode(), true);
    });
});

// ---- migration ----
function tempDbPath() {
    return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prov-pkg-mig-')), 'db.sqlite');
}
function readConfig(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all('SELECT config_key, config_value FROM system_config ORDER BY config_key', (error, rows) => {
            db.close(() => (error ? reject(error) : resolve(Object.fromEntries(rows.map((r) => [r.config_key, r.config_value])))));
        });
    });
}

test('migration seeds the Hue values (full) and never overwrites an existing value', async () => {
    await withEdition(undefined, async () => {
        const dbPath = tempDbPath();
        await applyProvPkg01SystemConfigKeysSchema(dbPath);
        const first = await readConfig(dbPath);
        assert.equal(first.display_unit_name, HUE_DEFAULTS.display_unit_name);
        assert.equal(first.province_configured, '1');
        assert.equal(first.unit_catalog_autofill, 'off');
        assert.equal(first.default_province_code, undefined, 'default_province_code belongs to schema.sql, not to this migration');
        const db = new sqlite3.Database(dbPath);
        await new Promise((resolve, reject) => db.run("UPDATE system_config SET config_value = 'đã sửa' WHERE config_key = 'display_short_name'", (e) => (e ? reject(e) : resolve())));
        await new Promise((resolve) => db.close(resolve));
        await applyProvPkg01SystemConfigKeysSchema(dbPath);
        assert.equal((await readConfig(dbPath)).display_short_name, 'đã sửa');
    });
});

test('migration seeds empty display values and province_configured=0 for the province edition', async () => {
    await withEdition('province', async () => {
        const dbPath = tempDbPath();
        await applyProvPkg01SystemConfigKeysSchema(dbPath);
        const rows = await readConfig(dbPath);
        assert.equal(rows.display_short_name, '');
        assert.equal(rows.province_configured, '0');
        assert.equal(rows.unit_catalog_autofill, 'on');
        assert.equal(rows.unit_leader_label, 'đơn vị');
    });
});
