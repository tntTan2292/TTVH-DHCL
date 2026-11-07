'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { JourneyService, parseTime, cleanBagNumber, legHours, median, pickHandover, pickFirstHandover, pickArrival, parseBatchFileTime, pickBatchFileArrival } = require('./JourneyService');

const DATE = '2026-10-28';
const OWN = '536250'; // BCVH Hương Thủy
const OTHER = '533140'; // BCVH Thuận Hóa

function f13(ma_bg, overrides = {}) {
    return {
        ma_bg,
        ma_bcvh: OWN,
        ten_bcvh: 'BCVH Hương Thủy',
        ma_tuyen: 'T1',
        ten_tuyen: 'Tuyến 1',
        danh_gia_2026: 'Đạt',
        thoi_gian_bd10_quet_tms: '28/10/2026 07:54:29',
        thoi_gian_ptc: '28/10/2026 17:12:41',
        thoi_gian_thuc_hien_thuc_te_gio: '9:18',
        ...overrides,
    };
}

function serviceWith({ parcels = [], f41 = [], f42 = [], f11 = [], lots = [], scans = [] }) {
    const calls = {};
    return {
        calls,
        service: new JourneyService({
            repository: {
                getF13Parcels: async (date) => { calls.f13 = date; return parcels; },
                getF41Arrivals: async (from, to) => { calls.window = [from, to]; return f41; },
                getF42Handovers: async () => f42,
                getF11Departures: async () => f11,
                getBfLots: async () => lots,
                getF13LotScans: async () => scans,
            },
        }),
    };
}

test('times of both source formats read as the same clock', () => {
    assert.equal(parseTime('28/10/2026 13:35:51'), parseTime('2026-10-28 13:35:51.530'));
    assert.equal(parseTime(''), null);
    assert.equal(parseTime('không rõ'), null);
    assert.equal(cleanBagNumber('`530100536250610284'), '530100536250610284');
});

test('a leg is empty when a milestone is missing or out of order; a median takes the middle value', () => {
    assert.equal(legHours(0, 5400000), 1.5);
    assert.equal(legHours(null, 1), null);
    assert.equal(legHours(5400000, 0), null);
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2]), 1.5);
    assert.equal(median([]), null);
});

test('several F4.2 rows: the one with this delivery time, else the last handover before it', () => {
    const rows = [
        { ma_buu_ta: 'A', thoi_gian_gbt: '2026-10-27 08:00:00', thoi_gian_ptc: null },
        { ma_buu_ta: 'B', thoi_gian_gbt: '2026-10-28 08:00:00', thoi_gian_ptc: '2026-10-28 17:12:41' },
        { ma_buu_ta: 'C', thoi_gian_gbt: '2026-10-29 08:00:00', thoi_gian_ptc: null },
    ];
    assert.equal(pickHandover(rows, parseTime('28/10/2026 17:12:41')).ma_buu_ta, 'B');
    assert.equal(pickHandover(rows, parseTime('28/10/2026 09:00:00')).ma_buu_ta, 'B');
    assert.equal(pickHandover(rows.slice(2), parseTime('28/10/2026 09:00:00')).ma_buu_ta, 'C');
    assert.equal(pickHandover([], 1), null);
});

test('the real parcel checked by the PO: arrival is XND BD1, and the legs follow the five milestones', async () => {
    const { service, calls } = serviceWith({
        parcels: [f13('EA464803978VN')],
        f41: [{ ma_bg: 'EA464803978VN', ngay_do_kiem: DATE, ma_bc_phat: OWN, so_hieu_bd10_xnd_bcp: '`530100536250610284', thoi_gian_xnd_bd1: '28/10/2026 13:35:51' }],
        f42: [{ ma_bg: 'EA464803978VN', ngay_do_kiem: DATE, ma_buu_ta: 'BT1', ten_buu_ta: 'NGÔ QUANG CẢNH', thoi_gian_gbt: '2026-10-28 15:02:25', thoi_gian_ptc: '2026-10-28 17:12:41' }],
        f11: [{ so_bd10_dong_di_kttinh: '530100536250610284', thoi_gian_bd10_dong_di_kttinh: '2026-10-28 11:35:51.100' }],
    });
    const { parcels, meta } = await service.getParcels(DATE, {});
    assert.deepEqual(calls.window, ['2026-10-18', '2026-11-02']);
    assert.equal(meta.total, 1);
    const [parcel] = parcels;
    assert.deepEqual(parcel.milestones, {
        tms: '2026-10-28 07:54:29',
        depart: '2026-10-28 11:35:51',
        arrive: '2026-10-28 13:35:51',
        arrive_source: 'F41',
        gbt: '2026-10-28 15:02:25',
        gbt_first: '2026-10-28 15:02:25',
        ptc: '2026-10-28 17:12:41',
    });
    assert.deepEqual(parcel.legs, { tms_depart: 3.69, depart_arrive: 2, tms_arrive: 5.69, arrive_gbt: 1.44, gbt_ptc: 2.17, tms_ptc: 9.3 });
    assert.equal(parcel.ten_buu_ta, 'NGÔ QUANG CẢNH');
    assert.equal(parcel.so_gio_tct, '9:18');
});

