export const ALL_BCVH_OPTION = { value: 'all', label: 'Tất cả BCVH' };

export const CANONICAL_BCVH_CODES = Object.freeze([
  '535790',
  '536250',
  '535470',
  '537220',
  '537015',
  '533140',
]);

const CANONICAL_CODE_SET = new Set(CANONICAL_BCVH_CODES);

// `anyUnits` (indicator.dynamicUnits, F1.2): the ranked units come from the indicator's own metadata, so any
// non-empty list of unique coded, named units is valid; otherwise exactly the six canonical BCVH.
// `allowedCodes` (RBAC-01): a user limited to some BCVH receives only those units from the backend, so the list
// must be a non-empty set of unique, named canonical units that includes every allowed code (not all six).
export function validateBcvhUnits(units = [], { anyUnits = false, allowedCodes = null } = {}) {
  if (!Array.isArray(units)) {
    return { ok: false, error: 'Metadata BCVH không hợp lệ.' };
  }

  if (anyUnits) {
    if (units.length === 0) return { ok: false, error: 'Metadata chưa có đơn vị nào.' };
    const anyCodes = units.map((unit) => String(unit?.ma_bcvh || ''));
    if (anyCodes.some((code) => code === '')) return { ok: false, error: 'Metadata đơn vị thiếu mã.' };
    if (new Set(anyCodes).size !== anyCodes.length) return { ok: false, error: 'Metadata đơn vị có mã bị trùng.' };
    if (units.some((unit) => !unit?.ten_bcvh)) return { ok: false, error: 'Metadata đơn vị thiếu tên hiển thị.' };
    return { ok: true, error: null };
  }

  if (Array.isArray(allowedCodes)) {
    const scopedCodes = units.map((unit) => String(unit?.ma_bcvh || ''));
    if (scopedCodes.length === 0) return { ok: false, error: 'Chưa có BCVH nào trong phạm vi của bạn.' };
    if (new Set(scopedCodes).size !== scopedCodes.length) return { ok: false, error: 'Metadata BCVH có mã đơn vị bị trùng.' };
    const foreign = scopedCodes.find((code) => !CANONICAL_CODE_SET.has(code));
    if (foreign) return { ok: false, error: `Metadata BCVH có mã không hợp lệ: ${foreign}.` };
    if (units.some((unit) => !unit?.ten_bcvh)) return { ok: false, error: 'Metadata BCVH thiếu tên hiển thị.' };
    const missing = allowedCodes.map(String).find((code) => !scopedCodes.includes(code));
    if (missing) return { ok: false, error: `Metadata BCVH thiếu đơn vị ${missing} trong phạm vi của bạn.` };
    return { ok: true, error: null };
  }

  if (units.length !== CANONICAL_BCVH_CODES.length) {
    return { ok: false, error: 'Metadata BCVH phải có đúng 6 đơn vị.' };
  }

  const codes = units.map((unit) => String(unit?.ma_bcvh || ''));
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== CANONICAL_BCVH_CODES.length) {
    return { ok: false, error: 'Metadata BCVH có mã đơn vị bị trùng.' };
  }

  const unexpectedCode = codes.find((code) => !CANONICAL_CODE_SET.has(code));
  if (unexpectedCode) {
    return { ok: false, error: `Metadata BCVH có mã không hợp lệ: ${unexpectedCode}.` };
  }

  const missingLabel = units.find((unit) => !unit?.ten_bcvh);
  if (missingLabel) {
    return { ok: false, error: 'Metadata BCVH thiếu tên hiển thị.' };
  }

  return { ok: true, error: null };
}

export function buildBcvhOptions(units = [], options = {}) {
  const { allowedCodes = null, ...validateOptions } = options;
  const validation = validateBcvhUnits(units, { ...validateOptions, allowedCodes });
  if (!validation.ok) {
    return [];
  }

  if (Array.isArray(allowedCodes)) {
    const allowedSet = new Set(allowedCodes.map(String));
    return units
      .filter((unit) => allowedSet.has(String(unit.ma_bcvh)))
      .map((unit) => ({
        value: String(unit.ma_bcvh),
        label: String(unit.ten_bcvh),
      }));
  }

  const allOption = options.anyUnits && options.unitLabel
    ? { value: ALL_BCVH_OPTION.value, label: `Tất cả ${String(options.unitLabel).toLowerCase()}` }
    : ALL_BCVH_OPTION;

  return [
    allOption,
    ...units.map((unit) => ({
      value: String(unit.ma_bcvh),
      label: String(unit.ten_bcvh),
    })),
  ];
}

// `extraCodes`: for an indicator with dynamic units, the codes of its own metadata options replace the six BCVH.
export function isCanonicalBcvhCode(value, extraCodes = null) {
  if (Array.isArray(extraCodes)) {
    return value === ALL_BCVH_OPTION.value || extraCodes.includes(String(value));
  }
  return value === ALL_BCVH_OPTION.value || CANONICAL_CODE_SET.has(String(value));
}
