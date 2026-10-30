// Pure helpers for OPS-JOURNAL-01 (PL06) - Daily quality alerts and journal module
// Adheres strictly to OPS-JOURNAL-01_MANIFEST.md Sections 2, 6, 9 and report_block_ui_standard.md.

export const MIN_SELECTED_SPOTS = 1;
export const MAX_SELECTED_SPOTS = 50; // sanity cap only; the manager decides how many

/**
 * Returns today's date in YYYY-MM-DD format according to Vietnam timezone (UTC+7).
 */
export function getVietnamToday() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Chip color family definitions per OPS-JOURNAL-01 Section 9 & ticket prompt:
 * - F1.1 xanh lá (green)
 * - F1.3 xanh dương (blue)
 * - F4.1 cam (orange / amber)
 * - F1.2 trung tính nhạt (neutral light: slate/gray)
 * - HANGTON: rose/coral light
 * Constraint: Không dùng màu tím (purple/violet/indigo) hoặc tông tối (dark tones).
 */
export const INDICATOR_CHIP_CONFIG = Object.freeze({
  'F1.1': Object.freeze({
    indicator: 'F1.1',
    label: 'F1.1 – Nội tỉnh',
    shortLabel: 'F1.1',
    family: 'green',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    accentClass: 'border-l-emerald-500',
  }),
  'F1.2': Object.freeze({
    indicator: 'F1.2',
    label: 'F1.2 – Thu gom',
    shortLabel: 'F1.2',
    family: 'neutral',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    accentClass: 'border-l-slate-400',
  }),
  'F1.3': Object.freeze({
    indicator: 'F1.3',
    label: 'F1.3 – Phát liên tỉnh',
    shortLabel: 'F1.3',
    family: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-300',
    dotClass: 'bg-blue-600',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    accentClass: 'border-l-blue-600',
  }),
  'F4.1': Object.freeze({
    indicator: 'F4.1',
    label: 'F4.1 – Bưu cục',
    shortLabel: 'F4.1',
    family: 'orange',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
    accentClass: 'border-l-orange-500',
  }),
  'HANGTON': Object.freeze({
    indicator: 'HANGTON',
    label: 'Hàng tồn',
    shortLabel: 'Hàng tồn',
    family: 'red',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-300',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    accentClass: 'border-l-rose-500',
  }),
});

/**
 * Normalizes an indicator string (e.g. 'f1.1' -> 'F1.1', 'hang_ton' -> 'HANGTON')
 */
export function normalizeIndicator(raw = '') {
  const clean = String(raw || '').trim().toUpperCase().replace(/[\s_-]+/g, '');
  if (clean === 'F11' || clean === 'F1.1') return 'F1.1';
  if (clean === 'F12' || clean === 'F1.2') return 'F1.2';
  if (clean === 'F13' || clean === 'F1.3') return 'F1.3';
  if (clean === 'F41' || clean === 'F4.1') return 'F4.1';
  if (clean === 'HANGTON' || clean === 'HANG_TON' || clean === 'HT') return 'HANGTON';
  return clean;
}

/**
 * Returns chip style configuration for a given indicator.
 * Fallback is light neutral, never purple/dark.
 */
export function getIndicatorChipStyle(indicator) {
  const norm = normalizeIndicator(indicator);
  if (INDICATOR_CHIP_CONFIG[norm]) {
    return INDICATOR_CHIP_CONFIG[norm];
  }
  return {
    indicator: norm || 'UNKNOWN',
    label: norm || 'Chỉ tiêu',
    shortLabel: norm || 'N/A',
    family: 'neutral',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-300',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
    accentClass: 'border-l-gray-400',
  };
}

/**
 * Validates the number of selected spots against the window (at least 1; the upper bound is only a sanity cap).
 * Returns validation outcome, code and human-readable Vietnamese message.
 */
export function validateSpotCount(count) {
  const n = typeof count === 'number' && !Number.isNaN(count) ? Math.floor(count) : Number(count) || 0;
  if (n < MIN_SELECTED_SPOTS) {
    return {
      valid: false,
      count: n,
      code: 'OUT_OF_RANGE_LOW',
      message: 'Cần chọn ít nhất 1 điểm đen.',
    };
  }
  if (n > MAX_SELECTED_SPOTS) {
    return {
      valid: false,
      count: n,
      code: 'OUT_OF_RANGE_HIGH',
      message: `Chỉ được chọn tối đa ${MAX_SELECTED_SPOTS} điểm đen (hiện tại: ${n})`,
    };
  }
  return {
    valid: true,
    count: n,
    code: null,
    message: `Đã chọn ${n} điểm đen`,
  };
}

