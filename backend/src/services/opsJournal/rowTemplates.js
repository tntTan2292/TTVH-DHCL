'use strict';

// OPS-JOURNAL-01: when a spot is chosen the SYSTEM drafts its "6 rõ" rows (PO 2026-10-30). The model is the PL06 journals of
// 19-23/10/2026 (hàng tồn, F1.1, F1.2, F1.3, F4.1): four rows, each with the real figures of the spot, the dates of the journal
// (D = journal day, D+1 = the day the solution applies), the unit and the people on record. The manager edits anything before
// finalizing; rows with nobody on record keep the role text and the manager picks the person.
const { BCVH_BY_CODE, HANGTON_OFFICES_BY_BCVH } = require('../auth/access/officeMap');

const TARGETS = Object.freeze({ 'F1.1': 95, 'F1.2': 95, 'F1.3': 90, 'F4.1': 90 });

const dm = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
const shift = (day, delta) => {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
};
const pct = (value) => `${Math.round(Number(value) * 10) / 10}`.replace('.', ',') + '%';
const int = (value) => Number(value || 0).toLocaleString('vi-VN');

function bcvhNameOf(officeCode, title) {
    if (BCVH_BY_CODE[officeCode]) return BCVH_BY_CODE[officeCode];
    for (const [code, offices] of Object.entries(HANGTON_OFFICES_BY_BCVH)) if (offices.includes(officeCode)) return BCVH_BY_CODE[code];
    const m = /(BCVH [^-–→]+)/.exec(String(title || ''));
    return m ? m[1].trim() : 'BCVH';
}

/**
 * @param spot   { day, indicator, scopeType, title, officeCode, metrics }  (day = the journal day D)
 * @param people assignable accounts of the unit: { id, name, position, byOffice, byIndicator }
 * @returns 4 rows: { whoText, what, where, due, how, expectedResult, assigneeUserIds }
 */
