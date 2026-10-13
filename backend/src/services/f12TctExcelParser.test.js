const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseF12TctExcel, F12_TCT_DB_COLUMNS } = require('./f12TctExcelParser');
const { f12TctBuffer, population } = require('../../test/f12TctFixture');

const NAME = 'F1.2-2026.10.10.xlsx';

test('fixture: total row skipped and checked, codes text, rate kept raw, non-ranked units stored', () => {
    const result = parseF12TctExcel(f12TctBuffer(population({}, [{ code: '01', den: 500, ok: 450 }, { code: 73, den: 100, ok: 150, tms: 200 }])), NAME);
    assert.equal(result.totalParsed, 36);
    assert.equal(result.grandTotalChecked, true);
    assert.equal(result.ngayDoKiem, '2026-10-10');
    const hanoi = result.parsedData.find((r) => r.ma_tinh_chap_nhan === '10');
    assert.equal(typeof hanoi.ma_tinh_chap_nhan, 'string');
    assert.equal(hanoi.tl_dung_qd, '90.00%');
    assert.ok(result.parsedData.some((r) => r.ma_tinh_chap_nhan === '01'));
    assert.ok(result.parsedData.some((r) => r.ma_tinh_chap_nhan === '73'));
    assert.equal(F12_TCT_DB_COLUMNS.length, 20);
});

test('a grand total that differs from the rows refuses the file', () => {
    const buffer = f12TctBuffer(population(), { totalOverride: (row) => { row[9] += 1; return row; } });
    assert.throws(() => parseF12TctExcel(buffer, NAME), /Grand total does not equal.*sl_dung_qd/);
});

test('parcels without an accepting province are not stored but the grand total still counts them, wherever the total sits', () => {
    for (const totalAfterUnassigned of [false, true]) {
        const buffer = f12TctBuffer(population(), { unassigned: [{ den: 2, ok: 1 }], totalAfterUnassigned });
        const result = parseF12TctExcel(buffer, NAME);
        assert.equal(result.totalParsed, 34);
        assert.equal(result.grandTotalChecked, true);
        assert.ok(result.parsedData.every((r) => r.ma_tinh_chap_nhan));
        assert.deepEqual([result.unassigned.sl_bd10_dong_di, result.unassigned.sl_dung_qd], [2, 1]);
    }
});

test('the outer-summary reconciliation counts the unassigned parcels, because the portal summary does', () => {
    const { F12TctSingleDateService } = require('./f12SingleDateServices');
    const service = new F12TctSingleDateService({ logger: { warn() {} } });
    const parsed = parseF12TctExcel(f12TctBuffer(population(), { unassigned: [{ den: 2, ok: 1 }] }), NAME);
    const stored = (column) => parsed.parsedData.reduce((sum, r) => sum + r[column], 0);
    const summary = { totalVolume: stored('sl_bd10_dong_di') + 2, evaluatedVolume: stored('sl_bd10_quet_tms') + 2, passedVolume: stored('sl_dung_qd') + 1, failedVolume: stored('sl_qua_qd') + 1 };
    assert.equal(service.reconcile(parsed, summary).reconciliation.exact, true);
    assert.throws(() => service.reconcile(parsed, { ...summary, totalVolume: summary.totalVolume - 2 }), /does not reconcile/);
});

test('a grand total that does not match once the unassigned rows are counted still refuses the file', () => {
    const buffer = f12TctBuffer(population(), { unassigned: [{ den: 2, ok: 1 }], totalOverride: (row) => { row[9] += 1; return row; } });
    assert.throws(() => parseF12TctExcel(buffer, NAME), /Grand total does not equal/);
});

test('a missing ranked province, a duplicated province or an office-level export refuses the file', () => {
    const missing = population().filter((spec) => spec.code !== '53');
    assert.throws(() => parseF12TctExcel(f12TctBuffer(missing), NAME), /Missing accepting province code\(s\): 53/);
    assert.throws(() => parseF12TctExcel(f12TctBuffer([...population(), { code: '53', den: 1, ok: 1 }]), NAME), /53 appears more than once/);
    const byOffice = population({ 53: { office: 531120 } });
    assert.throws(() => parseF12TctExcel(f12TctBuffer(byOffice), NAME), /grouped by office or customer/);
});

test('the F1.2 file-name rule applies to the TCT lane too', () => {
    assert.throws(() => parseF12TctExcel(f12TctBuffer(), 'F1.2_CL_thu_gom_buu_giay_lien_tinh.xlsx'), /F1\.2-YYYY\.MM\.DD/);
});

// Real national file of the same export session (git-ignored under Data DKCL): skipped when absent.
const REAL_TCT = process.env.F12_REAL_TCT_FILE || path.resolve(__dirname, '../../../Data DKCL/F1.2-TCT-2026.10.10.xlsx');

test('real national file 10/10/2026: 53 units, grand total verified, Huế row = the Huế detail', { skip: fs.existsSync(REAL_TCT) ? false : 'PO TCT file not present on this machine' }, () => {
    const result = parseF12TctExcel(fs.readFileSync(REAL_TCT), NAME);
    assert.equal(result.totalParsed, 53);
    assert.equal(result.grandTotalChecked, true);
    const hue = result.parsedData.find((r) => r.ma_tinh_chap_nhan === '53');
    assert.deepEqual(
        [hue.sl_bd10_dong_di, hue.sl_bd10_quet_tms, hue.sl_dung_qd, hue.sl_qua_qd, hue.sl_chua_du_thong_tin, hue.tl_dung_qd],
        [1758, 1758, 1620, 138, 133, '92.15%'],
    );
    assert.deepEqual(
        [hue.sl_tg_le_10h, hue.sl_tg_le_12h, hue.sl_tg_12_24h, hue.sl_tg_24_36h, hue.sl_tg_36_48h, hue.sl_tg_tren_48h],
        [1620, 1681, 63, 13, 0, 1],
    );
    assert.equal(result.parsedData.find((r) => r.ten_tinh_chap_nhan === 'Tổng công ty EMS').ma_tinh_chap_nhan, '01');
});
