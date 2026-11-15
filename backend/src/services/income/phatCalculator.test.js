// INC-PHAT-02 - pure calculators, FAKE data only (no real names, HRM codes or pay). Expected values are worked out by hand from FROZEN_RULES.
const test = require('node:test');
const assert = require('node:assert/strict');

const { calculatePhat, phanLoai, tienCongKg } = require('./phatCalculator');
const { calculateHscl, hsclLimits } = require('./hsclCalculator');
const { pyRound, round4, makeParamReader, khongSlRoutes, priceMap } = require('./incParams');

const T08 = []; // MOT_LAN 0, TOAN_BO 0 (defaults)
const T09 = [{ khoa: 'PTC_MOT_LAN_SO_HIEU', gia_tri: 1, hieu_luc_tu: '2026-09' }, { khoa: 'HSCL_PHAT_TOAN_BO', gia_tri: 1, hieu_luc_tu: '2026-09' }];
const base = [{ khoa: 'TRAN_BUU_GUI', gia_tri: 120000, hieu_luc_tu: '2026-05' }, { khoa: 'CTV_DON_GIA', gia_tri: 6000, hieu_luc_tu: '2026-01' }];

const parcel = (over) => ({ so_hieu: 'A1', ma_buu_ta: 'P1', ma_tuyen: 'R1', trang_thai: 'PTC', service_code: 'E', type_code: 'DV_N_KCOD', service_name: 'E-EMS(trừ E-Báo phát và E-Hỏa tốc)', area: 'NT', kg_gram: 500, quantity: 1, ma_lo: '', ngay: '20260905', ...over });
function setup(paramRows, ky = '2026-09', extra = {}) {
    return {
        ky,
        param: makeParamReader([...base, ...paramRows], ky),
        catalog: {
            routeGroups: new Map([['R1', { nhom: 1, ten_bc: 'BCP Gia' }], ['R2', { nhom: 2, ten_bc: '' }]]),
            postmen: new Map([['P1', { ma_hrm: '00000001', ho_ten: 'NGUOI GIA A', loai_hd: 'HĐLĐ', don_vi: 'BCVH Hương Trà' }], ['P2', { ma_hrm: '00000002', ho_ten: 'NGUOI GIA B', loai_hd: 'HĐLĐ', don_vi: 'BCVH Hương Thuỷ' }], ['P3', { ma_hrm: '00000003', ho_ten: 'NGUOI GIA C', loai_hd: 'CTV', don_vi: '' }]]),
            employees: new Map(), ctv: new Set(), postmanUnit: new Map(), khongSl: new Set(),
            ...(extra.catalog || {}),
        },
        prices: { phat: priceMap([['EMS', 1, 1000], ['PH', 1, 200], ['KG_2_15', 1, 100], ['KG_TREN_15', 1, 50], ['EMS', 2, 3000]]), phatMa: new Map(), ...(extra.prices || {}) },
        hscl: extra.hscl || new Map(),
        external: extra.external || {}, adjustments: extra.adjustments || new Map(), traiGiam: extra.traiGiam || [],
    };
}
const byHrm = (result, hrm) => result.rows.find((r) => r.ma_hrm === hrm);

test('Python rounding: half to even, and the HSCL ratio to 4 decimals', () => {
    assert.deepEqual([0.5, 1.5, 2.5, 3.5, -2.5, 2.4, 2.6].map(pyRound), [0, 2, 2, 4, -2, 2, 3]);
    assert.equal(round4(0.75756), 0.7576);
});

test('parameter in force: greatest hieu_luc_tu <= period; routes not paid by volume', () => {
    const rows = [{ khoa: 'X', gia_tri: 1, hieu_luc_tu: '2026-05' }, { khoa: 'X', gia_tri: 2, hieu_luc_tu: '2026-09' }, { khoa: 'TUYEN_KHONG_SL:555', gia_tri: 1, hieu_luc_tu: '2026-05' }, { khoa: 'TUYEN_KHONG_SL:666', gia_tri: 0, hieu_luc_tu: '2026-05' }];
    assert.equal(makeParamReader(rows, '2026-08')('X', 0), 1);
    assert.equal(makeParamReader(rows, '2026-10')('X', 0), 2);
    assert.equal(makeParamReader(rows, '2026-04')('X', 7), 7, 'not yet in force -> default');
    assert.deepEqual([...khongSlRoutes(rows, '2026-09')], ['555']);
});

