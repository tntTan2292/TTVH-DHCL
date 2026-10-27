'use strict';

// HANGTON-HANDLING-01: fill the handling in Excel. The file lists the parcels (with what was entered last time); the
// answer columns are drop-downs fed by the standard lists (sheet "Danh mục"), so the person picks instead of typing.
// The sheet shows by itself what is still to fill (PO 2026-10-27): cells that must be filled turn red while empty, cells
// that are not needed for the chosen answers turn grey, "Kiểm tra" says per row what is missing, and the result is coloured
// like on the web. "Nguyên nhân khác" / "Hướng xử lý khác" take their wording in the detail column next to them. The file is
// loaded back through the same validation as the web screen, nothing typed is lost.
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const catalog = require('./catalog');

const SHEET = 'Xử lý tồn';
const LIST_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

// `*` = always required. The other answer columns are required only for some answers: the sheet colours them.
const HEADERS = Object.freeze({
    item_code: 'Mã bưu gửi',
    office: 'Bưu cục',
    ton_level: 'Mức tồn',
    customer_class: 'Nhóm KH',
    postman_name: 'Bưu tá',
    cause: 'Nguyên nhân tồn *',
    cause_text: 'Nội dung "Nguyên nhân khác"',
    plan: 'Hướng xử lý *',
    due_date: 'Ngày phát lại / chuyển hoàn',
    plan_text: 'Chi tiết hướng xử lý',
    result: 'Kết quả xử lý *',
    note: 'Ghi chú',
    check: 'Kiểm tra (tự tính)',
});

// Columns of the sheet in order; `input` columns are the ones to fill (yellow header), `must` = always required.
const COLUMNS = Object.freeze([
    { key: 'item_code', width: 18 },
    { key: 'office', width: 22 },
    { key: 'ton_level', width: 12 },
    { key: 'customer_class', width: 14 },
    { key: 'postman_name', width: 24 },
    { key: 'cause', width: 32, input: true, must: true },
    { key: 'cause_text', width: 28, input: true },
    { key: 'plan', width: 26, input: true, must: true },
    { key: 'due_date', width: 16, input: true },
    { key: 'plan_text', width: 28, input: true },
    { key: 'result', width: 16, input: true, must: true },
    { key: 'note', width: 32, input: true },
    { key: 'check', width: 40 },
]);

const FIRST_YEAR_DATE = new Date(Date.UTC(2020, 0, 1));
const DATE_FORMAT = 'dd/mm/yyyy';

const COLORS = Object.freeze({
    must: 'FFFDE68A', input: 'FFFEF3C7', info: 'FFE2E8F0',
    needed: 'FFFECACA', notNeeded: 'FFE5E7EB',
    done: 'FFBBF7D0', pending: 'FFFED7AA', unreviewed: 'FFFFE4E6',
});

function labelOf(kind, code, text) {
    if (!code) return '';
    return catalog.optionOf(kind, code)?.label || text || code;
}

function excelDate(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function fill(argb) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// Conditional formats take the colour as bgColor.
function cfFill(argb) {
    return { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb } } };
}

const quote = (text) => `"${String(text).replace(/"/g, '""')}"`;

