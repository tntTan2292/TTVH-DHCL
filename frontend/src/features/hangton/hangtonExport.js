// HANGTON-INVENTORY-01 Phase 3: Pure CSV export with UTF-8 BOM for Excel Vietnamese support.

/**
 * Escape a single cell for CSV formatting.
 */
export function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Builds CSV string with UTF-8 BOM from headers and rows.
 * @param {Array<{ key: string, label: string }>} headers
 * @param {Array<Object>} rows
 * @returns {string} CSV text with leading BOM
 */
export function buildCsvContent(headers = [], rows = []) {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const lines = [headerLine];

  for (const row of rows) {
    const line = headers.map((h) => escapeCsvCell(row[h.key] ?? '')).join(',');
    lines.push(line);
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Browser-side download trigger.
 */
export function downloadCsv(filename, headers, rows) {
  const content = buildCsvContent(headers, rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