function buildRows(spot, people = []) {
    const m = spot.metrics || {};
    const D = spot.day;
    const D1 = shift(D, 1);
    const dataDay = m.day || shift(D, -1);
    const bcvh = bcvhNameOf(spot.officeCode, spot.title);
    const unit = String(spot.title || '').replace(/^[^-–]*[-–]\s*/, '').trim() || bcvh;
    const label = spot.indicator;
    const target = TARGETS[label] ?? 90;
    const directors = people.filter((u) => u.position === 'GD_BCVH' && u.byOffice);
    const specialists = people.filter((u) => u.position === 'CHUYEN_QUAN');
    const unitSpecialists = specialists.filter((u) => u.byOffice);
    const indicatorSpecialists = specialists.filter((u) => u.byIndicator);
    const first = (list, fallback) => (list.length ? list : fallback)[0] || null;
    // the specialist of the unit (Chuyên quản BCVH x tại TTVH) and the specialist of the indicator (Chuyên quản chỉ tiêu F tại TTVH)
    const unitCq = first(unitSpecialists, indicatorSpecialists);
    const indCq = first(indicatorSpecialists, unitSpecialists);
    const cqUnitText = `Chuyên quản ${bcvh} tại TTVH`;
    const cqIndText = `Chuyên quản chỉ tiêu ${label} tại TTVH`;
    const named = (user, role) => (user ? `${user.name} (${role})` : role);
    const nameOnly = (user, role) => (user ? user.name : role);
    const ids = (...users) => [...new Set(users.flat().filter(Boolean).map((u) => u.id))];
    const gdText = `Giám đốc ${bcvh}`;
    const gdIds = directors;
    const deltaDown = m.delta != null && Number(m.delta) < 0;
    const failText = m.fail != null ? `${int(m.fail)} bưu gửi` : 'các bưu gửi';
    const notEval = m.notEvaluated ? ` (${int(m.fail)} không đạt, ${int(m.notEvaluated)} chưa có kết quả đánh giá)` : '';
    const total = m.notEvaluated ? `${int(Number(m.fail) + Number(m.notEvaluated))} bưu gửi` : failText;
    const reportTarget = `báo cáo trực tiếp cho ${nameOnly(unitCq || indCq, 'Chuyên quản')} tại TTVH`;

    if (label === 'HANGTON') {
        const ge5 = int(m.stockGe5);
        const ge7 = int(m.stockGe7);
        return [
            { whoText: gdText, what: Number(m.stockGe7) > 0
                    ? `Rà soát toàn bộ ${ge5} bưu gửi tồn từ 5 ngày trở lên (≥5, ≥7, ≥14 ngày), ưu tiên ${ge7} bưu gửi tồn từ 7 ngày trở lên, xử lý dứt điểm để số bưu gửi tồn từ 7 ngày trở lên về 0`
                    : `Rà soát toàn bộ ${ge5} bưu gửi tồn từ 5 ngày trở lên, xử lý dứt điểm để số bưu gửi tồn từ 5 ngày trở lên về 0`,
                where: bcvh, due: `Trong ngày ${dm(D)}`,
                how: 'Trích danh sách bưu gửi tồn trên Dashboard; xử lý theo thứ tự ưu tiên từ nhóm tồn lâu nhất (≥14 → ≥7 → ≥5 ngày); xác định nguyên nhân từng bưu gửi; giao bưu tá phát hoặc liên hệ người nhận; hoàn/chuyển tiếp theo quy định đối với bưu gửi không phát được; cập nhật trạng thái lên hệ thống',
                expectedResult: `Số bưu gửi tồn từ ${Number(m.stockGe7) > 0 ? 7 : 5} ngày trở lên tại ${bcvh} về 0`, assigneeUserIds: ids(gdIds) },
            { whoText: gdText, what: 'Báo cáo về TTVH các trường hợp BCVH không xử lý được (kèm nguyên nhân, đề xuất hướng xử lý)',
                where: `Từ ${bcvh} về Trung tâm Vận hành`, due: `Trong ngày ${dm(D)}, ngay khi xác định không xử lý được`,
                how: `Lập danh sách các bưu gửi không xử lý được, nêu rõ nguyên nhân và vướng mắc; ${reportTarget}`,
                expectedResult: `TTVH nắm đủ, kịp thời các trường hợp ${bcvh} không xử lý được`, assigneeUserIds: ids(gdIds) },
            { whoText: `${named(unitCq, cqUnitText)} phối hợp ${gdText}`, what: `Tiếp nhận và xử lý dứt điểm các trường hợp ${bcvh} không xử lý được`,
                where: `Trung tâm Vận hành và ${bcvh}`, due: `Trong ngày ${dm(D)}`,
                how: 'Làm việc trực tiếp với Giám đốc BCVH, bưu tá phụ trách; phối hợp các đơn vị liên quan; hoàn/chuyển tiếp theo quy định; cập nhật trạng thái lên hệ thống',
                expectedResult: `Không còn bưu gửi tồn từ 7 ngày trở lên tại ${bcvh}`, assigneeUserIds: ids(unitCq, gdIds) },
            { whoText: nameOnly(unitCq, cqUnitText), what: 'Theo dõi tiến độ xử lý, tổng hợp kết quả, báo cáo lãnh đạo',
                where: 'Trung tâm Vận hành', due: `Cuối ngày ${dm(D)}`,
                how: `Đối chiếu số liệu tồn trên Dashboard các mốc 11h30, 21h00 ngày ${dm(D)} và 07h30 ngày ${dm(D1)}`,
                expectedResult: 'Số bưu gửi tồn từ 7 ngày trở lên về 0; báo cáo lãnh đạo', assigneeUserIds: ids(unitCq) },
        ];
    }

    const compareText = m.compareRate != null && deltaDown
        ? `tối thiểu về mức cùng kỳ tuần trước (${pct(m.compareRate)}), hướng tới chỉ tiêu ${target}%`
        : `hướng tới chỉ tiêu ${target}%`;
    const followHow = m.mtdRate != null
        ? `Đối chiếu tỷ lệ đạt ${label} trên Dashboard hằng ngày với cùng kỳ tuần trước và lũy kế tháng`
        : `Đối chiếu tỷ lệ đạt ${label} trên Dashboard hằng ngày với cùng kỳ tuần trước`;
    const follow = (who, whoIds, subject) => ({
        whoText: who, what: `Theo dõi tỷ lệ đạt ${label} hằng ngày ${subject}, tổng hợp kết quả, báo cáo lãnh đạo`,
        where: 'Trung tâm Vận hành', due: `Cuối ngày ${dm(D)}; tiếp tục theo dõi hằng ngày`, how: followHow,
        expectedResult: `Tỷ lệ đạt ${label} ${subject} cải thiện, ${compareText}; báo cáo lãnh đạo`, assigneeUserIds: whoIds,
    });

    if (label === 'F1.2') {
        // F1.2 is special (PO 2026-10-30): only the indicator specialist works the spot, with the director of the Bưu điện Phường/Xã
        // or the counter clerk of that office, who have no account in QIS. All four rows therefore sit on the specialist.
        const cq = indicatorSpecialists[0] || null;
        const who = named(cq, cqIndText);
        const mine = ids(cq);
        const dueDay = `Trong ngày ${dm(D)}`;
        return [
            { whoText: who, what: `Rà soát toàn bộ ${failText} không đạt F1.2 tại ${unit} ngày ${dm(dataDay)}, xác định khâu phát sinh chậm theo từng khách hàng`,
                where: 'Trung tâm Vận hành', due: dueDay,
                how: 'Trích danh sách bưu gửi không đạt trên Dashboard theo từng khách hàng; đối chiếu từng bưu gửi theo các mốc thời gian nhận tin thu gom, chấp nhận, đóng BĐ8 đi, quét BĐ10 lên TMS và đóng đi',
                expectedResult: 'Xác định rõ khâu và nguyên nhân chậm của từng bưu gửi, từng khách hàng', assigneeUserIds: mine },
            { whoText: who, what: `Làm việc với Giám đốc Bưu điện Phường/Xã hoặc Giao dịch viên tại ${unit} để xác định nguyên nhân chậm ở khâu thu gom, chấp nhận, đóng đi`,
                where: unit, due: dueDay,
                how: 'Làm việc trực tiếp với người phụ trách thu gom, giao dịch viên; đối chiếu thời điểm nhận tin, thời điểm thu gom thực tế và thời điểm chấp nhận trên hệ thống; lập danh sách nguyên nhân từng bưu gửi',
                expectedResult: `TTVH nắm đủ nguyên nhân chậm của ${unit}`, assigneeUserIds: mine },
            { whoText: who, what: `Tìm giải pháp cải tiến phù hợp cho khâu thu gom, chấp nhận, đóng đi tại ${unit}`,
                where: `Trung tâm Vận hành và ${unit}`, due: dueDay,
                how: `Làm việc trực tiếp với đơn vị; phối hợp bộ phận khai thác đối với bưu gửi chậm sau khi đóng đi; chốt giải pháp áp dụng từ ngày ${dm(D1)}`,
                expectedResult: `Có giải pháp cải tiến cụ thể theo từng khâu, áp dụng từ ngày ${dm(D1)}`, assigneeUserIds: mine },
            follow(cq ? cq.name : cqIndText, mine, `tại ${unit}`),
        ];
    }

    if (label === 'F1.1') {
        const isPair = spot.scopeType === 'PAIR';
        const subject = label === 'F1.1' ? (isPair ? `của ${unit}` : `phát tại ${bcvh}`) : `tại ${unit}`;
        const focus = Array.isArray(m.focus) && m.focus.length
            ? `; thấp nhất là hàng chấp nhận tại ${m.focus.map((f) => `${f.name} (${f.passed}/${f.total} BG đạt)`).join(', ')}` : '';
        const focusFlows = Array.isArray(m.focus) && m.focus.length ? `, tập trung các luồng hàng từ ${m.focus.map((f) => f.name).join(', ')}` : '';
        const stageHow = label === 'F1.1'
            ? 'Trích danh sách bưu gửi chưa đạt trên Dashboard theo từng bưu cục chấp nhận; đối chiếu từng bưu gửi theo các mốc thời gian chấp nhận, đóng đi tại bưu cục chấp nhận, đến bưu cục khai thác, đến bưu cục phát và phát thành công'
            : 'Trích danh sách bưu gửi không đạt trên Dashboard theo từng khách hàng; đối chiếu từng bưu gửi theo các mốc thời gian nhận tin thu gom, chấp nhận, đóng BĐ8 đi, quét BĐ10 lên TMS và đóng đi';
        const partnerText = label === 'F1.1' ? gdText : (directors.length ? gdText : `Lãnh đạo ${unit}`);
        const partnerWhere = label === 'F1.1' ? `${bcvh}, báo cáo về Trung tâm Vận hành` : `${unit}, báo cáo về Trung tâm Vận hành`;
        return [
            { whoText: named(indCq, cqIndText), what: `Rà soát toàn bộ ${failText} chưa đạt ${label} ${subject} ngày ${dm(dataDay)}, xác định khâu phát sinh chậm (${label === 'F1.1' ? 'chấp nhận, khai thác, vận chuyển, phát' : 'thu gom, chấp nhận, đóng đi'})${focus}`,
                where: 'Trung tâm Vận hành', due: `Trong ngày ${dm(D)}`, how: stageHow,
                expectedResult: 'Xác định rõ khâu và nguyên nhân chậm của từng bưu gửi', assigneeUserIds: ids(indCq) },
            { whoText: partnerText, what: label === 'F1.1' ? 'Rà soát, báo cáo nguyên nhân các bưu gửi chậm hoặc chưa phát thành công ở khâu phát' : `Rà soát, báo cáo nguyên nhân chậm ở khâu thu gom, chấp nhận, đóng đi tại ${unit}`,
                where: partnerWhere, due: `Trong ngày ${dm(D)}`,
                how: `Làm việc với bưu tá, nhân viên phụ trách; lập danh sách nguyên nhân từng bưu gửi; ${reportTarget}`,
                expectedResult: `TTVH nắm đủ nguyên nhân chậm của ${label === 'F1.1' ? bcvh : unit}`, assigneeUserIds: ids(label === 'F1.1' || directors.length ? gdIds : []) },
            { whoText: `${named(unitCq, cqUnitText)} phối hợp ${[indCq && unitCq && indCq.id !== unitCq.id ? nameOnly(indCq, cqIndText) : null, partnerText].filter(Boolean).join(' và ')}`,
                what: `Tìm giải pháp cải tiến phù hợp theo từng khâu phát sinh chậm${focusFlows}`,
                where: `Trung tâm Vận hành và ${label === 'F1.1' ? bcvh : unit}`, due: `Trong ngày ${dm(D)}`,
                how: `Làm việc trực tiếp với các đơn vị liên quan theo từng khâu phát sinh chậm; chốt giải pháp áp dụng từ ngày ${dm(D1)}`,
                expectedResult: `Có giải pháp cải tiến cụ thể cho từng khâu, áp dụng từ ngày ${dm(D1)}`, assigneeUserIds: ids(unitCq, indCq, label === 'F1.1' || directors.length ? gdIds : []) },
            follow(nameOnly(indCq, cqIndText), ids(indCq), subject),
        ];
    }

    // F1.3 and F4.1 (delivery quality of a BCVH)
    const f13 = label === 'F1.3';
    const how1 = f13
        ? 'Trích danh sách bưu gửi không đạt của BCVH trên Dashboard theo từng tuyến phát; đối chiếu từng bưu gửi theo thời điểm hàng về BCVH, thời điểm giao bưu tá và thời điểm phát; làm việc với bưu tá phụ trách tuyến có nhiều bưu gửi không đạt'
        : 'Trích danh sách bưu gửi chưa đạt trên Dashboard; đối chiếu từng bưu gửi theo thời điểm quét hàng đến bưu cục phát và thời điểm phát thành công; làm việc với bưu tá phụ trách; phát dứt điểm và cập nhật trạng thái lên hệ thống đối với bưu gửi chưa phát thành công';
    return [
        { whoText: gdText, what: `Rà soát toàn bộ ${m.notEvaluated ? total : failText} ${f13 ? 'không đạt' : 'chưa đạt'} ${label} ngày ${dm(dataDay)}${notEval}, xác định nguyên nhân ${f13 ? (deltaDown ? 'giảm chất lượng so với cùng kỳ' : 'theo từng tuyến phát') : 'theo từng tuyến phát, từng bưu tá'}`,
            where: bcvh, due: `Trong ngày ${dm(D)}`, how: how1,
            expectedResult: f13 ? 'Xác định rõ nguyên nhân bưu gửi không đạt theo từng tuyến phát' : 'Xác định rõ nguyên nhân bưu gửi chưa đạt theo từng tuyến phát, từng bưu tá', assigneeUserIds: ids(gdIds) },
        { whoText: gdText, what: 'Báo cáo về TTVH kết quả rà soát (nguyên nhân, tuyến phát, bưu tá có nhiều bưu gửi không đạt), giải pháp đề xuất và các vướng mắc BCVH không tự xử lý được',
            where: `Từ ${bcvh} về Trung tâm Vận hành`, due: `Trong ngày ${dm(D)}, ngay khi rà soát xong`,
            how: `Lập danh sách bưu gửi không đạt kèm nguyên nhân từng bưu gửi, tổng hợp theo tuyến phát, bưu tá; ${reportTarget}`,
            expectedResult: `TTVH nắm đủ, kịp thời nguyên nhân ${label} của ${bcvh} thấp`, assigneeUserIds: ids(gdIds) },
        { whoText: `${named(unitCq, cqUnitText)} phối hợp ${gdText}`, what: 'Rà soát nguyên nhân chi tiết, tìm giải pháp cải tiến phù hợp cho từng tuyến phát có tỷ lệ thấp; xử lý các vướng mắc BCVH không tự xử lý được',
            where: `Trung tâm Vận hành và ${bcvh}`, due: `Trong ngày ${dm(D)}`,
            how: `Làm việc trực tiếp với Giám đốc BCVH, bưu tá phụ trách các tuyến có tỷ lệ thấp; phối hợp các đơn vị liên quan đối với nguyên nhân phát sinh ngoài BCVH; chốt giải pháp áp dụng từ ngày ${dm(D1)}`,
            expectedResult: `Có giải pháp cải tiến cụ thể cho từng tuyến phát, áp dụng từ ngày ${dm(D1)}`, assigneeUserIds: ids(unitCq, gdIds) },
        follow(nameOnly(unitCq, cqUnitText), ids(unitCq), `của ${bcvh}`),
    ];
}

module.exports = { buildRows };