test('a milestone the data does not have stays empty and the other legs still show', async () => {
    const { service } = serviceWith({ parcels: [f13('BG1')] });
    const { parcels } = await service.getParcels(DATE, {});
    assert.equal(parcels[0].milestones.depart, null);
    assert.equal(parcels[0].milestones.arrive, null);
    assert.equal(parcels[0].legs.tms_arrive, null);
    assert.equal(parcels[0].legs.tms_ptc, 9.3);
    assert.equal(parcels[0].ten_buu_ta, null);
});

test('routes: volume, rate, every postman with their parcels, the median of each leg, and milestone coverage', async () => {
    const { service } = serviceWith({
        parcels: [f13('A'), f13('B', { danh_gia_2026: 'Không đạt' }), f13('C', { danh_gia_2026: null }), f13('D', { ma_tuyen: 'T2', ten_tuyen: 'Tuyến 2' })],
        f42: [
            { ma_bg: 'A', ma_buu_ta: 'BT1', ten_buu_ta: 'Một', thoi_gian_gbt: '2026-10-28 10:00:00', thoi_gian_ptc: '2026-10-28 17:12:41' },
            { ma_bg: 'B', ma_buu_ta: 'BT1', ten_buu_ta: 'Một', thoi_gian_gbt: '2026-10-28 12:00:00', thoi_gian_ptc: '2026-10-28 17:12:41' },
            { ma_bg: 'C', ma_buu_ta: 'BT2', ten_buu_ta: 'Hai', thoi_gian_gbt: '2026-10-28 16:00:00', thoi_gian_ptc: '2026-10-28 17:12:41' },
        ],
    });
    const { routes, meta } = await service.getRoutes(DATE, {});
    assert.deepEqual(routes.map((r) => [r.ma_tuyen, r.volume, r.passed, r.failed, r.rate]), [['T1', 3, 1, 2, 33.3], ['T2', 1, 1, 0, 100]]);
    assert.deepEqual(routes[0].postmen, [{ ma_buu_ta: 'BT1', ten_buu_ta: 'Một', volume: 2 }, { ma_buu_ta: 'BT2', ten_buu_ta: 'Hai', volume: 1 }]);
    assert.equal(routes[0].legs.gbt_ptc, 5.21); // the middle of 7.21, 5.21 and 1.21
    assert.deepEqual(routes[1].postmen, []);
    assert.equal(routes[1].legs.gbt_ptc, null);
    assert.deepEqual(meta.coverage, { parcels: 4, tms: 4, depart: 0, arrive: 0, gbt: 3, ptc: 4 });
});

test('only the six BCVH, a repeated parcel counts once, one unit and the account scope narrow the rows', async () => {
    const parcels = [f13('A'), f13('A'), f13('B', { ma_bcvh: OTHER }), f13('X', { ma_bcvh: '531120' })];
    const run = async (options) => (await serviceWith({ parcels }).service.getParcels(DATE, options)).parcels.map((p) => p.ma_bg);
    assert.deepEqual((await run({})).sort(), ['A', 'B']);
    assert.deepEqual(await run({ bcvhId: OTHER }), ['B']);
    assert.deepEqual(await run({ allowedCodes: [OWN] }), ['A']);
    const { meta } = await serviceWith({ parcels }).service.getRoutes(DATE, { allowedCodes: [OWN] });
    assert.equal(meta.coverage.parcels, 1); // a BCVH account's figures never count another unit
});

test('parcels: filter by route and number, order with missing values last, pages', async () => {
    const parcels = [
        f13('EA1', { thoi_gian_ptc: '28/10/2026 09:54:29' }),
        f13('EB2', { thoi_gian_ptc: '28/10/2026 12:54:29' }),
        f13('EC3', { thoi_gian_ptc: null, ma_tuyen: 'T2' }),
    ];
    const { service } = serviceWith({ parcels });
    const ids = async (options) => (await service.getParcels(DATE, options)).parcels.map((p) => p.ma_bg);
    assert.deepEqual(await ids({}), ['EB2', 'EA1', 'EC3']);
    assert.deepEqual(await ids({ order: 'asc' }), ['EA1', 'EB2', 'EC3']);
    assert.deepEqual(await ids({ route: 'T2' }), ['EC3']);
    assert.deepEqual(await ids({ search: 'eb' }), ['EB2']);
    const paged = await service.getParcels(DATE, { pageSize: 2, page: 2 });
    assert.deepEqual(paged.parcels.map((p) => p.ma_bg), ['EC3']);
    assert.deepEqual(paged.meta, { date: DATE, total: 3, page: 2, page_size: 2, total_pages: 2 });
});