/**
 * Validates the combined candidateIds and manual items arrays.
 */
export function validateSpotsSelection({ candidateIds = [], manual = [] } = {}) {
  const cCount = Array.isArray(candidateIds) ? candidateIds.length : 0;
  const mCount = Array.isArray(manual) ? manual.length : 0;
  return validateSpotCount(cCount + mCount);
}

/**
 * Quick boolean predicate: can the journal day spots be saved?
 */
export function canSaveSpots(count) {
  const n = typeof count === 'number' ? count : Number(count) || 0;
  return n >= MIN_SELECTED_SPOTS && n <= MAX_SELECTED_SPOTS;
}

/**
 * Returns counter badge styling based on whether the current count is in range.
 */
export function getCounterBadgeStyle(count) {
  const n = typeof count === 'number' ? count : Number(count) || 0;
  if (n >= MIN_SELECTED_SPOTS && n <= MAX_SELECTED_SPOTS) {
    return {
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      label: `Đã chọn ${n} điểm đen`,
      inRange: true,
    };
  }
  if (n > MAX_SELECTED_SPOTS) {
    return {
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      label: `Đã chọn ${n} (vượt mức ${MAX_SELECTED_SPOTS})`,
      inRange: false,
    };
  }
  return {
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    label: 'Chưa chọn điểm đen nào',
    inRange: false,
  };
}

/**
 * Formats a delta rate percentage into human-readable Vietnamese text.
 * e.g. -11.2 -> 'giảm 11.2%', 5.4 -> 'tăng 5.4%', 0 -> 'không đổi (0.0%)'.
 */
export function formatDeltaRate(delta) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) {
    return null;
  }
  const n = Number(delta);
  if (n === 0) return 'không đổi (0.0%)';
  if (n > 0) return `tăng ${n.toFixed(1)}%`;
  return `giảm ${Math.abs(n).toFixed(1)}%`;
}

const RATE_TARGETS = Object.freeze({ 'F1.1': 95, 'F1.2': 95, 'F1.3': 90, 'F4.1': 90 });

/**
 * The few facts that make a candidate a black spot, as short chips the manager can read at a glance
 * (tone: bad = red, warn = amber, good = green, neutral = grey). The full headline stays available behind "Xem nhận định".
 */
export function getSpotReasons(indicator, metrics) {
  const m = metrics || {};
  const norm = normalizeIndicator(indicator);
  const reasons = [];
  const num = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  const fmt = (v) => Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (norm === 'HANGTON') {
    if (num(m.stockGe5) !== null) reasons.push({ tone: 'bad', text: `${fmt(m.stockGe5)} bưu gửi tồn ≥5 ngày` });
    if (num(m.stockGe14)) reasons.push({ tone: 'bad', text: `${fmt(m.stockGe14)} bưu gửi tồn ≥14 ngày` });
    else if (num(m.stockGe7)) reasons.push({ tone: 'warn', text: `${fmt(m.stockGe7)} bưu gửi tồn ≥7 ngày` });
    if (num(m.cod)) reasons.push({ tone: 'warn', text: `COD ${fmt(m.cod)} đ` });
    return reasons;
  }
  const target = RATE_TARGETS[norm] ?? 90;
  const rate = num(m.rate);
  if (rate !== null) reasons.push({ tone: 'bad', text: `${fmt(rate)}% — thấp hơn chỉ tiêu ${fmt(target - rate)} điểm` });
  const delta = num(m.delta);
  if (delta === null) reasons.push({ tone: 'neutral', text: 'Chưa có số liệu tuần trước' });
  else if (delta < 0) reasons.push({ tone: 'bad', text: `Giảm ${fmt(Math.abs(delta))} điểm so tuần trước` });
  else if (delta > 0) reasons.push({ tone: 'good', text: `Tăng ${fmt(delta)} điểm so tuần trước` });
  else reasons.push({ tone: 'neutral', text: 'Không đổi so tuần trước' });
  if (num(m.fail) !== null) reasons.push({ tone: 'bad', text: `${fmt(m.fail)} BG không đạt` });
  const mtd = num(m.mtdRate);
  if (mtd !== null && mtd < target) reasons.push({ tone: 'warn', text: `Lũy kế tháng ${fmt(mtd)}% chưa đạt` });
  return reasons;
}

export const MAX_ACTIONS_PER_SPOT = 12;
export const DEFAULT_DUE_TEXT = 'Trong ngày';

