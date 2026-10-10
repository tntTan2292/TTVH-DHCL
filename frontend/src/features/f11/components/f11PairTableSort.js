import { cellFieldValue, sortRowsBy } from '../../../components/common/tableSort.js';

// Click-to-order (PO 2026-10-10) of the accepting-office × delivering-unit table.
// Row order: by the accepting office name, or by the volume / rate of any delivering-unit column or of the row
// total (field keys 'name', 'total:volume', '<ma_bcvh>:rate'...). Column order: the delivering units by their
// volume or rate over the whole period ("Khác" always stays last).

export function pairRowValue(row, field) {
  if (field === 'name') return row?.ten_chap_nhan || '';
  const [column, metric] = String(field).split(':');
  return cellFieldValue(column === 'total' ? row?.total : row?.cells?.[column], metric);
}

export function orderPairColumns(columns = [], totalRow = null, colOrder = null) {
  if (!colOrder) return columns;
  const regular = columns.filter((col) => col.ma_bcvh !== 'OTHER');
  const other = columns.filter((col) => col.ma_bcvh === 'OTHER');
  const ordered = sortRowsBy(regular, colOrder.metric, colOrder.direction, (col, metric) => cellFieldValue(totalRow?.cells?.[col.ma_bcvh], metric));
  return [...ordered, ...other];
}

export function describePairSort(sort, columns = []) {
  if (!sort) return '';
  const arrow = sort.direction === 'asc' ? 'thấp → cao' : 'cao → thấp';
  if (sort.field === 'name') return `tên bưu cục (${sort.direction === 'asc' ? 'A → Z' : 'Z → A'})`;
  const [column, metric] = sort.field.split(':');
  const what = metric === 'rate' ? 'tỷ lệ đạt' : 'sản lượng';
  if (column === 'total') return `${what} tổng cộng (${arrow})`;
  const name = columns.find((col) => col.ma_bcvh === column)?.ten_bcvh || column;
  return `${what} của ${name} (${arrow})`;
}