function scan(ma_bg, tms, danh_gia_2026 = 'Không đạt', ma_bcvh = OWN) {
    return { ma_bg, ma_bcvh, danh_gia_2026, thoi_gian_bd10_quet_tms: tms };
}

test('Không trọn lô (Manifest v4): batches counted over every parcel of the lot, the cause only on failed parcels', async () => {
    const { service } = serviceWith({
        parcels: [
            f13('BROKEN1', { danh_gia_2026: 'Không đạt' }),
            f13('BROKEN2', { danh_gia_2026: 'Đạt' }),
            f13('ONEBATCH', { danh_gia_2026: 'Không đạt' }),
            f13('PASSEDSPLIT', { danh_gia_2026: 'Không đạt' }),
            f13('NOLOT', { danh_gia_2026: 'Không đạt' }),
        ],
        lots: [
            { lading_code: 'BROKEN1', ma_lo: 'L1' }, { lading_code: 'BROKEN2', ma_lo: 'L1' }, { lading_code: 'OTHERDAY', ma_lo: 'L1' },
            { lading_code: 'ONEBATCH', ma_lo: 'L2' },
            { lading_code: 'PASSEDSPLIT', ma_lo: 'L3' }, { lading_code: 'L3PASS', ma_lo: 'L3' },
        ],
        scans: [
            scan('BROKEN1', '23/10/2026 04:34:08'),
            scan('OTHERDAY', '28/10/2026 09:39:09'), // measured on another day, same lot
            scan('BROKEN2', '23/10/2026 10:37:05', 'Đạt'),
            scan('ONEBATCH', '27/10/2026 16:41:28'),
            scan('PASSEDSPLIT', '27/10/2026 08:00:00'),
            scan('L3PASS', '27/10/2026 09:00:00', 'Đạt'), // a second batch among passed parcels counts (batches are counted over the whole lot)
        ],
    });
    const { parcels } = await service.getParcels(DATE, {});
    const byId = Object.fromEntries(parcels.map((p) => [p.ma_bg, p]));
    assert.equal(byId.BROKEN1.khong_tron_lo, true);
    assert.equal(byId.BROKEN2.khong_tron_lo, false); // the lot is split, but a passed parcel needs no cause
    assert.equal(byId.BROKEN2.lot.incomplete, true);
    assert.equal(byId.ONEBATCH.khong_tron_lo, false);
    assert.equal(byId.PASSEDSPLIT.khong_tron_lo, true); // failed parcel, lot split only by a passed parcel: still Không trọn lô
    assert.equal(byId.NOLOT.lot, null);
    assert.deepEqual(byId.BROKEN1.lot, {
        ma_lo: 'L1',
        volume: 3,
        failed: 2,
        tms_batches: 3,
        failed_tms_batches: 2,
        first_tms: '2026-10-23 04:34:08',
        last_tms: '2026-10-28 09:39:09',
        incomplete: true,
    });

    const { meta, routes } = await service.getRoutes(DATE, {});
    assert.deepEqual(meta.lots, { failed: 4, failed_in_lot: 3, khong_tron_lo: 2, khong_tron_lo_lots: 2 });
    assert.equal(routes[0].khong_tron_lo, 2);

    const only = await service.getParcels(DATE, { onlyKhongTronLo: true });
    assert.deepEqual(only.parcels.map((p) => p.ma_bg).sort(), ['BROKEN1', 'PASSEDSPLIT']);
    const byLot = await service.getParcels(DATE, { search: 'l2' });
    assert.deepEqual(byLot.parcels.map((p) => p.ma_bg), ['ONEBATCH']);
});

test('a lot shared with another unit: the batches still count, the other unit volume is not shown to a BCVH account', async () => {
    const { service } = serviceWith({
        parcels: [f13('MINE', { danh_gia_2026: 'Không đạt' })],
        lots: [{ lading_code: 'MINE', ma_lo: 'L1' }, { lading_code: 'THEIRS', ma_lo: 'L1' }],
        scans: [scan('MINE', '23/10/2026 04:34:08'), scan('THEIRS', '24/10/2026 04:34:08', 'Không đạt', OTHER)],
    });
    const { parcels } = await service.getParcels(DATE, { allowedCodes: [OWN] });
    assert.equal(parcels[0].khong_tron_lo, true);
    assert.equal(parcels[0].lot.volume, 1);
    assert.equal(parcels[0].lot.failed, 1);
});