/**
 * Builds standard 6-rõ action rows from the PO template models (Manifest section 2).
 * F1.x / F4.1: (1) rà soát nguyên nhân -> (2) tìm giải pháp áp dụng từ N+1 -> (3) theo dõi tỷ lệ hằng ngày.
 * HANGTON: (1) rà soát -> (2) xử lý dứt điểm về 0 -> (3) theo dõi.
 * Mặc định "Khi nào xong" = "Trong ngày".
 */
export function buildDefaultActions(indicator, officeCode = '', officeName = '', title = '') {
  const norm = normalizeIndicator(indicator);
  const location = officeName || title || (officeCode ? `Bưu cục ${officeCode}` : 'Bưu cục');

  if (norm === 'HANGTON') {
    return [
      {
        id: `tpl_ht_1_${Date.now()}`,
        seq: 1,
        whoText: 'Giám đốc BCVH',
        what: 'Rà soát toàn bộ bưu gửi tồn đọng tại đơn vị (tồn ≥5 ngày, ≥7 ngày, COD)',
        where: location,
        due: DEFAULT_DUE_TEXT,
        how: 'Kiểm kê kho bưu gửi thực tế đối soát với dữ liệu QIS và phỏng vấn bộ phận liên quan',
        expectedResult: 'Báo cáo chính xác nguyên nhân từng bưu gửi tồn đọng',
        status: 'DRAFT',
        assigneeUserIds: [],
      },
      {
        id: `tpl_ht_2_${Date.now()}`,
        seq: 2,
        whoText: 'Giám đốc BCVH + Bưu tá phát',
        what: 'Xử lý dứt điểm các bưu gửi tồn đọng về 0',
        where: location,
        due: DEFAULT_DUE_TEXT,
        how: 'Tổ chức phát lại, liên hệ trực tiếp người nhận/người gửi hoặc thực hiện hoàn bưu gửi',
        expectedResult: 'Giải tỏa toàn bộ bưu gửi tồn đọng quá hạn',
        status: 'DRAFT',
        assigneeUserIds: [],
      },
      {
        id: `tpl_ht_3_${Date.now()}`,
        seq: 3,
        whoText: 'Chuyên quản TTVH',
        what: 'Theo dõi tiến độ giải tỏa tồn đọng hằng ngày và báo cáo lãnh đạo',
        where: 'TTVH',
        due: 'Hằng ngày',
        how: 'Giám sát snapshot Hàng tồn vào lúc 07:30 mỗi sáng',
        expectedResult: 'Không phát sinh tồn đọng mới quá hạn',
        status: 'DRAFT',
        assigneeUserIds: [],
      },
    ];
  }

  // F1.1, F1.2, F1.3, F4.1 pattern
  return [
    {
      id: `tpl_f_1_${Date.now()}`,
      seq: 1,
      whoText: 'Giám đốc BCVH',
      what: 'Rà soát và báo cáo nguyên nhân các bưu gửi không đạt chất lượng',
      where: location,
      due: DEFAULT_DUE_TEXT,
      how: 'Kiểm tra chi tiết dữ liệu bưu gửi trên hệ thống QIS và đối chiếu lịch trình thực tế',
      expectedResult: 'Báo cáo phân loại rõ nguyên nhân chủ quan và khách quan',
      status: 'DRAFT',
      assigneeUserIds: [],
    },
    {
      id: `tpl_f_2_${Date.now()}`,
      seq: 2,
      whoText: 'Chuyên quản TTVH + Giám đốc BCVH',
      what: 'Tìm giải pháp khắc phục và thống nhất phương án xử lý áp dụng từ N+1',
      where: 'TTVH / BCVH',
      due: DEFAULT_DUE_TEXT,
      how: 'Rà soát quy trình khai thác, kỷ luật giờ chốt ca và điều chỉnh hành trình tuyến phát',
      expectedResult: 'Biện pháp áp dụng từ N+1 giúp phục hồi chỉ tiêu đạt ngưỡng',
      status: 'DRAFT',
      assigneeUserIds: [],
    },
    {
      id: `tpl_f_3_${Date.now()}`,
      seq: 3,
      whoText: 'Chuyên quản TTVH',
      what: 'Theo dõi tỷ lệ hằng ngày và báo cáo lãnh đạo TTVH',
      where: 'TTVH',
      due: 'Hằng ngày',
      how: 'Giám sát Dashboard chất lượng vào lúc 07:30 mỗi sáng',
      expectedResult: `Chỉ tiêu đạt ngưỡng kế hoạch (${norm === 'F1.1' ? '≥ 95%' : '≥ 90%'})`,
      status: 'DRAFT',
      assigneeUserIds: [],
    },
  ];
}