/** Workbook (Buffer) of parcels: `rows` = decorated items (decorateItems), pre-filled with the last entry. */
async function buildTemplate(rows) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QIS V2';
    workbook.calcProperties.fullCalcOnLoad = true;
    const sheet = workbook.addWorksheet(SHEET, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
    const lists = workbook.addWorksheet(LIST_SHEET);
    const guide = workbook.addWorksheet(GUIDE_SHEET);

    // lists: one column per question, the standard answers only
    const listColumn = {};
    ['cause', 'plan', 'result'].forEach((kind, index) => {
        const options = catalog.selectableOptions(kind);
        lists.getColumn(index + 1).width = 36;
        lists.getCell(1, index + 1).value = catalog.KIND_LABELS[kind];
        lists.getCell(1, index + 1).font = { bold: true };
        options.forEach((option, row) => { lists.getCell(row + 2, index + 1).value = option.label; });
        const letter = String.fromCharCode(65 + index);
        listColumn[kind] = `'${LIST_SHEET}'!$${letter}$2:$${letter}$${options.length + 1}`;
    });

    const causes = catalog.selectableOptions('cause');
    const autoCauses = causes.filter((option) => option.auto);
    const causeOther = catalog.optionOf('cause', catalog.OTHER).label;
    const planOther = catalog.optionOf('plan', catalog.OTHER).label;
    const datePlans = catalog.selectableOptions('plan').filter((option) => option.needsDue);
    const resultDone = catalog.optionOf('result', 'DA_XU_LY').label;
    const resultPending = catalog.optionOf('result', 'CHUA_XU_LY').label;

    [
        'Cách điền (hoặc nhập trực tiếp trên web, mục Chi tiết bưu gửi):',
        '1. Chỉ cần chọn bằng ô xổ xuống ở mỗi dòng. Cột có dấu * trong tiêu đề luôn bắt buộc: Nguyên nhân tồn, Hướng xử lý, Kết quả xử lý.',
        `2. ${autoCauses.map((option) => `"${option.label}"`).join(' và ')}: bưu gửi coi như đã xử lý xong. KHÔNG cần chọn Hướng xử lý và Kết quả xử lý (hệ thống tự tính Đã xử lý). `
            + `Với "${autoCauses.find((option) => option.auto.due_defaults_to_today)?.label || ''}" ngày để trống thì tính là hôm nay.`,
        `3. Ô nào còn phải điền thì tô ĐỎ, ô không cần điền thì tô XÁM. Cột "Kiểm tra (tự tính)" cuối dòng cho biết dòng đủ hay còn thiếu gì.`,
        `4. Chọn ${datePlans.map((option) => `"${option.label}"`).join(' hoặc ')} thì mới phải nhập cột "Ngày phát lại / chuyển hoàn" (dd/mm/yyyy, không trước hôm nay).`,
        '5. Chọn "Liên hệ Bưu cục gốc" hoặc "Chuyển cấp trên hỗ trợ" thì có thể ghi rõ liên hệ ai trong cột "Chi tiết hướng xử lý" (không bắt buộc).',
        `6. Chọn "${causeOther}" thì bắt buộc gõ nội dung vào cột "Nội dung nguyên nhân khác"; chọn "${planOther}" thì bắt buộc gõ vào cột "Chi tiết hướng xử lý". Hệ thống tự gom các cách gõ giống nhau khi thống kê.`,
        `7. Kết quả chỉ có: ${resultDone} (xanh lá), ${resultPending} (cam). Dòng chưa rà soát tô hồng.`,
        '8. Dòng không điền gì được bỏ qua. Không đổi tên cột, không xóa cột Mã bưu gửi. Lưu file rồi bấm "Nhập file đã điền" trên web.',
    ].forEach((line, index) => { guide.getCell(index + 1, 1).value = line; });
    guide.getColumn(1).width = 150;
    guide.getCell(1, 1).font = { bold: true };

    sheet.columns = COLUMNS.map((column) => ({ header: HEADERS[column.key], key: column.key, width: column.width }));
    const header = sheet.getRow(1);
    header.height = 32;
    header.eachCell((cell, index) => {
        const column = COLUMNS[index - 1];
        cell.font = { bold: true };
        cell.fill = fill(column?.must ? COLORS.must : (column?.input ? COLORS.input : COLORS.info));
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
    });

    for (const row of rows) {
        const last = row.handling?.last;
        const auto = last ? catalog.optionOf('cause', last.cause_code)?.auto : null;
        sheet.addRow({
            item_code: row.item_code,
            office: row.office || '',
            ton_level: row.ton_level || '',
            customer_class: row.customer_class || '',
            postman_name: last?.postman_name || row.postman_name || '',
            cause: last ? labelOf('cause', last.cause_code, last.cause_text) : '',
            cause_text: last && last.cause_code === catalog.OTHER ? (last.cause_text || '') : '',
            plan: last && !auto ? labelOf('plan', last.plan_code, last.plan_text) : '',
            due_date: excelDate(last?.due_date),
            plan_text: last && last.plan_code && !auto ? (last.plan_text || '') : '',
            result: last ? labelOf('result', last.result_code, last.result_text) : '',
            note: last?.note || '',
        });
    }
    sheet.getColumn('due_date').numFmt = DATE_FORMAT;
    const lastRow = Math.max(rows.length + 1, 2);
    const col = (key) => String.fromCharCode(65 + COLUMNS.findIndex((column) => column.key === key));
    const F = `$${col('cause')}2`;
    const G = `$${col('cause_text')}2`;
    const H = `$${col('plan')}2`;
    const I = `$${col('due_date')}2`;
    const J = `$${col('plan_text')}2`;
    const K = `$${col('result')}2`;
    const M = `$${col('check')}2`;

    // the formula of "Kiểm tra": what is missing on this row
    const isAuto = `OR(${autoCauses.map((option) => `${F}=${quote(option.label)}`).join(',')})`;
    const needsDate = `OR(${datePlans.map((option) => `${H}=${quote(option.label)}`).join(',')})`;
    const missing = `TRIM(IF(AND(${F}=${quote(causeOther)},${G}=""),"Nội dung nguyên nhân khác; ","")`
        + `&IF(${H}="","Hướng xử lý; ","")`
        + `&IF(AND(${H}=${quote(planOther)},${J}=""),"Chi tiết hướng xử lý; ","")`
        + `&IF(AND(${needsDate},${I}=""),"Ngày; ","")`
        + `&IF(${K}="","Kết quả xử lý; ",""))`;
    const pastDate = `AND(${I}<>"",${I}<TODAY())`;
    const checkFormula = `IF(${F}="","",IF(${isAuto},IF(${pastDate},"✖ Ngày trước hôm nay","✔ Đủ · tự tính: ${resultDone}"),`
        + `IF(${missing}<>"","✖ Thiếu: "&${missing},IF(${pastDate},"✖ Ngày trước hôm nay","✔ Đủ"))))`;
    rows.forEach((_, index) => {
        const r = index + 2;
        sheet.getCell(`${col('check')}${r}`).value = { formula: checkFormula.replace(/\$([A-Z])2/g, (_m, c) => `$${c}${r}`) };
    });
    if (rows.length === 0) sheet.getCell(`${col('check')}2`).value = { formula: checkFormula };

    const rule = (formula, argb, stopIfTrue = true) => ({ type: 'expression', formulae: [formula], style: cfFill(argb), stopIfTrue });
    const range = (key) => `${col(key)}2:${col(key)}${lastRow}`;
    sheet.addConditionalFormatting({ ref: range('cause_text'), rules: [
        rule(`AND(${F}=${quote(causeOther)},${G}="")`, COLORS.needed),
        rule(`AND(${F}<>"",${F}<>${quote(causeOther)})`, COLORS.notNeeded),
    ] });
    sheet.addConditionalFormatting({ ref: range('plan'), rules: [
        rule(isAuto, COLORS.notNeeded),
        rule(`AND(${F}<>"",${H}="")`, COLORS.needed),
    ] });
    sheet.addConditionalFormatting({ ref: range('due_date'), rules: [
        rule(`AND(${needsDate},${I}="")`, COLORS.needed),
        rule(pastDate, COLORS.needed),
        rule(`AND(${F}<>"",NOT(${needsDate}),${F}<>${quote(autoCauses.find((option) => option.auto.due_defaults_to_today)?.label || '')})`, COLORS.notNeeded),
    ] });
    sheet.addConditionalFormatting({ ref: range('plan_text'), rules: [
        rule(`AND(${H}=${quote(planOther)},${J}="")`, COLORS.needed),
        rule(`AND(${F}<>"",OR(${isAuto},${needsDate}))`, COLORS.notNeeded),
    ] });
    sheet.addConditionalFormatting({ ref: range('result'), rules: [
        rule(`${K}=${quote(resultDone)}`, COLORS.done),
        rule(`${K}=${quote(resultPending)}`, COLORS.pending),
        rule(isAuto, COLORS.notNeeded),
        rule(`AND(${F}<>"",${K}="")`, COLORS.needed),
        rule(`AND(${F}="",${K}="")`, COLORS.unreviewed),
    ] });
    sheet.addConditionalFormatting({ ref: range('check'), rules: [
        { type: 'expression', formulae: [`LEFT(${M},1)="✔"`], style: { font: { color: { argb: 'FF166534' }, bold: true } }, stopIfTrue: true },
        { type: 'expression', formulae: [`LEFT(${M},1)="✖"`], style: { font: { color: { argb: 'FFB91C1C' }, bold: true } }, stopIfTrue: true },
    ] });

    const dropdown = (kind) => ({
        type: 'list',
        allowBlank: true,
        formulae: [listColumn[kind]],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Chọn trong danh sách',
        error: 'Chỉ chọn nội dung trong danh sách xổ xuống.',
        showInputMessage: true,
        promptTitle: catalog.KIND_LABELS[kind],
        prompt: 'Bấm mũi tên để chọn.',
    });
    sheet.dataValidations.add(`${col('cause')}2:${col('cause')}${lastRow}`, dropdown('cause'));
    sheet.dataValidations.add(`${col('plan')}2:${col('plan')}${lastRow}`, dropdown('plan'));
    sheet.dataValidations.add(`${col('result')}2:${col('result')}${lastRow}`, dropdown('result'));
    sheet.dataValidations.add(`${col('due_date')}2:${col('due_date')}${lastRow}`, {
        type: 'date',
        operator: 'greaterThan',
        formulae: [FIRST_YEAR_DATE],
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Ngày không hợp lệ',
        error: 'Nhập ngày theo dạng dd/mm/yyyy.',
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
    return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Label typed or picked in the file -> { code, text }: a standard label (any case/accents) or the typed wording. */
function resolveAnswer(kind, typed, detail = '') {
    const text = String(typed ?? '').trim();
    const extra = String(detail ?? '').trim();
    if (!text) return { code: '', text: '' };
    const norm = catalog.normalizeText(text);
    const hit = catalog.selectableOptions(kind).find((option) => catalog.normalizeText(option.label) === norm || option.code.toLowerCase() === text.toLowerCase());
    if (hit) return { code: hit.code, text: hit.code === catalog.OTHER || hit.askText ? extra : '' };
    // not a standard label: kept as "Khác" with the typed wording where the list has one; otherwise rejected by validation
    if (catalog.selectableOptions(kind).some((option) => option.code === catalog.OTHER)) return { code: catalog.OTHER, text: extra || text };
    return { code: `?${text}`, text: '' };
}

/** Date cell -> YYYY-MM-DD: Excel serial, "dd/mm/yyyy", "yyyy-mm-dd" or a Date; anything else is returned as typed. */
function cellDate(value) {
    if (value instanceof Date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        const parts = XLSX.SSF.parse_date_code(value);
        if (!parts) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${parts.y}-${pad(parts.m)}-${pad(parts.d)}`;
    }
    const text = String(value ?? '').trim();
    const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    return text;
}

function cellText(value) {
    return String(value ?? '').trim();
}

// A title is recognised without its "*" mark, quotes, case or accents, so files made before the marks came in still load.
const HEADER_KEYS = new Map(Object.entries(HEADERS).map(([key, title]) => [catalog.normalizeText(title), key]));

/** Rows of an uploaded workbook -> [{ item_code, input }] for recordEntries. Rows with no answer at all are ignored. */
function parseUpload(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[SHEET] || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { entries: [], ignored: 0 };
    const table = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    const columnOf = {};
    (table[0] || []).forEach((title, index) => {
        const key = HEADER_KEYS.get(catalog.normalizeText(title));
        if (key && columnOf[key] === undefined) columnOf[key] = index;
    });
    const entries = [];
    let ignored = 0;
    for (const line of table.slice(1)) {
        const get = (key) => (columnOf[key] === undefined ? '' : line[columnOf[key]]);
        const itemCode = cellText(get('item_code'));
        if (!itemCode) { ignored += 1; continue; }
        const cause = resolveAnswer('cause', get('cause'), get('cause_text'));
        const plan = resolveAnswer('plan', get('plan'), get('plan_text'));
        const result = resolveAnswer('result', get('result'));
        if (!cause.code && !plan.code && !result.code) { ignored += 1; continue; }
        entries.push({
            item_code: itemCode,
            input: {
                cause_code: cause.code, cause_text: cause.text, plan_code: plan.code, plan_text: plan.text,
                result_code: result.code, result_text: result.text,
                due_date: cellDate(get('due_date')), note: cellText(get('note')), postman_name: cellText(get('postman_name')),
            },
        });
    }
    return { entries, ignored };
}

module.exports = { HEADERS, buildTemplate, parseUpload, resolveAnswer };
