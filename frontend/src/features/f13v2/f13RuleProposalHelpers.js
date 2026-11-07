/**
 * F13-RULE-PROPOSAL-01: Helper functions, constants, formatting and validation
 * for the F1.3 "Đề xuất quy tắc" (Rule Proposals) screen.
 */

export const STATUS_TABS = Object.freeze([
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt - chờ chuyển thành quy tắc' },
  { key: 'REJECTED', label: 'Không duyệt' },
  { key: 'APPLIED', label: 'Đã áp dụng' },
]);

export const STATUS_LABELS = Object.freeze({
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt - chờ chuyển thành quy tắc',
  REJECTED: 'Không duyệt',
  APPLIED: 'Đã áp dụng',
});

export const DECISION_LABELS = Object.freeze({
  APPROVE: 'Duyệt',
  REJECT: 'Không duyệt',
  APPLIED: 'Đã áp dụng',
});

export const CAUSE_LABELS = Object.freeze({
  KHONG_TRON_LO: 'Không trọn lô',
  KHAI_THAC: 'Khai thác (đến BCVH quá hạn)',
  VAN_CHUYEN: 'Vận chuyển (đến BCVH quá hạn)',
  KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET: 'Khai thác - Vận chuyển (chưa phân biệt)',
  GIAO_BUU_TA_QUA_GIO: 'Chậm giao bưu tá',
  PHAT_MUON: 'Phát chậm sau khi giao',
  PHAT_KHONG_CHI_TIET: 'Phát (chưa rõ chi tiết)',
  CHO_CHUYEN_QUAN: 'Chờ Chuyên quản phân tích',
  CHUA_DU_CAN_CU: 'Chưa đủ căn cứ',
  KHONG_PHAN_TICH: 'Không phân tích',
  PHAT: 'Khâu phát',
  KHAC: 'Khác',
});

export const REASON_LABELS = Object.freeze({
  TCT_DAI_HON_MOC: 'Giờ TCT dài hơn mốc thực tế',
  CHAM_DEN_HAY_CHAM_GIAO: 'Không có xác nhận đến BCVH',
  MOC_A_KHONG_HOP_LE: 'Mốc đến BCVH sai thứ tự',
  THIEU_MOC_G: 'Thiếu mốc giao bưu tá',
  MOC_G_KHONG_HOP_LE: 'Mốc giao bưu tá sai thứ tự',
  KHOANG_CAT_CHI_TIEU: 'Chưa đủ chắc chắn quá hạn hay còn hạn',
  KET_QUA_KHONG_KHOP_CHI_TIEU: 'Kết quả TCT không khớp chỉ tiêu',
  THIEU_PTC: 'Chưa có giờ phát',
});

export const PHAT_DETAIL_LABELS = Object.freeze({
  CHAM_GIAO_BUU_TA: 'Chậm giao bưu tá',
  PHAT_CHAM_SAU_GIAO: 'Phát chậm sau khi giao',
  KHONG_CHI_TIET: 'Không có chi tiết',
});

export function formatCause(code) {
  if (!code || code === '~') return '—';
  return CAUSE_LABELS[code] || String(code);
}

export function formatReason(code) {
  if (!code || code === '~') return '—';
  return REASON_LABELS[code] || String(code);
}

export function formatPhatDetail(detail) {
  if (!detail || detail === '~') return '—';
  return PHAT_DETAIL_LABELS[detail] || String(detail);
}

/**
 * Formats system conclusion into human-readable Vietnamese.
 * System conclusion: { status, cause_or_reason, detail }
 */
export function formatSystemConclusion(system) {
  if (!system) return 'Chưa có kết luận';
  const { status, cause_or_reason: what, detail } = system;

  if (status === 'CHO_CHUYEN_QUAN') {
    const reasonText = what && what !== '~' ? formatReason(what) : 'Chờ Chuyên quản';
    const detailText = detail && detail !== '~' && detail !== 'KHONG_CHI_TIET' ? formatPhatDetail(detail) : '';
    const extra = detailText && !reasonText.toLowerCase().includes(detailText.toLowerCase()) ? ` (${detailText})` : '';
    return `Chờ CQ: ${reasonText}${extra}`;
  }

  if (status === 'CAUSE') {
    const causeText = what && what !== '~' ? formatCause(what) : 'Có nguyên nhân';
    const detailText = detail && detail !== '~' && detail !== 'KHONG_CHI_TIET' && detail !== what
      ? formatPhatDetail(detail)
      : '';
    const extra = detailText && !causeText.toLowerCase().includes(detailText.toLowerCase()) ? ` - ${detailText}` : '';
    return `${causeText}${extra}`;
  }

  if (status === 'CHUA_DU_CAN_CU') {
    return 'Chưa đủ căn cứ';
  }

  if (status === 'KHONG_PHAN_TICH') {
    return 'Không phân tích';
  }

  if (what && what !== '~') {
    return formatCause(what);
  }

  if (status && status !== '~') {
    return status;
  }

  return 'Chưa có kết luận';
}

