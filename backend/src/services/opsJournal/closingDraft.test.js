// OPS-JOURNAL-01: sections 3-4 are drafted by the system from the indicator, as in the PL06 journals of 19-23/10.
const test = require('node:test');
const assert = require('node:assert/strict');
const { draftClosing } = require('./closingDraft');
const { buildPl06 } = require('./pl06Document');

test('the draft follows the sample journals: not resolved / not recovered, 17h00, a lesson per indicator', () => {
    const f13 = draftClosing({ day: '2026-10-22', indicator: 'F1.3', metrics: { compareRate: 95.2 } });
    assert.equal(f13.resolved, false);
    assert.equal(f13.recovered, false);
    assert.equal(f13.doneTime, '17:00');
    assert.equal(f13.handlingTimeText, 'rà soát xong trong ngày 22/10; theo dõi kết quả hằng ngày');
    assert.match(f13.lesson, /giảm đột ngột do một tuyến phát; theo dõi F1\.3 đến từng tuyến phát/);
    assert.match(draftClosing({ day: '2026-10-23', indicator: 'F4.1', metrics: { compareRate: 33.3 } }).lesson, /tỷ lệ thấp kéo dài/);
    assert.match(draftClosing({ day: '2026-10-20', indicator: 'F1.1', metrics: {} }).lesson, /luồng bưu cục chấp nhận – bưu cục phát/);
    assert.match(draftClosing({ day: '2026-10-21', indicator: 'F1.2', metrics: {} }).lesson, /từng khách hàng có sản lượng lớn/);
    const stock = draftClosing({ day: '2026-10-19', indicator: 'HANGTON', metrics: {} });
    assert.match(stock.lesson, /Sau ngày nghỉ cuối tuần/);
    assert.equal(stock.handlingTimeText, 'xử lý dứt điểm trong ngày 19/10');
});

test('the printed journal uses the draft until the manager saves his own closing', () => {
    const base = { day: '2026-10-22', indicator: 'F1.3', title: 'F1.3 - BCVH Thuận An', headline: 'h', detectedAt: '07:30', channel: 'Dashboard', actions: [] };
    const draft = draftClosing(base);
    const text = (model) => JSON.stringify(model);
    const withDraft = buildPl06({ ...base, closing: null, closingDraft: draft }, { name: 'Mai Văn Mười', positionCode: 'GD_TTVH' });
    assert.ok(text(withDraft).includes('Giờ hoàn thành nhật ký: 17h00') && text(withDraft).includes('tuyến phát'));
    const saved = buildPl06({ ...base, closing: { ...draft, lesson: 'Bài học của GĐ', doneTime: '16:30' }, closingDraft: draft }, { name: 'Mai Văn Mười', positionCode: 'GD_TTVH' });
    assert.ok(text(saved).includes('Bài học của GĐ') && text(saved).includes('16h30'));
});

test('an F1.1 pair gets the pair lesson of the 16/10 journal', () => {
    const pair = draftClosing({ day: '2026-10-16', indicator: 'F1.1', scopeType: 'PAIR', metrics: {} });
    assert.match(pair.lesson, /các cặp chấp nhận – phát có sản lượng lớn hằng ngày.*dưới 85%/);
    assert.equal(pair.handlingTimeText, 'rà soát xong trong ngày 16/10; theo dõi kết quả cặp hằng ngày');
});

test('an F1.1 pair gets the pair lesson of the 16/10 journal', () => {
    const pair = draftClosing({ day: '2026-10-16', indicator: 'F1.1', scopeType: 'PAIR', metrics: {} });
    assert.match(pair.lesson, /các cặp chấp nhận – phát có sản lượng lớn hằng ngày.*dưới 85%/);
    assert.equal(pair.handlingTimeText, 'rà soát xong trong ngày 16/10; theo dõi kết quả cặp hằng ngày');
});

test('the recorder printed on the journal is always Mai Văn Mười, GĐ TTVH, whoever signs in', () => {
    const { buildPl06 } = require('./pl06Document');
    const model = buildPl06({ day: '2026-10-22', indicator: 'F1.3', title: 'F1.3 - BCVH Thuận An', headline: 'h', actions: [], closing: null }, { name: 'Quản trị viên', positionCode: 'ADMIN' });
    const text = JSON.stringify(model);
    assert.ok(text.includes('Người ghi nhận: Mai Văn Mười (PGĐ BĐTP, GĐ TTVH)') && text.includes('Người ghi nhận / Ký xác nhận: Mai Văn Mười'));
    assert.ok(!text.includes('Quản trị viên'));
});