test('a bad date or an unknown unit is rejected', async () => {
    const { service } = serviceWith({});
    await assert.rejects(service.getRoutes('2026-02-30', {}), { code: 'INVALID_DATE' });
    await assert.rejects(service.getRoutes(DATE, { bcvhId: '999999' }), { code: 'INVALID_BCVH' });
});

// ---- F13-WHY-DATA-01 Phase 3: classifier inputs built by the service
const failedWith = (ma_bg, overrides = {}) => f13(ma_bg, { danh_gia_2026: 'Không đạt', thoi_gian_chi_tieu: '5', ...overrides });
const arrivalRow = (ma_bg, overrides = {}) => ({
    ma_bg, ngay_do_kiem: DATE, ma_bc_phat: OWN, so_hieu_bd10_xnd_bcp: 'BAG1', thoi_gian_xnd_bd1: '28/10/2026 13:35:51', ...overrides,
});
const handoverRow = (ma_bg, gbt, extra = {}) => ({ ma_bg, ngay_do_kiem: DATE, ma_buu_ta: 'BT1', ten_buu_ta: 'AN', thoi_gian_gbt: gbt, thoi_gian_ptc: null, ...extra });
const BAG = [{ so_bd10_dong_di_kttinh: 'BAG1', thoi_gian_bd10_dong_di_kttinh: '2026-10-28 11:35:51' }];

test('F4.1 is found by the exact key ma_bg + ngay_do_kiem + ma_bc_phat: no row, other day, other BCVH, or several rows are never replaced by another row', () => {
    const rows = [
        { ma_bg: 'X', ngay_do_kiem: '2026-10-27', ma_bc_phat: OWN, thoi_gian_xnd_bd1: 'a' },
        { ma_bg: 'X', ngay_do_kiem: DATE, ma_bc_phat: OTHER, thoi_gian_xnd_bd1: 'b' },
    ];
    assert.deepEqual(pickArrival(rows, DATE, OWN), { row: null, state: 'NONE' }); // other day and other BCVH: nothing, not the last row
    assert.deepEqual(pickArrival([], DATE, OWN), { row: null, state: 'NONE' });
    assert.deepEqual(pickArrival(undefined, DATE, OWN), { row: null, state: 'NONE' });
    const one = { ma_bg: 'X', ngay_do_kiem: DATE, ma_bc_phat: OWN, thoi_gian_xnd_bd1: 'c' };
    assert.deepEqual(pickArrival([...rows, one], DATE, OWN), { row: one, state: 'OK' });
    assert.deepEqual(pickArrival([one, { ...one, thoi_gian_xnd_bd1: 'd' }], DATE, OWN), { row: null, state: 'NOT_UNIQUE' });
});

test('first handover by time, success or not; the PTC-matching handover stays for the postman name', () => {
    const rows = [
        { ma_buu_ta: 'B', thoi_gian_gbt: '2026-10-28 15:02:25', thoi_gian_ptc: '2026-10-28 17:12:41' },
        { ma_buu_ta: 'A', thoi_gian_gbt: '2026-10-28 09:00:00', thoi_gian_ptc: null },
        { ma_buu_ta: 'C', thoi_gian_gbt: null, thoi_gian_ptc: null },
    ];
    assert.equal(pickFirstHandover(rows).ma_buu_ta, 'A');
    assert.equal(pickFirstHandover([{ thoi_gian_gbt: null }]), null);
    assert.equal(pickFirstHandover([]), null);
    assert.equal(pickHandover(rows, parseTime('28/10/2026 17:12:41')).ma_buu_ta, 'B');
});

test('parcel: the classifier gets the first handover, the page keeps the postman and the milestone it had', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('P1', { thoi_gian_chi_tieu: '8' })],
        f41: [arrivalRow('P1')],
        f42: [handoverRow('P1', '2026-10-28 15:02:25', { ma_buu_ta: 'BT2', ten_buu_ta: 'BA', thoi_gian_ptc: '2026-10-28 17:12:41' }), handoverRow('P1', '2026-10-28 09:00:00')],
        f11: BAG,
    });
    const [p] = (await service.getParcels(DATE, {})).parcels;
    assert.equal(p.ten_buu_ta, 'BA'); // pickHandover: the one that delivered
    assert.equal(p.milestones.gbt, '2026-10-28 15:02:25');
    assert.equal(p.milestones.gbt_first, '2026-10-28 09:00:00');
    assert.equal(p.flags.includes('SAI_TRINH_TU_NGHIEP_VU'), true); // first handover 09:00 is before arrival 13:35
    assert.equal(p.cause_detail.stages.t_g.net_ms, parseTime('28/10/2026 09:00:00') - parseTime('28/10/2026 07:54:29'));
});