/**
 * Validates completeness of a spot before assignment.
 * Every row must have non-empty "Làm gì" (what) and at least one assignee (assigneeUserIds or whoText).
 */
export function validateSpotCompleteness(spot) {
  const title = spot?.title || 'Điểm đen';

  if (!spot || !Array.isArray(spot.actions) || spot.actions.length === 0) {
    return {
      valid: false,
      code: 'SPOT_INCOMPLETE',
      spotId: spot?.id,
      spotTitle: title,
      rowSeq: null,
      message: `Điểm đen "${title}" chưa có dòng 6-rõ nào. Vui lòng thêm hành động trước khi chốt.`,
    };
  }

  for (let i = 0; i < spot.actions.length; i++) {
    const act = spot.actions[i];
    const seq = act.seq || i + 1;

    if (!act.what || !act.what.trim()) {
      return {
        valid: false,
        code: 'SPOT_INCOMPLETE',
        spotId: spot.id,
        spotTitle: title,
        rowSeq: seq,
        message: `Điểm đen "${title}": dòng số ${seq} chưa có nội dung "Làm gì".`,
      };
    }

    const hasAssignee = Array.isArray(act.assigneeUserIds) && act.assigneeUserIds.length > 0;

    if (!hasAssignee) {
      return {
        valid: false,
        code: 'SPOT_INCOMPLETE',
        spotId: spot.id,
        spotTitle: title,
        rowSeq: seq,
        message: `Điểm đen "${title}": dòng số ${seq} chưa có người thực hiện (Ai).`,
      };
    }
  }

  return {
    valid: true,
    code: null,
    spotId: spot.id,
    spotTitle: title,
    rowSeq: null,
    message: `Điểm đen "${title}" đã hoàn thiện đủ điều kiện chốt.`,
  };
}

/**
 * Boolean predicate: is the spot complete and ready for assignment?
 */
export function canAssignSpot(spot) {
  return validateSpotCompleteness(spot).valid;
}

/**
 * Validates an array of spots for batch assignment (Chốt và giao việc).
 */
export function validateSpotsForAssign(spots = [], selectedSpotIds = []) {
  if (!Array.isArray(spots) || spots.length === 0) {
    return {
      valid: false,
      code: 'SPOT_INCOMPLETE',
      message: 'Không có điểm đen nào để chốt và giao việc.',
    };
  }

  const targetSpots =
    selectedSpotIds.length > 0
      ? spots.filter((s) => selectedSpotIds.includes(s.id))
      : spots;

  if (targetSpots.length === 0) {
    return {
      valid: false,
      code: 'SPOT_INCOMPLETE',
      message: 'Vui lòng chọn ít nhất một điểm đen để chốt và giao việc.',
    };
  }

  for (const spot of targetSpots) {
    const res = validateSpotCompleteness(spot);
    if (!res.valid) {
      return res;
    }
  }

  return {
    valid: true,
    code: null,
    message: `Tất cả ${targetSpots.length} điểm đen đều hợp lệ để chốt và giao việc.`,
  };
}

/**
 * Groups an array of assignee tasks by their journal day.
 * Returns an array of { day, tasks } sorted by day descending (newest first).
 */
export function groupTasksByDay(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const groups = new Map();

  for (const task of tasks) {
    const day = task.day || 'Chưa xác định';
    if (!groups.has(day)) {
      groups.set(day, []);
    }
    groups.get(day).push(task);
  }

  // Sort days descending
  return Array.from(groups.entries())
    .sort(([dayA], [dayB]) => String(dayB).localeCompare(String(dayA)))
    .map(([day, dayTasks]) => ({
      day,
      tasks: dayTasks,
    }));
}

/**
 * Checks whether an assignee action row is locked for editing.
 * A row is locked when its status is DONE.
 */
export function isRowLocked(status) {
  return String(status || '').trim().toUpperCase() === 'DONE';
}

/**
 * Validates assignee report submission.
 * When status is 'REPORTED', reportText is required.
 */
export function validateReportInput({ status = 'REPORTED', reportText = '' } = {}) {
  const normStatus = String(status || '').trim().toUpperCase();
  if (normStatus === 'REPORTED') {
    if (!reportText || !reportText.trim()) {
      return {
        valid: false,
        message: 'Báo cáo bắt buộc phải có nội dung chi tiết trước khi gửi.',
      };
    }
  }
  return {
    valid: true,
    message: '',
  };
}

