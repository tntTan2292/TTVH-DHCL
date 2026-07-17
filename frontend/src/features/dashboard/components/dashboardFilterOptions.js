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

export function validateBcvhUnits(units = []) {
  if (!Array.isArray(units)) {
    return { ok: false, error: 'Metadata BCVH không hợp lệ.' };
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

export function buildBcvhOptions(units = []) {
  const validation = validateBcvhUnits(units);
  if (!validation.ok) {
    return [];
  }

  return [
    ALL_BCVH_OPTION,
    ...units.map((unit) => ({
      value: String(unit.ma_bcvh),
      label: String(unit.ten_bcvh),
    })),
  ];
}

export function isCanonicalBcvhCode(value) {
  return value === ALL_BCVH_OPTION.value || CANONICAL_CODE_SET.has(String(value));
}
