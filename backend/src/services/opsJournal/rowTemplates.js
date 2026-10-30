'use strict';

// OPS-JOURNAL-01: the "6 rõ" rows are drafted by the system when a spot is chosen (PO 2026-10-30: the manager does not pick a template,
// the system writes the rows of the right indicator and puts the people of the unit on them). The wording follows the PL06 journals
// of 01-23/10/2026 (manifest section 2): (1) the unit's director reviews the cause, (2) the specialist and the director find the
// solution applied from N+1, (3) the specialist tracks the rate every day. The manager edits anything before finalizing.
const TARGETS = Object.freeze({ 'F1.1': 95, 'F1.2': 95, 'F1.3': 90, 'F4.1': 90 });

const FOCUS = Object.freeze({
    'F1.1': {
        review: 'Rà soát nguyên nhân các bưu gửi nội tỉnh không đạt thời gian toàn trình',
        how: 'Đối chiếu dữ liệu QIS (F1.1) với hành trình từng bưu gửi: chấp nhận - khai thác - phát, xác định khâu chậm',
        solution: 'Tìm giải pháp khắc phục khâu chậm và thống nhất phương án xử lý áp dụng từ N+1',
        solutionHow: 'Rà soát giờ chốt ca, hành trình tuyến và điều chỉnh phân công khai thác - phát',
    },
    'F1.2': {
        review: 'Rà soát nguyên nhân các bưu gửi thu gom liên tỉnh không đạt tại đơn vị chấp nhận',
        how: 'Kiểm tra giờ thu gom, giờ chuyển kho và hành trình từng bưu gửi không đạt trên QIS (F1.2)',
        solution: 'Tìm giải pháp khắc phục và thống nhất phương án xử lý thu gom áp dụng từ N+1',
        solutionHow: 'Rà soát lịch thu gom, giờ chốt chuyến thư và điều chỉnh với đơn vị chấp nhận',
    },
    'F1.3': {
        review: 'Rà soát và báo cáo nguyên nhân các bưu gửi phát liên tỉnh không đạt chất lượng',
        how: 'Kiểm tra từng bưu gửi không đạt trên QIS (F1.3): giờ đến, giờ phân tuyến, số lần phát, lý do chưa phát được',
        solution: 'Tìm giải pháp khắc phục và thống nhất phương án xử lý áp dụng từ N+1',
        solutionHow: 'Rà soát quy trình khai thác, kỷ luật giờ chốt ca và điều chỉnh hành trình tuyến phát',
    },
    'F4.1': {
        review: 'Rà soát nguyên nhân các bưu gửi phát thành công tại bưu cục không đạt',
        how: 'Kiểm tra bưu gửi chưa phát thành công trên QIS (F4.1), làm việc với bưu tá về lý do từng bưu gửi',
        solution: 'Tìm giải pháp nâng tỷ lệ phát thành công và thống nhất phương án xử lý áp dụng từ N+1',
        solutionHow: 'Rà soát phân tuyến, số lần phát lại, liên hệ người nhận trước khi phát',
    },
});

const label = (user) => user.name || user.positionLabel || user.username;
const whoOf = (position, users, fallback) => {
    const names = users.filter((u) => u.position === position).map(label);
    return names.length ? `${fallback}: ${names.join(', ')}` : fallback;
};

/**
 * @param spot   { indicator, title, officeCode }
 * @param people assignableUsers() of the spot's unit: GD_BCVH and CHUYEN_QUAN accounts
 * @returns rows ready to insert: { whoText, what, where, due, how, expectedResult, assigneeUserIds }
 */
function buildRows(spot, people = []) {
    const directors = people.filter((u) => u.position === 'GD_BCVH');
    const specialists = people.filter((u) => u.position === 'CHUYEN_QUAN');
    const where = String(spot.title || '').replace(/^[^-–]*[-–]\s*/, '').trim() || 'Đơn vị';
    const ids = (...lists) => [...new Set(lists.flat().map((u) => u.id))];

    if (spot.indicator === 'HANGTON') {
        return [
            { whoText: whoOf('GD_BCVH', directors, 'Giám đốc BCVH'), what: 'Rà soát toàn bộ bưu gửi tồn đọng tại đơn vị (tồn ≥5 ngày, ≥7 ngày, COD)', where, due: 'Trong ngày',
                how: 'Kiểm kê kho bưu gửi thực tế, đối chiếu dữ liệu QIS và làm việc với bộ phận liên quan',
                expectedResult: 'Báo cáo rõ nguyên nhân từng bưu gửi tồn đọng', assigneeUserIds: ids(directors) },
            { whoText: `${whoOf('GD_BCVH', directors, 'Giám đốc BCVH')}${specialists.length ? ' + ' + whoOf('CHUYEN_QUAN', specialists, 'Chuyên quản') : ''}`, what: 'Xử lý dứt điểm các bưu gửi tồn đọng về 0', where, due: 'Trong ngày',
                how: 'Tổ chức phát lại, liên hệ người nhận / người gửi hoặc hoàn bưu gửi theo quy định',
                expectedResult: 'Giải tỏa toàn bộ bưu gửi tồn đọng quá hạn', assigneeUserIds: ids(directors, specialists) },
            { whoText: whoOf('CHUYEN_QUAN', specialists, 'Chuyên quản'), what: 'Theo dõi tiến độ giải tỏa tồn đọng hằng ngày và báo cáo lãnh đạo TTVH', where: 'TTVH', due: 'Hằng ngày',
                how: 'Giám sát snapshot Hàng tồn lúc 07:30 mỗi sáng',
                expectedResult: 'Không phát sinh tồn đọng mới quá hạn', assigneeUserIds: ids(specialists) },
        ];
    }

    const focus = FOCUS[spot.indicator] || FOCUS['F1.3'];
    const target = TARGETS[spot.indicator] ?? 90;
    return [
        { whoText: whoOf('GD_BCVH', directors, 'Giám đốc BCVH'), what: `${focus.review}`, where, due: 'Trong ngày',
            how: focus.how, expectedResult: 'Báo cáo phân loại rõ nguyên nhân chủ quan và khách quan', assigneeUserIds: ids(directors) },
        { whoText: `${whoOf('CHUYEN_QUAN', specialists, 'Chuyên quản')} + ${whoOf('GD_BCVH', directors, 'Giám đốc BCVH')}`, what: focus.solution, where: `TTVH / ${where}`, due: 'Trong ngày',
            how: focus.solutionHow, expectedResult: 'Biện pháp áp dụng từ N+1 giúp phục hồi chỉ tiêu', assigneeUserIds: ids(specialists, directors) },
        { whoText: whoOf('CHUYEN_QUAN', specialists, 'Chuyên quản'), what: `Theo dõi tỷ lệ ${spot.indicator} hằng ngày và báo cáo lãnh đạo TTVH`, where: 'TTVH', due: 'Hằng ngày',
            how: 'Giám sát Dashboard chất lượng lúc 07:30 mỗi sáng', expectedResult: `Chỉ tiêu đạt ngưỡng kế hoạch (≥ ${target}%)`, assigneeUserIds: ids(specialists) },
    ];
}

module.exports = { buildRows };
