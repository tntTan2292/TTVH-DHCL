// Display helpers for the Home page tables: the full prefix is dropped where the column header already says it.
function dropPrefix(value, prefix) {
  const text = String(value || '');
  return text.toLowerCase().startsWith(prefix.toLowerCase()) ? text.slice(prefix.length).trimStart() : text;
}

/** "Bưu điện Tỉnh Thừa Thiên Huế" -> "Tỉnh Thừa Thiên Huế" (province table). */
export const shortProvinceName = (name) => dropPrefix(name, 'Bưu điện ');

/** "BCVH Hương Thủy" -> "Hương Thủy" (delivering BCVH column). */
export const shortBcvhName = (name) => dropPrefix(name, 'BCVH ');
