'use strict';

// OPS-JOURNAL-01 (A4): writes the PL06 model (pl06Document.js) as a .docx. The file is plain OOXML zipped with jszip
// (already installed with exceljs), so no new dependency; fonts are Arial as in the PO's samples, which carries Vietnamese.
const JSZip = require('jszip');

const NAVY = '1F3864';
const ORANGE = 'C55A11';
const GREY = '595959';
const PAGE = { w: 11906, h: 16838, left: 753, right: 753, top: 700, bottom: 700 };
const TABLE_W = 10400;

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // control characters are not valid in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');

function run(text, { bold = false, italic = false, size = 16, color = null } = {}) {
    const parts = String(text ?? '').split(/\r?\n/);
    const body = parts.map((part, i) => `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(part)}</w:t>`).join('');
    return `<w:r><w:rPr>${bold ? '<w:b/><w:bCs/>' : ''}${italic ? '<w:i/><w:iCs/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>${body}</w:r>`;
}

function para(runs, { align = null, before = 20, after = 20, keepNext = false } = {}) {
    return `<w:p><w:pPr>${keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${before}" w:after="${after}"/>${align ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${runs}</w:p>`;
}

// Word merges two tables with nothing between them, so a hairline paragraph separates them
const gap = (twips = 60) => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${twips}" w:lineRule="exact"/></w:pPr></w:p>`;

function cell(width, paragraphs, { fill = null, vAlign = null } = {}) {
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:tcMar><w:top w:w="20" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>${vAlign ? `<w:vAlign w:val="${vAlign}"/>` : ''}</w:tcPr>${paragraphs}</w:tc>`;
}

function tbl(widths, rowsXml, { borders = true } = {}) {
    const edge = (side) => (borders ? `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="000000"/>` : `<w:${side} w:val="none" w:sz="0" w:space="0" w:color="FFFFFF"/>`);
    const b = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(edge).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${TABLE_W}" w:type="dxa"/><w:tblBorders>${b}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rowsXml}</w:tbl>${gap()}`;
}
const tr = (cells, { header = false } = {}) => `<w:tr><w:trPr><w:cantSplit/>${header ? '<w:tblHeader/>' : ''}</w:trPr>${cells}</w:tr>`;
const labelled = (text) => { // "Ngày: 30/10/2026" -> bold label, plain value
    const i = String(text).indexOf(': ');
    return i < 0 ? run(text, { bold: true }) : run(text.slice(0, i + 2), { bold: true }) + run(text.slice(i + 2));
};

function dataTable(item) {
    const centre = item.centerFirst ? 'center' : null;
    const head = tr(item.header.map((h, i) => cell(item.widths[i],
        para(run(h.text, { bold: true, color: 'FFFFFF' }), { align: centre })
        + (h.hint ? para(run(h.hint, { size: 13, color: 'FFFFFF' }), { align: centre, before: 0 }) : ''), { fill: item.headerFill, vAlign: 'center' })).join(''), { header: true });
    const rows = item.rows.map((row) => tr(row.map((c, i) => cell(item.widths[i],
        para(run(c.text), { align: item.centerFirst && i === 0 ? 'center' : null }), { vAlign: item.centerFirst && i === 0 ? 'center' : null })).join(''))).join('');
    return tbl(item.widths, head + rows);
}

function heading(section) {
    const widths = [8500, 1900];
    const left = cell(widths[0], para(run(section.heading, { bold: true, size: 24, color: NAVY }), { before: 100, after: 20, keepNext: true }));
    const right = cell(widths[1], para(run(`⏱ ${section.minutes}`, { bold: true, size: 16, color: ORANGE }), { align: 'right', before: 100, after: 20 }), { fill: 'FBE5D6', vAlign: 'center' });
    return tbl(widths, tr(left + right), { borders: false });
}

function sectionBody(section) {
    if (section.layout === 'cells') { // section 3: one ruled row, one cell per line
        const lines = section.blocks.filter((x) => x.kind === 'line');
        const w = [3400, 3600, 3400];
        return tbl(w, tr(lines.map((l, i) => cell(w[i], para(labelled(l.text)), { vAlign: 'center' })).join('')));
    }
    if (section.layout === 'shaded') { // section 4: question / answer / question
        const [ask, answer, process] = section.blocks.filter((x) => x.kind === 'line');
        return tbl([TABLE_W],
            tr(cell(TABLE_W, para(run(ask.text, { bold: true })), { fill: 'DCE6F1' }))
            + tr(cell(TABLE_W, para(run(answer.text)) + para('', { before: 0, after: 0 })))
            + tr(cell(TABLE_W, para(run(process.text, { bold: true })), { fill: 'DCE6F1' })));
    }
    return section.blocks.map((item) => {
        if (item.kind === 'table') return dataTable(item);
        if (item.kind === 'note') return para(run(item.text, { size: 15, italic: true, color: GREY }), { before: 0, after: 40 });
        return para(run(item.text), { before: 40, after: 40 });
    }).join('');
}

function documentXml(model) {
    const infoW = [2900, 4500, 3000];
    const info = tbl(infoW, tr(model.info.map((line, i) => cell(infoW[i], para(labelled(line.text)), { fill: 'F2F2F2', vAlign: 'center' })).join('')));
    const signW = [5200, 5200];
    const sign = tbl(signW, tr(model.signature.map((line, i) => cell(signW[i], para(labelled(line.text)), { vAlign: 'center' })).join('')));
    const body = [
        para(run(model.title, { bold: true, size: 36, color: NAVY }), { align: 'center', before: 0, after: 0 }),
        para(run(model.subtitle, { italic: true, size: 16, color: GREY }), { align: 'center', before: 0, after: 60 }),
        info,
        ...model.sections.flatMap((section) => [heading(section), sectionBody(section)]),
        gap(120),
        sign,
    ].join('');
    const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/><w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const field = (code) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const tabbed = (left, rightRuns, leftOpts = { size: 14, color: GREY }) => `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TABLE_W}"/></w:tabs></w:pPr>${run(left, leftOpts)}<w:r><w:tab/></w:r>${rightRuns}</w:p>`;

function headerXml(model) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${tabbed(model.title, run(model.headerRight, { size: 14, color: GREY }), { size: 14, bold: true, color: NAVY })}</w:hdr>`;
}

function footerXml(model) {
    const pages = `${run('Trang ', { size: 14, color: GREY })}${field('PAGE')}${run('/', { size: 14, color: GREY })}${field('NUMPAGES')}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${tabbed(model.footerLeft, pages)}</w:ftr>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;

async function buildDocx(model, { createdAt = new Date() } = {}) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES);
    zip.file('_rels/.rels', ROOT_RELS);
    zip.file('word/_rels/document.xml.rels', DOC_RELS);
    zip.file('word/document.xml', documentXml(model));
    zip.file('word/styles.xml', STYLES);
    zip.file('word/header1.xml', headerXml(model));
    zip.file('word/footer1.xml', footerXml(model));
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(model.fileBase)}</dc:title><dc:creator>QIS</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt.toISOString()}</dcterms:created></cp:coreProperties>`);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildDocx, documentXml, esc };
