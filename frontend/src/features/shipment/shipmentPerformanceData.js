// fact_f13 event timestamps are stored as 'dd/MM/yyyy HH:mm:ss', which `new Date(string)`
// cannot parse (returns Invalid Date). Parse explicitly instead.
export function parseF13Timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateDelayHours(ptc, nopTien, extendedData) {
  if (extendedData && typeof extendedData === 'object') {
    const delay = extendedData.do_tre_gio ?? extendedData.delay_hours ?? extendedData.delayHours;
    if (delay !== undefined && delay !== null && delay !== '') {
      return Number(delay);
    }
  }

  if (!ptc || !nopTien) return null;
  const ptcDate = parseF13Timestamp(ptc);
  const nopTienDate = parseF13Timestamp(nopTien);
  if (!ptcDate || !nopTienDate) return null;
  return Number(((nopTienDate - ptcDate) / (1000 * 60 * 60)).toFixed(1));
}