test('parcel: the cause, flags, hints and detail come from the classifier; a passed parcel is not analysed; the official result is only passed on', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('FAILED1'), f13('PASSED1', { thoi_gian_chi_tieu: '5' })],
        f41: [arrivalRow('FAILED1'), arrivalRow('PASSED1')],
        f11: BAG,
    });
    const { parcels } = await service.getParcels(DATE, {});
    const byId = Object.fromEntries(parcels.map((p) => [p.ma_bg, p]));
    const failed = byId.FAILED1;
    assert.equal(failed.cause.code, 'KHAI_THAC'); // T->D 3.69 h against D->A 2 h; T->A 5.69 h over the limit of 5 h
    assert.equal(failed.cause_status, 'CAUSE');
    assert.deepEqual(failed.hints, []);
    assert.equal(failed.danh_gia, 'Không đạt');
    assert.equal(failed.so_gio_tct, '9:18');
    assert.equal(byId.PASSED1.cause, null);
    assert.equal(byId.PASSED1.cause_status, 'KHONG_PHAN_TICH');
    assert.equal(byId.PASSED1.danh_gia, 'Đạt');
});

test('parcel: no F4.1 row (other day, other BCVH) and no BatchFile arrival -> THIEU_F41 + KHONG_XAC_NHAN_DEN, left to the Chuyên quản (no handover); several rows -> F41_KHONG_DUY_NHAT; none falls back to another F4.1 row', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('NOROW'), failedWith('OTHERDAY'), failedWith('OTHERBCVH'), failedWith('TWOROWS')],
        f41: [
            arrivalRow('OTHERDAY', { ngay_do_kiem: '2026-10-27' }),
            arrivalRow('OTHERBCVH', { ma_bc_phat: OTHER }),
            arrivalRow('TWOROWS'), arrivalRow('TWOROWS', { thoi_gian_xnd_bd1: '28/10/2026 14:00:00' }),
        ],
        f11: BAG,
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    for (const id of ['NOROW', 'OTHERDAY', 'OTHERBCVH']) {
        assert.deepEqual([byId[id].cause, byId[id].cause_status, byId[id].cause_step, byId[id].flags, byId[id].milestones.arrive], [null, 'CHO_CHUYEN_QUAN', 'T-G', ['THIEU_F41', 'KHONG_XAC_NHAN_DEN', 'THIEU_MOC_G'], null], id);
        assert.equal(byId[id].cause_reason, 'THIEU_MOC_G', id);
    }
    assert.deepEqual([byId.TWOROWS.cause_status, byId.TWOROWS.flags, byId.TWOROWS.milestones.arrive], ['CHO_CHUYEN_QUAN', ['F41_KHONG_DUY_NHAT', 'KHONG_XAC_NHAN_DEN', 'THIEU_MOC_G'], null]);
});

test('parcel: the limit comes from the parcel row, there is no 14 h default', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('NOLIMIT', { thoi_gian_chi_tieu: null }), failedWith('LIMIT12', { thoi_gian_chi_tieu: 12 })],
        f41: [arrivalRow('NOLIMIT'), arrivalRow('LIMIT12')],
        f11: BAG,
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.deepEqual([byId.NOLIMIT.cause, byId.NOLIMIT.cause_status, byId.NOLIMIT.flags], [null, 'CHUA_DU_CAN_CU', ['THIEU_CHI_TIEU']]);
    // 5.69 h to the BCVH is within 12 h and the TCT time (9:18) is within it too while the verdict is Không đạt: left to the Chuyên quản
    assert.deepEqual([byId.LIMIT12.cause_status, byId.LIMIT12.cause_step, byId.LIMIT12.cause_reason], ['CHO_CHUYEN_QUAN', 'T-E', 'KET_QUA_KHONG_KHOP_CHI_TIEU']);
});

test('parcel: Không trọn lô keeps the cause and carries the BCVH hint when the arrival is conclusively late', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('LOTLATE'), failedWith('LOTINTIME', { thoi_gian_chi_tieu: '12' })],
        f41: [arrivalRow('LOTLATE'), arrivalRow('LOTINTIME')],
        f11: BAG,
        lots: [{ lading_code: 'LOTLATE', ma_lo: 'L1' }, { lading_code: 'LOTINTIME', ma_lo: 'L1' }, { lading_code: 'PASSEDELSEWHERE', ma_lo: 'L1' }],
        scans: [scan('LOTLATE', '28/10/2026 07:54:29', 'Không đạt'), scan('LOTINTIME', '28/10/2026 07:54:29', 'Không đạt'), scan('PASSEDELSEWHERE', '27/10/2026 07:00:00', 'Đạt')],
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.deepEqual([byId.LOTLATE.cause.code, byId.LOTLATE.hints], ['KHONG_TRON_LO', ['DAU_HIEU_CHAM_TAI_BCVH']]);
    assert.deepEqual([byId.LOTINTIME.cause.code, byId.LOTINTIME.hints], ['KHONG_TRON_LO', []]);
});

