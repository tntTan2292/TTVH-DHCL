const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseF11TctExcel, F11_TCT_DB_COLUMNS } = require('./f11TctExcelParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');
const { HEADER, defaultSpecs, buildTctWorkbookBuffer } = require('../../test/f11TctFixture');

const NAME = 'F1.1-2026.10.07.xlsx';

test('parses the layout, skips the grand-total row, keeps codes as text and takes the date from the file name', () => {
    const specs = [...defaultSpecs(), { acc: '01', accName: 'Tổng công ty EMS', del: 10, den: 500, ok: 450 }];
    const result = parseF11TctExcel(buildTctWorkbookBuffer(specs), NAME);
    assert.equal(result.totalParsed, 35);
    assert.equal(result.ngayDoKiem, '2026-10-07');
    assert.equal(result.grandTotalChecked, true);
    const cross = result.parsedData.find((row) => row.ma_tinh_chap_nhan === '01');
    assert.deepEqual(
        { acc: cross.ma_tinh_chap_nhan, del: cross.ma_tinh_phat, den: cross.sl_theo_chi_tieu, ok: cross.sl_dung_chi_tieu },
        { acc: '01', del: '10', den: 500, ok: 450 },
    );
    assert.equal(typeof cross.ma_tinh_phat, 'string');
    assert.equal(result.parsedData.every((row) => row.ngay_do_kiem === '2026-10-07'), true);
    assert.equal(F11_TCT_DB_COLUMNS.length, 29);
    assert.equal(result.dbColumns.length, 30);
});

test('a path is accepted; a wrong file-name family is refused', () => {
    assert.equal(parseF11TctExcel(buildTctWorkbookBuffer(), `D:\\x\\${NAME}`).ngayDoKiem, '2026-10-07');
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(), 'F4.1-2026.10.07.xlsx'), /F1\.1/);
});

test('a grand total that differs from the body is refused', () => {
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(defaultSpecs(), { breakTotal: true }), NAME), /Grand total does not equal/);
});

test('a missing ranked province (as a delivering province) is refused and listed', () => {
    const specs = defaultSpecs().filter((spec) => !['53', '39'].includes(String(spec.del)));
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(specs), NAME), (error) => /Missing delivering province/.test(error.message) && error.message.includes('39') && error.message.includes('53'));
});

test('the completeness rule counts the DELIVERING province, not the accepting one', () => {
    // Hue present only as an accepting province -> still missing as a delivering province
    const specs = defaultSpecs().filter((spec) => String(spec.del) !== '53');
    specs.push({ acc: '53', del: 70, den: 10, ok: 9 });
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(specs), NAME), /Missing delivering province.*53/);
});

test('a duplicated province pair is refused', () => {
    const specs = [...defaultSpecs(), { acc: '53', del: 53, den: 1, ok: 1 }];
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(specs), NAME), /Duplicate province pair 53 -> 53/);
});

test('a drifted header layout is refused and names the column', () => {
    const drifted = [...HEADER];
    drifted[18] = 'Chỉ tiêu khác';
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(defaultSpecs(), { header: drifted }), NAME), /Unexpected layout at: column 19/);
});

test('a non-numeric count is refused with the column and row', () => {
    const specs = defaultSpecs();
    specs[0].den = 'abc';
    assert.throws(() => parseF11TctExcel(buildTctWorkbookBuffer(specs), NAME), /expected a whole count/);
});

// ---- real single-day TCT file (kept after the first live load under Data DKCL/F1.1/Processed/TCT) ----
const REAL_TCT = process.env.F11_REAL_TCT_FILE
    || path.resolve(__dirname, '../../../Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx');

test('real single-day TCT file: 84 rows, 34 ranked provinces present, grand total verified', { skip: fs.existsSync(REAL_TCT) ? false : 'PO TCT file not present on this machine' }, () => {
    const result = parseF11TctExcel(fs.readFileSync(REAL_TCT), NAME);
    assert.equal(result.totalParsed, 84);
    assert.equal(result.grandTotalChecked, true);
    const delivering = new Set(result.parsedData.map((row) => row.ma_tinh_phat));
    for (const code of NATIONAL_RANKED_PROVINCE_CODES) assert.ok(delivering.has(code), code);
    const hue = result.parsedData.filter((row) => row.ma_tinh_phat === '53');
    assert.equal(hue.length, 1);
    assert.deepEqual(
        {
            co_tt: hue[0].sl_co_thong_tin_phat, ch: hue[0].sl_ptc_nop_tien_ch, den: hue[0].sl_theo_chi_tieu,
            ok: hue[0].sl_dung_chi_tieu, qua: hue[0].sl_qua_chi_tieu, le24: hue[0].sl_tg_le_24h, loaitru: hue[0].sl_loai_tru,
        },
        { co_tt: 2621, ch: 2589, den: 2588, ok: 2348, qua: 240, le24: 2400, loaitru: 20 },
    );
});