test('service mapping and the kg surcharge (each started kg; 2-15 kg and above 15 kg)', () => {
    assert.equal(phanLoai('E', 'DV_N_COD', 'E-EMS', 'NT'), 'EMSCOD');
    assert.equal(phanLoai('E', 'DV_N_KCOD', 'E-Hỏa tốc', 'NT'), 'EMSHT');
    assert.equal(phanLoai('C', 'DV_T_COD', 'C-Bưu kiện', 'NT'), 'BKCOD');
    assert.equal(phanLoai('R', 'X', 'R-Báo Phát', 'NT'), 'BAOPHAT');
    assert.equal(phanLoai('E', 'X', 'E-EMS', 'QT'), 'QT');
    assert.equal(phanLoai('M', 'KT1', 'KT1', 'NT'), 'KT1');
    assert.equal(phanLoai('Z', 'X', 'Y', 'NT'), null);
    const gia = priceMap([['KG_2_15', 1, 100], ['KG_TREN_15', 1, 50]]);
    assert.equal(tienCongKg(gia, 1, 2), 0);
    assert.equal(tienCongKg(gia, 1, 5.5), 400);              // 3.5 kg above 2 -> 4 started kg
    assert.equal(tienCongKg(gia, 1, 20), 13 * 100 + 5 * 50);  // 13 kg in 2-15, 5 kg above 15
});

test('T09 parameters: one count per parcel number, the first +1 row wins, QUANTITY -1 rows are dropped, duplicates warned', () => {
    const parcels = [parcel({ ma_buu_ta: 'P1' }), parcel({ ma_buu_ta: 'P1', quantity: -1 }), parcel({ ma_buu_ta: 'P2' })];
    const r = calculatePhat({ ...setup(T09), parcels });
    assert.equal(byHrm(r, '00000001').cp_buu_gui, 1000);
    assert.equal(byHrm(r, '00000001').so_ptc, 1);
    assert.equal(byHrm(r, '00000002'), undefined, 'the later +1 row of the same number is not paid');
    assert.ok(r.warnings.some(([k, v]) => k === 'Trùng số hiệu' && v.includes('Bỏ 1 dòng')));
    // the order of rows decides who is paid
    const reversed = calculatePhat({ ...setup(T09), parcels: [parcel({ ma_buu_ta: 'P2' }), parcels[0], parcels[1]] });
    assert.equal(byHrm(reversed, '00000002').cp_buu_gui, 1000);
    assert.equal(byHrm(reversed, '00000001'), undefined);
});

test('T08 parameters: signed QUANTITY is summed per (postman, number, status, route); a cancelled number pays nobody', () => {
    const parcels = [parcel({ ma_buu_ta: 'P1' }), parcel({ ma_buu_ta: 'P1', quantity: -1 }), parcel({ ma_buu_ta: 'P2' })];
    const r = calculatePhat({ ...setup(T08, '2026-08'), parcels });
    assert.equal(byHrm(r, '00000001'), undefined, '+1 and -1 of the same postman cancel out');
    assert.equal(byHrm(r, '00000002').cp_buu_gui, 1000);
});

test('PH, ceiling per parcel, kg surcharge, price by reference code first, route without group, unmapped service', () => {
    const parcels = [
        parcel({ so_hieu: 'B1', trang_thai: 'PH' }), parcel({ so_hieu: 'B1', trang_thai: 'PH', quantity: 1, ma_buu_ta: 'P1' }),
        parcel({ so_hieu: 'B2', kg_gram: 20000 }),
        parcel({ so_hieu: 'B3', ma_tuyen: 'R9' }),
        parcel({ so_hieu: 'B4', service_code: 'Z', type_code: 'X', service_name: 'Lạ' }),
        parcel({ so_hieu: 'B5', service_code: 'E', type_code: 'DV_N_KCOD', service_name: 'MÃ RIÊNG', area: 'NT' }),
    ];
    const s = setup(T09, '2026-09', { prices: { phatMa: priceMap([['EDV_N_KCODMÃ RIÊNGNT', 1, 777]]) } });
    const r = calculatePhat({ ...s, parcels });
    const row = byHrm(r, '00000001');
    assert.equal(row.cp_ph, 200);                                         // one PH parcel counted once (T09)
    assert.equal(row.cp_buu_gui, 1000 + 1550 + 777);                      // B2 with kg surcharge 13x100 + 5x50 ; B5 by reference code ; B4/B3 not paid
    assert.ok(r.warnings.some(([k, v]) => k === 'Tuyến' && v.includes('R9')));
    assert.ok(r.warnings.some(([k, v]) => k === 'Dịch vụ' && v.includes('Lạ')));
    const capped = calculatePhat({ ...setup([...T09, { khoa: 'TRAN_BUU_GUI', gia_tri: 1200, hieu_luc_tu: '2026-09' }]), parcels: [parcel({ kg_gram: 20000 })] });
    assert.equal(byHrm(capped, '00000001').cp_buu_gui, 1200, 'the ceiling applies to one parcel');
});

