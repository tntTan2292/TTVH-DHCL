'use strict';

// F13-WHY-NARRATIVE-02 B1: the pure assembly of the route story (no database).
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStory, lotEvidence, STORY_CONFIG } = require('./RouteStory');

const line = (code, count) => ({ code, label: code, count, share: null });
const LINES = (counts) => ['KHONG_TRON_LO', 'KHAI_THAC', 'VAN_CHUYEN', 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', 'GIAO_BUU_TA_QUA_GIO', 'PHAT_MUON', 'PHAT_KHONG_CHI_TIET']
    .map((code) => line(code, counts[code] || 0));

test('main cause: the line with the most failed parcels, with count and share of the failed parcels', () => {
    const story = buildStory({ failed: 10, lines: LINES({ KHAI_THAC: 6, PHAT_MUON: 3, VAN_CHUYEN: 1 }) });
    assert.equal(story.main.code, 'KHAI_THAC');
    assert.equal(story.main.count, 6);
    assert.equal(story.main.share, 0.6);
    assert.equal(story.lot, null);
});

test('Phát keeps its detail: the three Phát lines compete as lines, not as one', () => {
    const story = buildStory({ failed: 10, lines: LINES({ GIAO_BUU_TA_QUA_GIO: 4, PHAT_MUON: 3, KHAI_THAC: 3 }) });
    assert.equal(story.main.code, 'GIAO_BUU_TA_QUA_GIO');
});

test('second cause only from 20 % of the failed parcels, 20 % exactly counts', () => {
    assert.equal(buildStory({ failed: 10, lines: LINES({ KHAI_THAC: 8, PHAT_MUON: 2 }) }).second.code, 'PHAT_MUON'); // exactly 20 %
    assert.equal(buildStory({ failed: 10, lines: LINES({ KHAI_THAC: 9, PHAT_MUON: 1 }) }).second, null);
    assert.equal(buildStory({ failed: 10, lines: LINES({ KHAI_THAC: 10 }) }).second, null);
    assert.equal(STORY_CONFIG.SECOND_CAUSE_MIN_SHARE, 0.2);
});

test('a tie keeps the order of the cause lines; no cause at all gives no main', () => {
    assert.equal(buildStory({ failed: 8, lines: LINES({ VAN_CHUYEN: 4, KHAI_THAC: 4 }) }).main.code, 'KHAI_THAC');
    const none = buildStory({ failed: 3, lines: LINES({}) });
    assert.equal(none.main, null);
    assert.equal(none.second, null);
});

test('lot only when Không trọn lô is the main cause: at most 3 lots, most failed parcels first, with their evidence', () => {
    const evidence = new Map([['L1', { tms_batches: 2, first_tms: '2026-10-22 07:00:00', last_tms: '2026-10-22 15:40:00' }]]);
    const lots = [{ ma_lo: 'L4', failed: 1 }, { ma_lo: 'L2', failed: 2 }, { ma_lo: 'L1', failed: 5 }, { ma_lo: 'L3', failed: 2 }];
    const story = buildStory({ failed: 10, lines: LINES({ KHONG_TRON_LO: 10 }), lots, lotEvidence: evidence });
    assert.deepEqual(story.lot.map((lot) => lot.ma_lo), ['L1', 'L2', 'L3']);
    assert.equal(story.lot[0].failed, 5);
    assert.equal(story.lot[0].share_of_failed, 0.5);
    assert.equal(story.lot[0].tms_batches, 2);
    assert.equal(story.lot[0].last_tms, '2026-10-22 15:40:00');
    assert.equal(story.lot[1].tms_batches, null); // no evidence found for that lot: unknown, not zero
    const other = buildStory({ failed: 10, lines: LINES({ KHAI_THAC: 6, KHONG_TRON_LO: 4 }), lots, lotEvidence: evidence });
    assert.equal(other.lot, null);
});

test('lotEvidence: distinct TMS times over every parcel of the lot, each parcel once, last by time not by text', () => {
    const rows = [
        { ma_bg: 'A', thoi_gian_bd10_quet_tms: '22/10/2026 07:00:00' },
        { ma_bg: 'A', thoi_gian_bd10_quet_tms: '23/10/2026 09:00:00' }, // a second row of the same parcel is ignored
        { ma_bg: 'B', thoi_gian_bd10_quet_tms: '22/10/2026 07:00:00' },
        { ma_bg: 'C', thoi_gian_bd10_quet_tms: '09/11/2026 15:40:00' }, // later in time, smaller as text than 22/10
        { ma_bg: 'D', thoi_gian_bd10_quet_tms: null },
    ];
    assert.deepEqual(lotEvidence(rows), { tms_batches: 2, first_tms: '2026-10-22 07:00:00', last_tms: '2026-11-09 15:40:00' });
    assert.deepEqual(lotEvidence([]), { tms_batches: 0, first_tms: null, last_tms: null });
});

test('little time, return and stock are numbers against the failed / parcels / BCVH share', () => {
    const story = buildStory({
        failed: 8, lines: LINES({ KHAI_THAC: 8 }), littleTime: 2, parcels: 20, returned: 4, stock: 0, bcvhParcels: 200, bcvhReturned: 10, bcvhStock: 5,
    });
    assert.deepEqual(story.little_time, { count: 2, share: 0.25 });
    assert.equal(story.return_hint.count, 4);
    assert.equal(story.return_hint.share, 0.2);
    assert.equal(story.return_hint.bcvh_share, 0.05);
    assert.equal(story.return_hint.ratio, 4); // 20 % against 5 %
    assert.equal(story.stock_hint.count, 0);
    assert.equal(story.stock_hint.ratio, 0);
});

test('no parcels / no BCVH share: shares and ratio are null, never NaN or Infinity', () => {
    const story = buildStory({ failed: 0, lines: LINES({}), parcels: 0, bcvhParcels: 0 });
    assert.equal(story.little_time.share, null);
    assert.equal(story.return_hint.share, null);
    assert.equal(story.return_hint.ratio, null);
    const noBcvhReturn = buildStory({ failed: 1, lines: LINES({ KHAI_THAC: 1 }), parcels: 5, returned: 1, bcvhParcels: 50, bcvhReturned: 0 });
    assert.equal(noBcvhReturn.return_hint.ratio, null); // the BCVH has no return: no ratio to quote
});
