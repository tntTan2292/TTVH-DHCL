'use strict';

// OPS-JOURNAL-01 (A4): the PL06 model (pl06Document.js) as a print-ready HTML page; the PDF is this page printed by Chromium
// (Playwright, already a backend dependency), so it has the same content as the .docx. Arial carries Vietnamese.
const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const multiline = (value) => esc(value).replace(/\r?\n/g, '<br>');

function tableHtml(block) {
    const cols = block.widths.map((w) => `<col style="width:${(w / 104).toFixed(2)}%">`).join('');
    const head = block.header.map((h) => `<th style="background:#${block.headerFill}">${esc(h.text)}${h.hint ? `<small>${esc(h.hint)}</small>` : ''}</th>`).join('');
    const rows = block.rows.map((row) => `<tr>${row.map((c, i) => `<td${block.centerFirst && i === 0 ? ' class="c"' : ''}>${multiline(c.text)}</td>`).join('')}</tr>`).join('');
    return `<table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function blockHtml(item) {
    if (item.kind === 'table') return tableHtml(item);
    if (item.kind === 'note') return `<p class="note">${esc(item.text)}</p>`;
    return `<p class="line${item.bold ? ' b' : ''}">${multiline(item.text)}</p>`;
}

function buildHtml(model) {
    const sections = model.sections.map((s) => `<section><h2>${esc(s.heading)} <span>⏱ ${esc(s.minutes)}</span></h2>${s.blocks.map(blockHtml).join('')}</section>`).join('');
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(model.fileBase)}</title><style>
@page { size: A4; margin: 12mm 13mm 14mm 13mm; }
* { box-sizing: border-box; }
body { font-family: Arial, "Liberation Sans", sans-serif; font-size: 9pt; color: #000; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { text-align: center; color: #1F3864; font-size: 18pt; margin: 2mm 0 1mm; }
.sub { text-align: center; color: #595959; margin: 0 0 3mm; }
.info p { margin: 0.5mm 0; font-weight: bold; }
h2 { color: #1F3864; font-size: 12pt; margin: 3mm 0 1mm; break-after: avoid; }
h2 span { color: #C55A11; font-size: 8pt; font-weight: normal; margin-left: 4mm; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 1mm; }
th, td { border: 1px solid #000; padding: 0.8mm 1.6mm; vertical-align: top; font-size: 8pt; overflow-wrap: anywhere; }
th { color: #fff; text-align: center; }
th small { display: block; color: #fff; font-weight: normal; font-size: 7pt; }
td.c { text-align: center; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
.note { color: #595959; font-size: 8pt; margin: 1mm 0 2mm; }
.line { margin: 1mm 0; }
.b { font-weight: bold; }
.sign p { font-weight: bold; margin: 1mm 0; }
.sign { margin-top: 3mm; }
</style></head><body>
<h1>${esc(model.title)}</h1><p class="sub">${esc(model.subtitle)}</p>
<div class="info">${model.info.map((l) => `<p>${esc(l.text)}</p>`).join('')}</div>
${sections}
<div class="sign">${model.signature.map((l) => `<p>${esc(l.text)}</p>`).join('')}</div>
</body></html>`;
}

/** Header and footer templates of Chromium's PDF printer (page numbers are filled in by the browser). */
function pdfChrome(model) {
    const base = 'font-family: Arial, sans-serif; font-size: 7pt; color: #595959; width: 100%; padding: 0 13mm; display: flex; justify-content: space-between;';
    return {
        headerTemplate: `<div style="${base}"><span>${esc(model.title)}</span><span>${esc(model.headerRight)}</span></div>`,
        footerTemplate: `<div style="${base}"><span>${esc(model.footerLeft)}</span><span>Trang <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
    };
}

module.exports = { buildHtml, pdfChrome, esc };