test('lot batches: a parcel listed twice (measured on two days, same scan) is one batch; two distinct scans are two', async () => {
    const mk = (scans) => serviceWith({
        parcels: [failedWith('X1')], f41: [arrivalRow('X1')], f11: BAG,
        lots: [{ lading_code: 'X1', ma_lo: 'L9' }, { lading_code: 'X2', ma_lo: 'L9' }],
        scans,
    }).service;
    const same = (await mk([scan('X1', '28/10/2026 07:54:29'), scan('X1', '28/10/2026 07:54:29'), scan('X2', '28/10/2026 07:54:29', 'Đạt')]).getParcels(DATE, {})).parcels[0];
    assert.equal(same.khong_tron_lo, false);
    assert.equal(same.lot.tms_batches, 1);
    const split = (await mk([scan('X1', '28/10/2026 07:54:29'), scan('X2', '28/10/2026 09:54:29', 'Đạt')]).getParcels(DATE, {})).parcels[0];
    assert.equal(split.khong_tron_lo, true);
    assert.equal(split.lot.tms_batches, 2);
});

// ---- F13-WHY-DATA-02 R1: arrival from the BatchFile (E2), Phát details and the basis through the service
const bfRow = (lading, overrides = {}) => ({ lading_code: lading, ma_lo: null, mabc_phat: OWN, xac_nhan_den_bcp: '10/28/2026 1:35:51 PM', ...overrides });

test('BatchFile times (M/D/YYYY h:mm:ss AM/PM) are read as the local clock; empty or malformed ones are not times', () => {
    assert.equal(parseBatchFileTime('10/28/2026 1:35:51 PM'), parseTime('28/10/2026 13:35:51'));
    assert.equal(parseBatchFileTime('4/13/2026 12:58:26 PM'), parseTime('13/04/2026 12:58:26')); // 12 PM is noon
    assert.equal(parseBatchFileTime('12/31/2025 12:05:00 AM'), parseTime('31/12/2025 00:05:00')); // 12 AM is midnight
    assert.equal(parseBatchFileTime('1/1/2026 9:26:51 AM'), parseTime('01/01/2026 09:26:51'));
    for (const bad of [null, '', '28/10/2026 13:35:51', 'x', '10/28/2026 1:35:51']) assert.equal(parseBatchFileTime(bad), null, String(bad));
});

test('pickBatchFileArrival: only the same BCVH counts, an empty value is "never confirmed", the earliest confirmation wins', () => {
    const rows = [
        bfRow('X', { xac_nhan_den_bcp: '10/28/2026 3:00:00 PM' }),
        bfRow('X', { xac_nhan_den_bcp: '10/28/2026 1:00:00 PM' }),
        bfRow('X', { xac_nhan_den_bcp: '10/28/2026 9:00:00 AM', mabc_phat: OTHER }),
        bfRow('X', { xac_nhan_den_bcp: '' }),
    ];
    assert.equal(pickBatchFileArrival(rows, OWN), parseTime('28/10/2026 13:00:00'));
    assert.equal(pickBatchFileArrival([bfRow('X', { xac_nhan_den_bcp: '' })], OWN), null);
    assert.equal(pickBatchFileArrival([], OWN), null);
    assert.equal(pickBatchFileArrival(undefined, OWN), null);
});

