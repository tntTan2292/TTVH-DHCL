'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { JourneyService, parseTime, cleanBagNumber, legHours, median, pickHandover } = require('./JourneyService');

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

function serviceWith({ parcels = [], f41 = [], f42 = [], f11 = [] }) {
    const calls = {};
    return {
        calls,
        service: new JourneyService({
            repository: {
                getF13Parcels: async (date) => { calls.f13 = date; return parcels; },
                getF41Arrivals: async (from, to) => { calls.window = [from, to]; return f41; },
                getF42Handovers: async () => f42,
                getF11Departures: async () => f11,
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
        f41: [{ ma_bg: 'EA464803978VN', ngay_do_kiem: DATE, so_hieu_bd10_xnd_bcp: '`530100536250610284', thoi_gian_xnd_bd1: '28/10/2026 13:35:51' }],
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
        gbt: '2026-10-28 15:02:25',
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

test('a bad date or an unknown unit is rejected', async () => {
    const { service } = serviceWith({});
    await assert.rejects(service.getRoutes('2026-02-30', {}), { code: 'INVALID_DATE' });
    await assert.rejects(service.getRoutes(DATE, { bcvhId: '999999' }), { code: 'INVALID_BCVH' });
});
