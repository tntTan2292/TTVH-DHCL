'use strict';

// OPS-JOURNAL-01 (A4): the PL06 "Nhật ký điều hành hàng ngày" of ONE black spot as a small renderer-neutral model
// (title, info lines, sections with tables and lines). The Word writer (pl06Docx.js) and the print view for the PDF
// (pl06Html.js) both draw this one model, so the two files can never disagree. Layout follows the PO's PL06 samples
// (01-23/10/2026): A4, Arial, navy headings, the six-column "6 rõ" table, sections 1-4 and the signature line.
const { POSITIONS } = require('../auth/access/roles');

const SIX_CLEAR = Object.freeze([
    { title: 'STT', hint: '', width: 500 },
    { title: 'AI', hint: '(rõ người)', width: 1700 },
    { title: 'LÀM GÌ', hint: '(rõ việc)', width: 2200 },
    { title: 'Ở ĐÂU', hint: '(rõ địa điểm)', width: 1300 },
    { title: 'KHI NÀO XONG', hint: '(rõ thời hạn)', width: 1300 },
    { title: 'BẰNG CÁCH NÀO', hint: '(rõ cách làm)', width: 1800 },
    { title: 'KẾT QUẢ GÌ', hint: '(rõ kết quả cần đạt)', width: 1600 },
]);
const CHANNELS = Object.freeze(['Dashboard', 'Hiện trường', 'Báo cáo / Điện thoại']);

const box = (checked) => (checked ? '☒' : '☐');
const dmy = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
const hhmm = (value) => (/^\d{1,2}:\d{2}$/.test(String(value || '')) ? String(value).replace(':', 'h') : String(value || ''));

/** "Sáng" before 12:00, "Chiều" before 18:00, else "Đêm" (the shift the journal was finalized in). */
function shiftOf(timestamp) {
    if (!timestamp) return null;
    const hour = new Date(Number(timestamp) + 7 * 3600 * 1000).getUTCHours(); // Vietnam time, whatever the server's time zone
    return hour < 12 ? 0 : (hour < 18 ? 1 : 2);
}

/** Output file name the PO already uses, plus the spot: "PL06 - Nhat ky dieu hanh dd.mm.yyyy - F1.3 BCVH Huong Thuy". */
function fileBaseName(spot) {
    const ascii = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    const safe = (value) => ascii(value).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const office = safe(spot.officeName || spot.title.replace(/^[^-]+-\s*/, ''));
    return `PL06 - Nhat ky dieu hanh ${spot.day.slice(8, 10)}.${spot.day.slice(5, 7)}.${spot.day.slice(0, 4)} - ${safe(spot.indicator === 'HANGTON' ? 'Hang ton' : spot.indicator)} ${office}`.trim();
}

/**
 * @param spot   manager shape of visibility.getSpot (with actions, closing)
 * @param signer { name, positionCode } of the Giám đốc TTVH who finalized the spot (or the exporter)
 */
function buildPl06(spot, signer) {
    const closing = spot.closing;
    const positionLabel = POSITIONS[signer?.positionCode]?.label || signer?.positionCode || '';
    const who = signer?.name ? `${signer.name}${positionLabel ? ` (${positionLabel})` : ''}` : '';
    const shift = shiftOf(spot.finalizedAt);
    const channel = spot.channel || '';

    const sixClear = {
        kind: 'table', widths: SIX_CLEAR.map((c) => c.width), headerFill: 'C55A11',
        header: SIX_CLEAR.map((c) => ({ text: c.title, hint: c.hint })),
        rows: spot.actions.map((a, i) => [String(i + 1), a.whoText, a.what, a.where, a.due, a.how, a.expectedResult].map((text) => ({ text: text || '' }))),
        centerFirst: true,
    };

    const sections = [
        {
            heading: '1.  ĐIỂM NGHẼN HÔM NAY', minutes: '2 phút',
            blocks: [{
                kind: 'table', widths: [5200, 2400, 2800], headerFill: '1F3864',
                header: [{ text: 'Nghẽn ở đâu?' }, { text: 'Phát hiện lúc mấy giờ?' }, { text: 'Qua kênh nào?' }],
                rows: [[
                    { text: spot.headline || spot.title },
                    { text: hhmm(spot.detectedAt) },
                    { text: CHANNELS.map((c) => `${box(c === channel)} ${c}`).join('  ') },
                ]],
            }],
        },
        {
            heading: '2.  QUYẾT ĐỊNH XỬ LÝ — NGUYÊN TẮC 6 RÕ', minutes: '5 phút',
            blocks: [
                { kind: 'note', text: 'Mỗi quyết định điều xe, điều người, xử lý sự cố đều phải chốt đủ 6 cột dưới đây — không chốt việc mà thiếu rõ.' },
                sixClear,
            ],
        },
        {
            heading: '3.  KẾT QUẢ THỰC TẾ CUỐI NGÀY', minutes: '2 phút', layout: 'cells',
            blocks: [
                { kind: 'line', text: `Sự cố đã giải quyết?  ${box(closing?.resolved === true)} Rồi   ${box(closing?.resolved === false)} Chưa` },
                { kind: 'line', text: `Thời gian xử lý: ${closing?.handlingTimeText || ''}` },
                { kind: 'line', text: `Đã phục hồi bình thường?  ${box(closing?.recovered === true)} Rồi   ${box(closing?.recovered === false)} Chưa, đang theo dõi` },
            ],
        },
        {
            heading: '4.  BÀI HỌC RÚT RA', minutes: '1 phút', layout: 'shaded',
            blocks: [
                { kind: 'line', text: 'Lần sau xử lý tốt hơn thế nào?', bold: true },
                { kind: 'line', text: closing?.lesson || '' },
                {
                    kind: 'line',
                    text: closing
                        ? `Quy trình nào cần cập nhật?  ${box(!closing.processUpdate)} Không   ${box(Boolean(closing.processUpdate))} Có: ${closing.processUpdate || '......................................................'}`
                        : 'Quy trình nào cần cập nhật?  ☐ Không   ☐ Có: ......................................................',
                },
            ],
        },
    ];

    return {
        fileBase: fileBaseName(spot),
        title: 'NHẬT KÝ ĐIỀU HÀNH HÀNG NGÀY',
        subtitle: 'Giám đốc Trung tâm Vận hành – Bưu điện thành phố Huế  —  Mẫu thực chiến, hoàn thành trong 10 phút',
        headerRight: 'GĐ TTVH',
        footerLeft: 'Tài liệu nội bộ',
        info: [
            { text: `Ngày: ${dmy(spot.day)}` },
            { text: `Người ghi nhận: ${who}` },
            { text: `Ca: ${box(shift === 0)} Sáng   ${box(shift === 1)} Chiều   ${box(shift === 2)} Đêm` },
        ],
        sections,
        signature: [
            { text: `Người ghi nhận / Ký xác nhận: ${signer?.name || ''}` },
            { text: `Giờ hoàn thành nhật ký: ${closing?.doneTime ? hhmm(closing.doneTime) : ''}` },
        ],
    };
}

module.exports = { buildPl06, fileBaseName, shiftOf, dmy, SIX_CLEAR };