test('E2: no F4.1 row -> the BatchFile arrival is A (source BF, no D); an F4.1 row wins; BF of another BCVH or empty is not used', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('BFONLY'), failedWith('BOTH'), failedWith('BFOTHER'), failedWith('BFEMPTY'), failedWith('NEITHER')],
        f41: [arrivalRow('BOTH')],
        lots: [
            bfRow('BFONLY'), bfRow('BOTH', { xac_nhan_den_bcp: '10/28/2026 1:00:00 PM' }), bfRow('BFOTHER', { mabc_phat: OTHER }), bfRow('BFEMPTY', { xac_nhan_den_bcp: '' }),
        ],
        f11: BAG,
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.deepEqual([byId.BFONLY.milestones.arrive, byId.BFONLY.milestones.arrive_source, byId.BFONLY.a_source, byId.BFONLY.milestones.depart], ['2026-10-28 13:35:51', 'BF', 'BF', null]);
    assert.deepEqual(byId.BFONLY.flags, ['THIEU_F41', 'THIEU_MOC_D']); // an arrival is known, the bag (so D) is not
    assert.equal(byId.BFONLY.cause.code, 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'); // 5.69 h over the limit of 5 h, no D
    assert.deepEqual([byId.BOTH.milestones.arrive, byId.BOTH.a_source], ['2026-10-28 13:35:51', 'F41']); // F4.1 (13:35:51), not BF (13:00:00)
    for (const id of ['BFOTHER', 'BFEMPTY', 'NEITHER']) assert.deepEqual([byId[id].milestones.arrive, byId[id].a_source, byId[id].flags.includes('KHONG_XAC_NHAN_DEN')], [null, null, true], id);
});

test('E2: a BatchFile row with a lot number but no arrival still gives the lot (one read for both)', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('L1'), failedWith('L2')],
        f41: [arrivalRow('L1'), arrivalRow('L2')],
        f11: BAG,
        lots: [{ lading_code: 'L1', ma_lo: 'LOT', mabc_phat: OWN, xac_nhan_den_bcp: null }, { lading_code: 'L2', ma_lo: 'LOT', mabc_phat: OWN, xac_nhan_den_bcp: null }, { lading_code: 'ARRIVALONLY', ma_lo: null, mabc_phat: OWN, xac_nhan_den_bcp: '10/28/2026 1:35:51 PM' }],
        scans: [scan('L1', '28/10/2026 07:54:29'), scan('L2', '28/10/2026 09:54:29')],
    });
    const parcels = (await service.getParcels(DATE, {})).parcels;
    assert.ok(parcels.every((p) => p.ma_lo === 'LOT' && p.khong_tron_lo === true));
});

test('E4 through the service: handed over on a later day than the arrival -> Phát / Chậm giao bưu tá; handed over in time on the same day -> Phát chậm sau khi giao', async () => {
    // arrival 28/10 13:35:51 (T 07:54:29: 5.69 h), TCT times chosen to be consistent with the milestones (R inside the tolerance)
    const same = failedWith('SAMEDAY', { thoi_gian_chi_tieu: '8', thoi_gian_thuc_hien_thuc_te_gio: '9:18' }); // E 17:12:41 = 9.3 h, G 15:02:25 = 7.1 h
    const nextDay = failedWith('NEXTDAY', { thoi_gian_chi_tieu: '14.5', thoi_gian_ptc: '29/10/2026 09:00:00', thoi_gian_thuc_hien_thuc_te_gio: '15:5' }); // one night (10 h) left out: 15.1 h
    const { service } = serviceWith({
        parcels: [same, nextDay],
        f41: [arrivalRow('SAMEDAY'), arrivalRow('NEXTDAY')],
        f42: [handoverRow('SAMEDAY', '2026-10-28 15:02:25'), handoverRow('NEXTDAY', '2026-10-29 08:00:00')],
        f11: BAG,
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.deepEqual([byId.SAMEDAY.cause.code, byId.SAMEDAY.cause.detail, byId.SAMEDAY.cause_basis], ['PHAT', 'PHAT_CHAM_SAU_GIAO', 'INTERVAL']);
    assert.ok(byId.SAMEDAY.remaining_at_arrival_ms > 2 * 3600000 && byId.SAMEDAY.remaining_at_arrival_ms < 3 * 3600000); // 8 h - 5 h 41 min
    assert.ok(byId.SAMEDAY.hints.includes('DEN_BCVH_CON_IT_GIO'));
    assert.deepEqual([byId.NEXTDAY.cause.code, byId.NEXTDAY.cause.detail], ['PHAT', 'CHAM_GIAO_BUU_TA']); // T->G 14.1 h is in time, but the day after the arrival
});

test('the parcel carries the v5 fields: reason, basis, A source, remaining time; a Đạt parcel has none of them', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('FAILED2', { thoi_gian_chi_tieu: '5' }), f13('PASSED2', { thoi_gian_chi_tieu: '5' })],
        f41: [arrivalRow('FAILED2'), arrivalRow('PASSED2')],
        f11: BAG,
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.deepEqual([byId.FAILED2.cause.code, byId.FAILED2.cause_reason, byId.FAILED2.cause_basis, byId.FAILED2.a_source], ['KHAI_THAC', null, 'INTERVAL', 'F41']);
    assert.ok(byId.FAILED2.remaining_at_arrival_ms < 0); // 5.69 h against a 5 h limit
    assert.deepEqual([byId.PASSED2.cause, byId.PASSED2.cause_reason, byId.PASSED2.cause_basis, byId.PASSED2.a_source, byId.PASSED2.remaining_at_arrival_ms], [null, null, null, null, null]);
});