/**
 * Formats analyst chosen cause into human-readable Vietnamese.
 * Chosen: { cause, phat_detail }
 */
export function formatChosenCause(chosen) {
  if (!chosen) return '—';
  const { cause, phat_detail: detail } = chosen;
  if (!cause || cause === '~') return '—';

  const causeText = formatCause(cause);
  const detailText = detail && detail !== '~' && detail !== 'KHONG_CHI_TIET' && detail !== cause
    ? formatPhatDetail(detail)
    : '';
  const extra = detailText && !causeText.toLowerCase().includes(detailText.toLowerCase()) ? ` - ${detailText}` : '';
  return `${causeText}${extra}`;
}

export function formatProposalStatus(status) {
  return STATUS_LABELS[status] || status || '—';
}

export function proposalStatusBadgeClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'APPROVED':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border-red-300';
    case 'APPLIED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

export function decisionBadgeClass(decision) {
  switch (decision) {
    case 'APPROVE':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'REJECT':
      return 'bg-red-50 text-red-700 border-red-300';
    case 'APPLIED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Format "còn giữ kết luận hệ thống x / n"
 */
export function formatStillRatio(still, total) {
  const s = Number(still) || 0;
  const n = Number(total) || 0;
  return `còn giữ kết luận hệ thống ${s} / ${n}`;
}

export function formatDateSpan(firstDate, lastDate) {
  if (!firstDate && !lastDate) return '—';
  if (firstDate === lastDate) return String(firstDate || lastDate);
  if (firstDate && lastDate) return `${firstDate} → ${lastDate}`;
  return String(firstDate || lastDate);
}

/**
 * Validates input for making a decision.
 * PO Decision Rules:
 * - APPROVE / REJECT: note mandatory, note <= 1000 chars.
 * - APPLIED: ticket_id mandatory, current status must be APPROVED.
 */
export function validateDecisionInput({ decision, note = '', ticketId = '', currentStatus = 'PENDING' }) {
  const dec = String(decision || '').toUpperCase();
  if (!['APPROVE', 'REJECT', 'APPLIED'].includes(dec)) {
    return { valid: false, error: 'Hành động không hợp lệ. Phải là Duyệt, Không duyệt hoặc Đã áp dụng.' };
  }

  const cleanNote = String(note || '').trim();
  if (cleanNote.length > 1000) {
    return { valid: false, error: 'Ghi chú tối đa 1000 ký tự.' };
  }

  if (dec !== 'APPLIED' && !cleanNote) {
    return { valid: false, error: 'Duyệt hoặc không duyệt thì phải ghi chú lý do.' };
  }

  if (dec === 'APPLIED') {
    const cleanTicket = String(ticketId || '').trim();
    if (!cleanTicket) {
      return { valid: false, error: 'Đánh dấu đã áp dụng thì phải có mã phiếu (ticket id).' };
    }
    if (currentStatus !== 'APPROVED') {
      return { valid: false, error: 'Chỉ đánh dấu đã áp dụng cho đề xuất đang ở trạng thái đã duyệt.' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Sorts rule proposal rows by specified column and direction.
 */
export function sortRuleProposals(items, field, direction = 'desc') {
  if (!Array.isArray(items) || items.length === 0 || !field) {
    return Array.isArray(items) ? [...items] : [];
  }

  const factor = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    let valA;
    let valB;

    switch (field) {
      case 'pair': {
        const textA = `${formatSystemConclusion(a.system)} -> ${formatChosenCause(a.chosen)}`;
        const textB = `${formatSystemConclusion(b.system)} -> ${formatChosenCause(b.chosen)}`;
        return textA.localeCompare(textB, 'vi') * factor;
      }
      case 'parcels':
        valA = Number(a.parcels) || 0;
        valB = Number(b.parcels) || 0;
        return (valA - valB) * factor;
      case 'still_system_conclusion':
        valA = Number(a.still_system_conclusion) || 0;
        valB = Number(b.still_system_conclusion) || 0;
        return (valA - valB) * factor;
      case 'bcvh':
        valA = Number(a.bcvh) || 0;
        valB = Number(b.bcvh) || 0;
        return (valA - valB) * factor;
      case 'analysts':
        valA = Number(a.analysts) || 0;
        valB = Number(b.analysts) || 0;
        return (valA - valB) * factor;
      case 'last_date':
        valA = String(a.last_date || '');
        valB = String(b.last_date || '');
        return valA.localeCompare(valB) * factor;
      case 'first_date':
        valA = String(a.first_date || '');
        valB = String(b.first_date || '');
        return valA.localeCompare(valB) * factor;
      case 'status':
        valA = String(a.status || '');
        valB = String(b.status || '');
        return valA.localeCompare(valB) * factor;
      default:
        return 0;
    }
  });
}
