'use strict';

// HANGTON-HANDLING-01: the standard answers of the three questions asked about a stock parcel (cause, handling plan,
// result), the "Khác" free text, and the smart grouping that keeps the statistics from scattering over hundreds of
// wordings. A free text is stored word for word; only the READ side puts it into a group, so a rule or a mapping
// added later also regroups every old entry.

const OTHER = 'OTHER';
const UNGROUPED = 'OTHER_UNGROUPED';
const KINDS = Object.freeze(['cause', 'plan', 'result']);
const KIND_LABELS = Object.freeze({ cause: 'Nội dung xử lý', plan: 'Hướng xử lý', result: 'Kết quả xử lý' });
const DONE = 'DA_XU_LY';
const NOT_DONE = 'CHUA_XU_LY';

// selectable: shown in the entry form and in the Excel drop-downs. Entries with selectable=false only exist so the grouping
// has somewhere to put a "Khác" free text (and so old wordings keep a label). needsDue: a date is required with this answer
// ("Phát lại ngày ...", "Chuyển hoàn ngày ..."). askText: the answer takes an optional detail ("Liên hệ Bưu cục gốc ...").
// keywords: no accents, lower case.
// The first question is shown as "Nội dung xử lý" (PO 2026-10-27); its code and column stay `cause`.
// auto: a content that settles the parcel by itself ("Phát thành công", "Chuyển hoàn", "Mất", "Vô thừa nhận"): the plan is set
// to auto.plan_code (locked) and the result is "Đã xử lý". Any other content leaves the parcel "Chưa xử lý". The result is
// never typed or chosen: the backend always derives it from the content (resultOf).
// askText on a settling content: an optional detail that reads after the label ("Mất 27/10", "Phát thành công 27/10").
// auto.dueIsToday: the date of the plan is today whatever was sent ("Chuyển hoàn" = returned today).
const CATALOG = Object.freeze({
    cause: [
        { code: 'PHAT_THANH_CONG', label: 'Phát thành công', selectable: true, askText: true, auto: { plan_code: 'DA_PHAT', result_code: 'DA_XU_LY' }, keywords: ['phat thanh cong', 'phat hoan thanh cong', 'phat hoan tc', 'phat tc', 'ptc', 'da phat', 'phat duoc', 'da giao'] },
        { code: 'CHUYEN_HOAN', label: 'Chuyển hoàn', selectable: true, askText: true, auto: { plan_code: 'CHUYEN_HOAN', result_code: 'DA_XU_LY', dueIsToday: true }, keywords: ['chuyen hoan', 'hoan', 'hoan ve', 'tra ve', 'tra nguoi gui'] },
        { code: 'MAT', label: 'Mất', selectable: true, askText: true, auto: { plan_code: 'DA_MAT', result_code: 'DA_XU_LY' }, keywords: ['mat', 'mat hang', 'bi mat', 'that lac', 'da mat'] },
        { code: 'VO_THUA_NHAN', label: 'Vô thừa nhận', selectable: true, askText: true, auto: { plan_code: 'DA_VTN', result_code: 'DA_XU_LY' }, keywords: ['vo thua nhan', 'chuyen vo thua nhan', 'da chuyen vtn'] },
        { code: 'CHO_HOAN', label: 'Chờ hoàn', selectable: true, keywords: ['cho hoan', 'cho phat hoan', 'cho chuyen hoan', 'cho tra ve'] },
        { code: 'KH_HEN_PHAT_LAI', label: 'Khách hàng hẹn phát lại', selectable: true, keywords: ['hen phat lai', 'khach hen', 'hen lai', 'hen ngay', 'doi ngay'] },
        { code: 'THU_TCNH_LUU_7N', label: 'Thư TCNH có yêu cầu lưu 7 ngày', selectable: true, keywords: ['tcnh', 'luu 7 ngay', 'luu 7', 'yeu cau luu'] },
        { code: 'CHO_CHUYEN_VTN', label: 'Chờ chuyển VTN', selectable: true, keywords: ['vtn', 'cho chuyen vtn', 'cho chuyen'] },
        { code: OTHER, label: 'Nguyên nhân khác', selectable: true, keywords: [] },
        { code: 'KHACH_VANG', label: 'Khách vắng nhà', selectable: false, keywords: ['vang', 'di vang', 'khong o nha', 'khong co nha', 'khong co ai', 'dong cua', 'di lam', 'di xa'] },
        { code: 'SAI_DIA_CHI_SDT', label: 'Sai địa chỉ / số điện thoại', selectable: false, keywords: ['sai dia chi', 'sai sdt', 'sai so dien thoai', 'thieu dia chi', 'thieu sdt', 'dia chi khong', 'khong tim duoc', 'khong tim thay', 'khong ro dia chi', 'sai so'] },
        { code: 'KHACH_TU_CHOI', label: 'Khách từ chối nhận', selectable: false, keywords: ['tu choi', 'khong nhan', 'khong lay', 'huy don', 'khong dat', 'khong mua', 'khong dung'] },
        { code: 'BUU_TA_CHUA_PHAT', label: 'Bưu tá chưa phát', selectable: false, keywords: ['chua phat', 'buu ta', 'chua kip', 'chua giao', 'het gio', 'qua tai', 'thieu nhan luc'] },
        { code: 'HANG_NANG_CONG_KENH', label: 'Hàng nặng / cồng kềnh', selectable: false, keywords: ['nang', 'cong kenh', 'kich thuoc', 'qua kho', 'can xe'] },
        { code: 'KHONG_LIEN_LAC', label: 'Không liên lạc được khách', selectable: false, keywords: ['khong lien lac', 'khong goi duoc', 'khong nghe may', 'khong bat may', 'thue bao', 'tat may', 'khong lien he'] },
        { code: 'THIEN_TAI_GIAO_THONG', label: 'Thời tiết / giao thông', selectable: false, keywords: ['mua', 'lu', 'bao', 'ngap', 'sat lo', 'tac duong', 'cam duong', 'hu xe', 'hong xe'] },
        { code: 'COD_THANH_TOAN', label: 'Tiền COD / thanh toán', selectable: false, keywords: ['cod', 'tien', 'thanh toan', 'chua co tien', 'thieu tien', 'doi tien'] },
    ],
    plan: [
        { code: 'PHAT_LAI', label: 'Phát lại ngày', selectable: true, needsDue: true, keywords: ['phat lai', 'giao lai', 'di phat lai', 'phat tiep'] },
        { code: 'CHUYEN_HOAN', label: 'Chuyển hoàn ngày', selectable: true, needsDue: true, keywords: ['hoan', 'tra ve', 'tra nguoi gui', 'tra lai'] },
        { code: 'LIEN_HE_BC_GOC', label: 'Liên hệ Bưu cục gốc', selectable: true, askText: true, keywords: ['buu cuc goc', 'bc goc', 'lien he goc'] },
        { code: 'CHUYEN_CAP_TREN', label: 'Chuyển cấp trên hỗ trợ', selectable: true, askText: true, keywords: ['cap tren', 'ho tro', 'bao cap tren', 'chuyen len'] },
        { code: OTHER, label: 'Hướng xử lý khác', selectable: true, keywords: [] },
        { code: 'DA_PHAT', label: 'Đã phát thành công', selectable: false, keywords: [] },
        { code: 'DA_MAT', label: 'Ghi nhận mất', selectable: false, keywords: [] },
        { code: 'DA_VTN', label: 'Ghi nhận vô thừa nhận', selectable: false, keywords: [] },
        { code: 'HEN_LAI_KH', label: 'Hẹn lại khách', selectable: false, keywords: ['hen lai', 'hen khach', 'hen ngay', 'khach hen', 'doi ngay'] },
        { code: 'LIEN_HE_KH', label: 'Liên hệ khách', selectable: false, keywords: ['lien he', 'goi khach', 'goi dien', 'nhan tin', 'zalo', 'xac nhan khach'] },
        { code: 'CHUYEN_BCVH_KHAC', label: 'Chuyển BCVH khác / sai địa chỉ', selectable: false, keywords: ['chuyen buu cuc', 'chuyen bcvh', 'chuyen sang', 'sai tuyen', 'chuyen tuyen', 'chuyen dia ban'] },
        { code: 'CHO_KH_NHAN', label: 'Chờ khách đến nhận', selectable: false, keywords: ['cho khach', 'khach den nhan', 'tu den nhan', 'nhan tai buu cuc', 'hen lay', 'den lay'] },
        { code: 'NGHI_THAT_LAC', label: 'Nghi thất lạc', selectable: false, keywords: ['that lac', 'mat hang', 'tim kiem', 'khong thay hang', 'ra soat kho'] },
    ],
    result: [
        { code: 'DA_XU_LY', label: 'Đã xử lý', selectable: true, keywords: [] },
        { code: 'CHUA_XU_LY', label: 'Chưa xử lý', selectable: true, keywords: [] },
    ],
});