test('route not paid by volume: no money, and the postman is not in the totals unless something else is paid (as PMTL)', () => {
    const s = setup(T09, '2026-09', { catalog: { khongSl: new Set(['R1']) } });
    const r = calculatePhat({ ...s, parcels: [parcel({ ma_buu_ta: 'P1' }), parcel({ so_hieu: 'A2', ma_buu_ta: 'P2', ma_tuyen: 'R2' })] });
    assert.equal(byHrm(r, '00000001'), undefined);
    assert.equal(byHrm(r, '00000002').cp_buu_gui, 3000);
    assert.ok(r.details.some((d) => d.khoan === 'Không tính SL' && d.thanh_tien === 0));
});

test('HSCL scope: T09 multiplies numbered parcels, PH, BP thường and DHL; T08 only numbered parcels; PHBC never', () => {
    const hscl = new Map([['P1', { hs: 0.9 }]]);
    const external = { lines: [{ ma_buu_ta: 'P1', ma_tuyen: 'R1', nhom: 1, khoan: 'BPT', so_luong: 10, thanh_tien: 1000 }, { ma_buu_ta: 'P1', ma_tuyen: 'R1', nhom: 1, khoan: 'PHBC', so_luong: 5, thanh_tien: 500 }], dhlByHrm: new Map([['00000001', 2000]]) };
    const parcels = [parcel(), parcel({ so_hieu: 'A2', trang_thai: 'PH' })];
    const t09 = byHrm(calculatePhat({ ...setup(T09, '2026-09', { hscl, external }), parcels }), '00000001');
    assert.deepEqual([t09.cp_buu_gui, t09.cp_ph, t09.cp_bpt, t09.cp_dhl, t09.cp_phbc], [900, 180, 900, 1800, 500]);
    assert.equal(t09.hscl, 0.9); assert.equal(t09.cp_truoc_hscl, 1000 + 200 + 1000 + 2000); assert.equal(t09.cp_sau_hscl, 900 + 180 + 900 + 1800);
    assert.equal(t09.tong, 900 + 180 + 900 + 1800 + 500);
    const t08 = byHrm(calculatePhat({ ...setup(T08, '2026-08', { hscl, external }), parcels: [parcel(), parcel({ so_hieu: 'A2', trang_thai: 'PH', quantity: 1 })] }), '00000001');
    assert.deepEqual([t08.cp_buu_gui, t08.cp_ph, t08.cp_bpt, t08.cp_dhl, t08.cp_phbc], [900, 200, 1000, 2000, 500]);
    assert.equal(t08.hscl, 0.9);
});

test('adjustments, Trại giam (multiplied by the HRM ratio from T09), CTV top-up, totals rounded item by item', () => {
    const hscl = new Map([['P1', { hs: 0.5 }]]);
    const s = setup(T09, '2026-09', { hscl, adjustments: new Map([['00000001', 3000]]), traiGiam: [{ ma_hrm: '00000001', ho_ten: 'NGUOI GIA A', thanh_tien: 500000 }], catalog: { ctv: new Set(['P3']) } });
    const r = calculatePhat({ ...s, parcels: [parcel(), parcel({ so_hieu: 'A9', ma_buu_ta: 'P3' })] });
    const a = byHrm(r, '00000001');
    assert.equal(a.cp_buu_gui, 500); assert.equal(a.cp_trai_giam, 250000); assert.equal(a.cp_dieu_chinh, 3000); assert.equal(a.tong_khong_phbc, 500 + 250000 + 3000);
    const c = byHrm(r, '00000003');
    assert.equal(c.cp_buu_gui, 1000); assert.equal(c.bo_sung_ctv, 6000 * 1 - 1000); assert.equal(c.tong, 6000, 'a CTV is brought up to 6.000 per delivered parcel');
    const half = calculatePhat({ ...setup(T09, '2026-09', { prices: { phat: priceMap([['EMS', 1, 1.25]]) } }), parcels: [parcel(), parcel({ so_hieu: 'A2' })] });
    assert.equal(byHrm(half, '00000001').cp_buu_gui, 2, '2.5 rounds to 2 (half to even), not 3');
});

test('unit of the HRM: explicit assignment, then 8,6,11 / employee file / route, then Thuận Hóa; spelling variants match', () => {
    const r = calculatePhat({ ...setup(T09, '2026-09', { catalog: { postmanUnit: new Map([['P1', 'BCVH Phú Lộc']]) } }), parcels: [parcel({ ma_buu_ta: 'P1' }), parcel({ so_hieu: 'A2', ma_buu_ta: 'P2' }), parcel({ so_hieu: 'A3', ma_buu_ta: 'P3' })] });
    assert.equal(byHrm(r, '00000001').don_vi, 'BCVH Phú Lộc');
    assert.equal(byHrm(r, '00000002').don_vi, 'BCVH Hương Thủy', 'Thuỷ == Thủy');
    assert.equal(byHrm(r, '00000003').don_vi, 'BCVH Thuận Hóa', 'nothing known -> default');
});