// ---- F13-WHY-DATA-03: direct handover at Hương Trà (535470)
const HT = '535470';
const htParcel = (ma_bg, overrides = {}) => failedWith(ma_bg, {
    ma_bcvh: HT, ten_bcvh: 'BCVH Hương Trà', thoi_gian_chi_tieu: '14', thoi_gian_thuc_hien_thuc_te_gio: '25:28',
    thoi_gian_bd10_quet_tms: '28/10/2026 12:19:11', thoi_gian_ptc: '29/10/2026 13:47:18', ...overrides,
});

test('F13-WHY-DATA-03: Hương Trà, A 7 min before T -> raw A shown, leg tms_arrive 0, flag on the item, cause Phát / Chậm giao bưu tá', async () => {
    const { service } = serviceWith({
        parcels: [htParcel('HT1')],
        f41: [arrivalRow('HT1', { ma_bc_phat: HT, thoi_gian_xnd_bd1: '28/10/2026 12:11:52' })],
        f42: [handoverRow('HT1', '2026-10-29 08:28:12')],
    });
    const [p] = (await service.getParcels(DATE, {})).parcels;
    assert.equal(p.milestones.arrive, '2026-10-28 12:11:52'); // raw A is the evidence
    assert.equal(p.legs.tms_arrive, 0);
    assert.equal(p.flags.includes('A_TRUOC_TMS_GIAO_TRUC_TIEP'), true);
    assert.equal(p.flags.includes('MOC_A_KHONG_HOP_LE'), false);
    assert.deepEqual([p.cause.code, p.cause.detail], ['PHAT', 'CHAM_GIAO_BUU_TA']);
});

test('F13-WHY-DATA-03: Hương Trà, A after T or 25 h before T, and a passed Hương Trà parcel', async () => {
    const { service } = serviceWith({
        parcels: [htParcel('HT_AFTER'), htParcel('HT_FAR'), htParcel('HT_PASS', { danh_gia_2026: 'Đạt' })],
        f41: [
            arrivalRow('HT_AFTER', { ma_bc_phat: HT, thoi_gian_xnd_bd1: '28/10/2026 13:00:00' }),
            arrivalRow('HT_FAR', { ma_bc_phat: HT, thoi_gian_xnd_bd1: '27/10/2026 11:00:00' }),
            arrivalRow('HT_PASS', { ma_bc_phat: HT, thoi_gian_xnd_bd1: '28/10/2026 12:10:00' }),
        ],
    });
    const byId = Object.fromEntries((await service.getParcels(DATE, {})).parcels.map((p) => [p.ma_bg, p]));
    assert.equal(byId.HT_AFTER.flags.includes('A_TRUOC_TMS_GIAO_TRUC_TIEP'), false);
    assert.equal(byId.HT_AFTER.legs.tms_arrive, legHours(parseTime('28/10/2026 12:19:11'), parseTime('28/10/2026 13:00:00')));
    assert.equal(byId.HT_FAR.flags.includes('A_TRUOC_TMS_GIAO_TRUC_TIEP'), false);
    assert.equal(byId.HT_FAR.cause_reason, 'MOC_A_KHONG_HOP_LE');
    assert.equal(byId.HT_FAR.legs.tms_arrive, null);
    assert.equal(byId.HT_PASS.legs.tms_arrive, 0); // the leg follows the rule even for a parcel that is not classified
    assert.equal(byId.HT_PASS.cause_status, 'KHONG_PHAN_TICH');
});

test('F13-WHY-DATA-03: another BCVH with A 7 min before T is unchanged (MOC_A_KHONG_HOP_LE, leg empty, no flag)', async () => {
    const { service } = serviceWith({
        parcels: [failedWith('OT1', { thoi_gian_chi_tieu: '14', thoi_gian_thuc_hien_thuc_te_gio: '25:28', thoi_gian_bd10_quet_tms: '28/10/2026 12:19:11', thoi_gian_ptc: '29/10/2026 13:47:18' })],
        f41: [arrivalRow('OT1', { thoi_gian_xnd_bd1: '28/10/2026 12:11:52' })],
        f42: [handoverRow('OT1', '2026-10-29 08:28:12')],
    });
    const [p] = (await service.getParcels(DATE, {})).parcels;
    assert.equal(p.cause_reason, 'MOC_A_KHONG_HOP_LE');
    assert.equal(p.legs.tms_arrive, null);
    assert.equal(p.flags.includes('A_TRUOC_TMS_GIAO_TRUC_TIEP'), false);
});