const TEXT_MAX = 200;
const NOTE_MAX = 500;

/** Lower case, no accents, punctuation to spaces, single spaces: the key under which a wording is compared. */
function normalizeText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function optionOf(kind, code) {
    return (CATALOG[kind] || []).find((entry) => entry.code === code) || null;
}

function selectableOptions(kind) {
    return (CATALOG[kind] || []).filter((entry) => entry.selectable).map(({ code, label, needsDue = false, askText = false, auto = null }) => {
        const option = { code, label, needsDue, askText };
        if (auto) {
            option.auto = {
                plan_code: auto.plan_code,
                plan_label: optionOf('plan', auto.plan_code)?.label || auto.plan_code,
                result_code: auto.result_code,
                result_label: optionOf('result', auto.result_code)?.label || auto.result_code,
                needs_due: Boolean(optionOf('plan', auto.plan_code)?.needsDue),
                due_is_today: Boolean(auto.dueIsToday),
            };
        }
        return option;
    });
}

/** Words of the keyword must all appear as a whole-word run in the text ("vang" never matches inside another word). */
function keywordMatches(norm, keyword) {
    return ` ${norm} `.includes(` ${keyword} `);
}

/**
 * Group of one answer. A standard answer is its own group. A "Khác" text goes to: the mapping a chuyen quan set for
 * exactly that wording -> the most specific keyword rule that matches -> "Khác – chưa phân nhóm".
 * manualMap: Map(normalizedText -> groupCode) of that kind.
 */