test('days without parcel data are warned; an unknown postman is paid under ?code with a warning; no price table is an error', () => {
    const parcels = []; for (let d = 1; d <= 30; d += 1) if (d !== 10) for (let k = 0; k < 20; k += 1) parcels.push(parcel({ so_hieu: `D${d}-${k}`, ngay: `202609${String(d).padStart(2, '0')}`, ma_buu_ta: 'PX' }));
    const r = calculatePhat({ ...setup(T09), parcels });
    assert.ok(r.warnings.some(([k, v]) => k === 'Thiếu ngày' && v.startsWith('Ngày 10/09/2026')));
    assert.ok(r.warnings.some(([k, v]) => k === 'HRM' && v.includes('PX')));
    assert.ok(byHrm(r, '?PX'));
    assert.throws(() => calculatePhat({ ...setup(T09), prices: { phat: new Map(), phatMa: new Map() }, parcels }), /Chưa có bảng đơn giá/);
});

test('HSCL: clamp, exemption, penalty (capped at 30), no F4.2 sales, scope by BCVH before T09', () => {
    const f42 = [
        { ma_buu_ta: 'A', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 99 },     // 0.99/0.9 = 1.1 -> clamp max 1.02
        { ma_buu_ta: 'B', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 50 },     // 0.5555 -> min 0.98
        { ma_buu_ta: 'C', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 45 },     // exempt
        { ma_buu_ta: 'D', ho_ten: 'x', ten_bc: 'BCP Gia', sl_mau: 100, sl_dung: 50 },      // not a BCVH
        { ma_buu_ta: 'E', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 0, sl_dung: 0 },
        { ma_buu_ta: 'F', ho_ten: 'x', ten_bc: 'BCVH Gia', sl_mau: 100, sl_dung: 90 },     // 1.0 x (100-50 capped to 30)/100 = 0.7
    ];
    const common = { f42Rows: f42, mien: new Map([['C', 'thu viec']]), penalties: new Map([['F', 50]]) };
    const t08 = calculateHscl({ ...common, limits: { kh: 0.9, min: 0.98, max: 1.02, toanBo: false } });
    assert.deepEqual(['A', 'B', 'C', 'D', 'E', 'F'].map((k) => t08.get(k).hs), [1.02, 0.98, 1, 1, 1, 0.98]);
    const t09 = calculateHscl({ ...common, limits: { kh: 0.9, min: 0.7, max: 1.1, toanBo: true } });
    const f = t09.get('F'); assert.equal(f.diem, 30); assert.ok(Math.abs(f.hs - 0.7) < 1e-12);
    assert.deepEqual(['A', 'B', 'C', 'D', 'E'].map((k) => Number(t09.get(k).hs.toFixed(4))), [1.1, 0.7, 1, 0.7, 0.7]);
    assert.equal(calculateHscl({ f42Rows: [], limits: { kh: 0.9, min: 0.7, max: 1.1, toanBo: true } }).size, 0);
    assert.deepEqual(hsclLimits(makeParamReader([{ khoa: 'HSCL_PHAT_MIN', gia_tri: 0.98, hieu_luc_tu: '2026-08' }], '2026-08')), { kh: 0.9, min: 0.98, max: 1.1, toanBo: false });
});

test('parcel lot (GOP_LO = 1): each parcel gets its base price, the kg surcharge counts the whole lot, the lot ceiling is max(ceiling, base total)', () => {
    const lot = [parcel({ so_hieu: 'L1', kg_gram: 10000, ma_lo: 'LO1' }), parcel({ so_hieu: 'L2', kg_gram: 10000, ma_lo: 'LO1' })];
    const open = calculatePhat({ ...setup([...T09, { khoa: 'GOP_LO', gia_tri: 1, hieu_luc_tu: '2026-09' }]), parcels: lot });
    assert.equal(byHrm(open, '00000001').cp_buu_gui, 2000 + 13 * 100 + 5 * 50, '20 kg in the lot: 13 kg at 100 and 5 kg at 50');
    assert.ok(open.details.some((d) => d.khoan === 'LÔ' && d.so_luong === 2));
    const capped = calculatePhat({ ...setup([...T09, { khoa: 'GOP_LO', gia_tri: 1, hieu_luc_tu: '2026-09' }, { khoa: 'TRAN_BUU_GUI', gia_tri: 1200, hieu_luc_tu: '2026-09' }]), parcels: lot });
    assert.equal(byHrm(capped, '00000001').cp_buu_gui, 2000, 'ceiling 1.200 < base total 2.000 -> the base total');
});
