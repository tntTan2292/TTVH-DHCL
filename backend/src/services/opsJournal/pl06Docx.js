'use strict';

// OPS-JOURNAL-01 (A4): writes the PL06 model (pl06Document.js) as a .docx. The file is plain OOXML zipped with jszip
// (already installed with exceljs), so no new dependency; fonts are Arial as in the PO's samples, which carries Vietnamese.
const JSZip = require('jszip');

const NAVY = '1F3864';
const GREY = '595959';
const PAGE = { w: 11906, h: 16838, left: 753, right: 753, top: 700, bottom: 700 };
const TABLE_W = 10400;

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // control characters are not valid in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function run(text, { bold = false, size = 18, color = null } = {}) {
    const parts = String(text ?? '').split(/\r?\n/);
    const body = parts.map((part, i) => `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${esc(part)}</w:t>`).join('');
    return `<w:r><w:rPr>${bold ? '<w:b/><w:bCs/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>${body}</w:r>`;
}

function para(runs, { align = null, before = 20, after = 20, keepNext = false } = {}) {
    return `<w:p><w:pPr>${keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${before}" w:after="${after}"/>${align ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${runs}</w:p>`;
}

function cell(width, paragraphs, { fill = null } = {}) {
    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${paragraphs}</w:tc>`;
}

function table(block) {
    const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join('');
    const grid = block.widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
    const head = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${block.header.map((h, i) => cell(block.widths[i],
        para(run(h.text, { bold: true, size: 16, color: NAVY }), { align: 'center' }) + (h.hint ? para(run(h.hint, { size: 14, color: GREY }), { align: 'center', before: 0 }) : ''), { fill: block.headerFill })).join('')}</w:tr>`;
    const rows = block.rows.map((row) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map((c, i) => cell(block.widths[i],
        para(run(c.text, { size: 16 }), { align: block.centerFirst && i === 0 ? 'center' : null }))).join('')}</w:tr>`).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${TABLE_W}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${head}${rows}</w:tbl>`;
}

function block(item) {
    if (item.kind === 'table') return table(item) + para('', { before: 0, after: 0 });
    if (item.kind === 'note') return para(run(item.text, { size: 16, color: GREY }), { before: 20, after: 60 });
    return para(run(item.text, { bold: Boolean(item.bold), size: 18 }), { before: 40, after: 40 });
}

function documentXml(model) {
    const body = [
        para(run(model.title, { bold: true, size: 36, color: NAVY }), { align: 'center', before: 60 }),
        para(run(model.subtitle, { size: 18, color: GREY }), { align: 'center', after: 80 }),
        ...model.info.map((line) => para(run(line.text, { bold: true, size: 18 }))),
        ...model.sections.flatMap((section) => [
            para(run(section.heading, { bold: true, size: 24, color: NAVY }) + run(`     ⏱ ${section.minutes}`, { size: 16, color: GREY }), { before: 160, after: 40, keepNext: true }),
            ...section.blocks.map(block),
        ]),
        para('', { before: 120, after: 0 }),
        ...model.signature.map((line) => para(run(line.text, { bold: true, size: 18 }), { before: 60 })),
    ].join('');
    const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/><w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`;
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const field = (code) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const tabbed = (left, rightRuns) => `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="808080"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="${TABLE_W}"/></w:tabs></w:pPr>${run(left, { size: 14, color: GREY })}<w:r><w:tab/></w:r>${rightRuns}</w:p>`;

function headerXml(model) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${tabbed(model.title, run(model.headerRight, { size: 14, color: GREY }))}</w:hdr>`;
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