function groupOf(kind, code, text, manualMap = new Map()) {
    if (code !== OTHER) return code;
    const norm = normalizeText(text);
    if (!norm) return UNGROUPED;
    if (manualMap.has(norm)) return manualMap.get(norm);
    // the most specific rule wins (the keyword of most words: "cho hoan" over "hoan"); on a tie the earlier answer of the list
    let best = null;
    let bestWords = 0;
    for (const entry of CATALOG[kind] || []) {
        if (entry.code === OTHER) continue;
        for (const keyword of entry.keywords) {
            const words = keyword.split(' ').length;
            if (words > bestWords && keywordMatches(norm, keyword)) { best = entry.code; bestWords = words; }
        }
    }
    return best || UNGROUPED;
}

/** Label of a group code; customGroups: Map(code -> label) the chuyen quan created. */
function groupLabel(kind, code, customGroups = new Map()) {
    if (code === UNGROUPED) return 'Khác – chưa phân nhóm';
    return optionOf(kind, code)?.label || customGroups.get(code) || code;
}

/** The result of a review follows from its content: a content that settles the parcel is "Đã xử lý", any other one "Chưa xử lý". */
function resultOf(causeCode) {
    const option = optionOf('cause', causeCode);
    return option?.selectable && option.auto ? option.auto.result_code : NOT_DONE;
}

