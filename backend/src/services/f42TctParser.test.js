const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseF42Tct, F42_TCT_DB_COLUMNS } = require('./f42TctParser');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./nationalExcelParser');
const { tctBuffer, tctPopulation } = require('../../test/f42Fixtures');

const FILE = 'F4.2-2026.10.10.xlsx';
const REAL_FILE = path.resolve(__dirname, '../../../Data DKCL/F4.2-TCT-2026.10.10.xlsx');

test('adds the postman rows per province and returns exactly the 34 ranked provinces', () => {
    const extra = [
        { code: '01', postman: 'EMS1', gbt: 900, ok: 800 },
        { code: '82', postman: '82A1', gbt: 94, ok: 80 },
        { code: '-1', postman: 'X1', gbt: 303, ok: 0, name: 'Khong Xac Dinh' },
    ];
    const result = parseF42Tct(tctBuffer(tctPopulation({}, extra)), FILE);
    assert.equal(result.totalParsed, 34);
    assert.equal(result.ngayDoKiem, '2026-10-10');
    assert.deepEqual(result.parsedData.map((r) => r.ma_tinh_phat), [...NATIONAL_RANKED_PROVINCE_CODES]);
    const hue = result.parsedData.find((r) => r.ma_tinh_phat === '53');
    assert.equal(hue.sl_gbt, 1000);
    assert.equal(hue.sl_dung_qd, 800);
    assert.equal(hue.sl_qua_qd, 20);
    assert.equal(hue.sl_phat_thanh_cong, 820);
    assert.equal(hue.so_buu_ta, 2);
    assert.equal(hue.tl_dung_qd, '80.00%');
    assert.ok(F42_TCT_DB_COLUMNS.every((column) => column in hue));
    assert.equal(result.postmanRows, 68 + 3);
    assert.deepEqual(result.notStored, { sl_gbt: 900 + 94 + 303, sl_dung_qd: 880 });
});

test('a postman without volume is not counted as a postman of the day', () => {
    const result = parseF42Tct(tctBuffer(tctPopulation({ 53: { second: { gbt: 0, ok: 0, late: 0 } } })), FILE);
    assert.equal(result.parsedData.find((r) => r.ma_tinh_phat === '53').so_buu_ta, 1);
});

test('refuses a grand total that differs from the rows', () => {
    const edited = tctBuffer(tctPopulation(), { totalOverride: (total) => { total[10] += 1; return total; } });
    assert.throws(() => parseF42Tct(edited, FILE), /Grand total does not equal the sum of the rows: sl_gbt total \d+ vs rows \d+/);
});

test('refuses a file missing a ranked province, naming it', () => {
    const specs = tctPopulation().filter((s) => s.code !== '97');
    assert.throws(() => parseF42Tct(tctBuffer(specs), FILE), /Missing delivering province code\(s\): 97/);
});

test('refuses a layout that is not the postman report and a CSV for the TCT lane', () => {
    assert.throws(() => parseF42Tct(Buffer.from('a,b'), 'F4.2-2026.10.10.csv'), /must be the Excel export/);
    const xlsx = require('xlsx');
    const sheet = xlsx.utils.aoa_to_sheet([['TT', 'Mã tỉnh'], [1, 2]]);
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'S');
    assert.throws(() => parseF42Tct(xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }), FILE), /Unexpected layout/);
});

test('the real 10/10/2026 national file: Hue 6 466 / 4 475 = 69,21 %, grand total 516 597 / 393 197', { skip: !fs.existsSync(REAL_FILE) }, () => {
    const result = parseF42Tct(fs.readFileSync(REAL_FILE), FILE);
    assert.equal(result.totalParsed, 34);
    assert.equal(result.postmanRows, 13665);
    assert.deepEqual(result.grandTotal, { sl_gbt: 516597, sl_dung_qd: 393197 });
    const hue = result.parsedData.find((r) => r.ma_tinh_phat === '53');
    assert.deepEqual([hue.sl_gbt, hue.sl_phat_thanh_cong, hue.sl_dung_qd, hue.sl_qua_qd, hue.tl_dung_qd], [6466, 5232, 4475, 757, '69.21%']);
    assert.equal(hue.so_buu_ta, 128);
    assert.equal(result.parsedData.reduce((s, r) => s + r.sl_gbt, 0), 511645);
});