/**
 * Builds standard output filename for PL06 export / print per Manifest Sections 2 & 4.
 * Format: "PL06 - Nhat ky dieu hanh dd.mm.yyyy - <chỉ tiêu> <đơn vị>"
 */
export function generatePl06FileName(spot, extension = '') {
  if (!spot) return 'PL06 - Nhat ky dieu hanh';
  const ascii = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  const safe = (value) => ascii(value).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

  const day = spot.day || '';
  let dmyStr = 'dd.mm.yyyy';
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    dmyStr = `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
  }

  const rawInd = spot.indicator || '';
  const ind = safe(rawInd === 'HANGTON' ? 'Hang ton' : rawInd);
  const office = safe(spot.officeName || spot.title?.replace(/^[^-]+-\s*/, '') || '');

  const base = `PL06 - Nhat ky dieu hanh ${dmyStr} - ${ind} ${office}`.trim();
  if (extension) {
    const cleanExt = extension.replace(/^\./, '').toLowerCase();
    return `${base}.${cleanExt}`;
  }
  return base;
}

/**
 * Builds structured document data model for PL06 Print Preview and Export.
 * Accurately mirrors pl06Document.js schema and PO sample structure.
 */
export function buildPl06PrintModel(spot, signer = { name: '', position: 'Giám đốc TTVH' }) {
  if (!spot) return null;
  const day = spot.day || '';
  const dmyStr = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`
    : day;

  // Determine shift (0: Sáng, 1: Chiều, 2: Đêm) tính theo giờ UTC+7 (Asia/Ho_Chi_Minh)
  let shift = 0;
  if (spot.finalizedAt) {
    const vnDate = new Date(spot.finalizedAt);
    const hourStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(vnDate);
    const hour = parseInt(hourStr, 10) || 0;
    shift = hour < 12 ? 0 : hour < 18 ? 1 : 2;
  }

  const closing = spot.closing || null;
  const actions = Array.isArray(spot.actions) ? spot.actions : [];
  const signerName = spot.finalizedByName || spot.signedBy || spot.finalizedBy || spot.closing?.signedBy || signer?.name || '';
  const signerPosition = signer?.position || 'Giám đốc TTVH';

  return {
    fileBase: generatePl06FileName(spot),
    title: 'NHẬT KÝ ĐIỀU HÀNH HÀNG NGÀY',
    subtitle: 'Giám đốc Trung tâm Vận hành – Bưu điện thành phố Huế',
    headerRight: 'GĐ TTVH',
    footerLeft: 'Tài liệu nội bộ',
    dateText: dmyStr,
    signerName,
    signerPosition,
    shift, // 0: Sáng, 1: Chiều, 2: Đêm
    channel: spot.source === 'MANUAL' || !spot.channel ? null : spot.channel,
    detectedAt: spot.source === 'MANUAL' || !spot.detectedAt ? null : spot.detectedAt,
    headline: spot.headline || spot.title || '',
    spotTitle: spot.title || '',
    indicator: spot.indicator || '',
    actions: actions.map((act, index) => ({
      stt: act.seq || index + 1,
      who: act.whoText || '',
      what: act.what || '',
      where: act.where || '',
      due: act.due || 'Trong ngày',
      how: act.how || '',
      expectedResult: act.expectedResult || '',
      status: act.status || 'DRAFT',
      reportText: act.reportText || '',
      reportCause: act.reportCause || '',
    })),
    closing: closing
      ? {
          resolved: closing.resolved ?? null,
          recovered: closing.recovered ?? null,
          handlingTimeText: closing.handlingTimeText || '',
          lesson: closing.lesson || '',
          processUpdate: closing.processUpdate || '',
          doneTime: closing.doneTime || '',
        }
      : null,
  };
}


/**
 * Validates closing end-of-day form inputs.
 */
export function validateClosingInput(closingData = {}) {
  const { resolved, recovered } = closingData;
  if (resolved === undefined || resolved === null) {
    return {
      valid: false,
      message: 'Vui lòng xác nhận tiến độ giải quyết điểm đen (Đã giải quyết xong hay chưa).',
    };
  }
  if (recovered === undefined || recovered === null) {
    return {
      valid: false,
      message: 'Vui lòng xác nhận khả năng phục hồi chỉ tiêu.',
    };
  }
  return {
    valid: true,
    message: '',
  };
}