function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Checks the fields of one review. Returns { ok, errors: [{field, message}], value } where value is the cleaned entry.
 * The content and the plan are required (a content with `auto` sets the plan itself); the result is never asked, it is
 * derived (resultOf). A "Khác" answer needs its text; a due date is required with a plan that has needsDue and must not be
 * before `today`; with a content whose date is today ("Chuyển hoàn") the date is `today`.
 */
function validateEntry(input = {}, { today } = {}) {
    const errors = [];
    const value = {};
    const causeOption = optionOf('cause', String(input.cause_code ?? '').trim());
    const auto = causeOption?.selectable ? causeOption.auto : null;
    for (const kind of KINDS) {
        if (kind === 'result') {
            value.result_code = resultOf(causeOption?.code);
            value.result_text = null;
            continue;
        }
        if (auto && kind === 'plan') {
            // the content settles the parcel: the plan is set by it, whatever was typed
            value.plan_code = auto.plan_code;
            value.plan_text = null;
            continue;
        }
        const code = String(input[`${kind}_code`] ?? '').trim();
        const option = optionOf(kind, code);
        if (!code || !option || !option.selectable) {
            errors.push({ field: `${kind}_code`, message: `Chọn ${KIND_LABELS[kind].toLowerCase()}` });
            continue;
        }
        value[`${kind}_code`] = code;
        const text = String(input[`${kind}_text`] ?? '').trim();
        if (option.askText) {
            // detail asked by the answer ("Liên hệ Bưu cục gốc ..."): optional
            if (text.length > TEXT_MAX) errors.push({ field: `${kind}_text`, message: `Nội dung quá dài (tối đa ${TEXT_MAX} ký tự)` });
            value[`${kind}_text`] = text || null;
        } else if (code === OTHER) {
            if (text.length < 2) errors.push({ field: `${kind}_text`, message: `Nhập nội dung "Khác" cho ${KIND_LABELS[kind].toLowerCase()}` });
            else if (text.length > TEXT_MAX) errors.push({ field: `${kind}_text`, message: `Nội dung quá dài (tối đa ${TEXT_MAX} ký tự)` });
            value[`${kind}_text`] = text;
        } else {
            value[`${kind}_text`] = null;
        }
    }
    const needsDue = ['plan', 'result'].some((kind) => optionOf(kind, value[`${kind}_code`])?.needsDue);
    let due = String(input.due_date ?? '').trim();
    if (auto?.dueIsToday && today) due = today;
    if (auto && !needsDue) due = ''; // "Phát thành công", "Mất", "Vô thừa nhận" have no date to keep
    if (needsDue && !due) errors.push({ field: 'due_date', message: 'Nhập ngày hẹn xử lý' });
    else if (due && !isValidDate(due)) errors.push({ field: 'due_date', message: 'Ngày hẹn không hợp lệ (YYYY-MM-DD)' });
    else if (due && today && due < today) errors.push({ field: 'due_date', message: 'Ngày hẹn không được trước hôm nay' });
    value.due_date = due || null;
    const note = String(input.note ?? '').trim();
    if (note.length > NOTE_MAX) errors.push({ field: 'note', message: `Ghi chú quá dài (tối đa ${NOTE_MAX} ký tự)` });
    value.note = note || null;
    value.postman_code = String(input.postman_code ?? '').trim() || null;
    value.postman_name = String(input.postman_name ?? '').trim() || null;
    return { ok: errors.length === 0, errors, value };
}

function publicCatalog() {
    return {
        other_code: OTHER,
        ungrouped_code: UNGROUPED,
        kinds: KINDS.map((kind) => ({ kind, label: KIND_LABELS[kind], options: selectableOptions(kind) })),
        text_max: TEXT_MAX,
        note_max: NOTE_MAX,
    };
}

module.exports = {
    OTHER, UNGROUPED, KINDS, KIND_LABELS, CATALOG, TEXT_MAX, NOTE_MAX, DONE, NOT_DONE,
    normalizeText, resultOf, optionOf, selectableOptions, groupOf, groupLabel, isValidDate, validateEntry, publicCatalog,
};
