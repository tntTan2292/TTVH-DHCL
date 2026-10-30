'use strict';

// OPS-JOURNAL-01: sections 3 and 4 of the PL06 ("Kết quả thực tế cuối ngày", "Bài học rút ra") are drafted by the system, as the
// PO's journals of 19-23/10/2026 were (PO 2026-10-30: "bài học rút ra là bạn tự soạn"): every journal of the sample says "chưa giải
// quyết / chưa phục hồi, đang theo dõi", handled within the day, finished 17h00, no process to update, and one lesson per indicator.
// The manager edits it on the screen and signs; nothing is stored until he saves, so the screens show it as a draft.
const LESSONS = Object.freeze({
    HANGTON: 'Sau ngày nghỉ cuối tuần, rà soát hàng tồn ngay từ giao ban đầu ngày thứ Hai; xử lý bưu gửi ngay khi chạm ngưỡng 5 ngày để không dồn lên mức từ 7 ngày trở lên; trường hợp BCVH không xử lý được phải báo cáo sớm về TTVH.',
    'F1.1': 'Với F1.1, rà soát theo từng luồng bưu cục chấp nhận – bưu cục phát để giao đúng đơn vị chịu trách nhiệm từng khâu; theo dõi hằng ngày các luồng có tỷ lệ thấp kéo dài.',
    'F1.2': 'Theo dõi F1.2 theo từng khách hàng có sản lượng lớn hằng ngày; khi một khách hàng có nhiều bưu gửi không đạt trong ngày thì rà soát ngay khâu thu gom, chấp nhận của khách hàng đó.',
    SUDDEN_DROP: (label) => `BCVH có tỷ lệ tốt vẫn có thể giảm đột ngột do một tuyến phát; theo dõi ${label} đến từng tuyến phát hằng ngày để phát hiện sớm và khoanh vùng đúng tuyến cần xử lý.`,
    CHRONIC: 'Với BCVH có tỷ lệ thấp kéo dài, cần rà soát đến từng tuyến phát, từng bưu tá và theo dõi hằng ngày thay vì xử lý theo từng ngày phát sinh.',
});
const TARGETS = Object.freeze({ 'F1.1': 95, 'F1.2': 95, 'F1.3': 90, 'F4.1': 90 });
const dm = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** @param spot { day, indicator, metrics } */
function draftClosing(spot) {
    const label = spot.indicator;
    const m = spot.metrics || {};
    let lesson;
    if (label === 'HANGTON' || label === 'F1.1' || label === 'F1.2') lesson = LESSONS[label];
    else if (label === 'F1.3' && m.compareRate != null && Number(m.compareRate) >= (TARGETS[label] ?? 90)) lesson = LESSONS.SUDDEN_DROP(label);
    else lesson = LESSONS.CHRONIC;
    return {
        resolved: false,
        handlingTimeText: label === 'HANGTON' ? `xử lý dứt điểm trong ngày ${dm(spot.day)}` : `rà soát xong trong ngày ${dm(spot.day)}; theo dõi kết quả hằng ngày`,
        recovered: false,
        lesson,
        processUpdate: '',
        doneTime: '17:00',
        drafted: true,
    };
}

module.exports = { draftClosing };
