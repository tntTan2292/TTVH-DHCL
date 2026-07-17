export const ALL_BCVH_OPTION = { value: 'all', label: 'Tất cả BCVH' };

export function buildBcvhOptions(units = []) {
  const canonicalUnits = units
    .filter((unit) => unit?.ma_bcvh && unit?.ten_bcvh)
    .map((unit) => ({
      value: String(unit.ma_bcvh),
      label: String(unit.ten_bcvh),
    }));

  return [ALL_BCVH_OPTION, ...canonicalUnits];
}
