export const UNAVAILABLE_TEXT = 'Chưa có dữ liệu';

const PRIORITY_ORDER = {
  P1: 1,
  P2: 2,
  P3: 3,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function valueOrUnavailable(value) {
  if (value === null || value === undefined || value === '') return UNAVAILABLE_TEXT;
  if (typeof value === 'object') return UNAVAILABLE_TEXT;
  return value;
}

function primitiveOrUnavailable(value) {
  if (value === null || value === undefined || value === '') return UNAVAILABLE_TEXT;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  return UNAVAILABLE_TEXT;
}

export function formatNationalRank(value) {
  if (value === null || value === undefined || value === '') return UNAVAILABLE_TEXT;
  if (['string', 'number'].includes(typeof value)) return value;
  if (typeof value !== 'object') return UNAVAILABLE_TEXT;

  if (value.available === false || value.status === 'missing' || value.status === 'incomplete') {
    return UNAVAILABLE_TEXT;
  }

  const rank = value.rank;
  const total = value.total;
  if (rank !== null && rank !== undefined && total !== null && total !== undefined) {
    return `${rank}/${total}`;
  }

  return UNAVAILABLE_TEXT;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildRecommendationId(item, index) {
  const sourceId = normalizeText(item?.id);
  if (sourceId) return `rule:${sourceId}`;
  const bcvh = normalizeText(item?.ma_bcvh || item?.ten_bcvh || 'aggregate');
  const category = normalizeText(item?.category || 'unknown');
  return `rule:${bcvh}:${category}:${index}`;
}

function buildDedupeKey(item, fallbackId) {
  const code = normalizeText(item?.ma_bcvh);
  const category = normalizeText(item?.category);
  if (code && category) return `bcvh:${code}:category:${category}`;
  const sourceId = normalizeText(item?.id);
  if (sourceId) return `id:${sourceId}`;
  return fallbackId;
}

export function buildActionCenterMeta({
  fromDate,
  toDate,
  maBcvh = 'all',
  bcvhLabel,
} = {}) {
  return {
    from_date: fromDate || null,
    to_date: toDate || null,
    ma_bcvh: maBcvh || 'all',
    bcvh_label: bcvhLabel || (maBcvh === 'all' ? 'Toàn mạng' : UNAVAILABLE_TEXT),
    source_period_label: fromDate && toDate ? `${fromDate} đến ${toDate}` : UNAVAILABLE_TEXT,
    generated_at: null,
  };
}

export function normalizeRecommendationItem(item = {}, index = 0) {
  const id = buildRecommendationId(item, index);
  const condition = valueOrUnavailable(item.condition);
  const impact = valueOrUnavailable(item.impact);
  const hasBcvhCode = Boolean(normalizeText(item.ma_bcvh));

  return {
    id,
    dedupe_key: buildDedupeKey(item, id),
    priority: valueOrUnavailable(item.priority),
    level: valueOrUnavailable(item.level),
    issue: valueOrUnavailable([item.category, item.condition].filter(Boolean).join(' - ')),
    unit: {
      ma_bcvh: hasBcvhCode ? item.ma_bcvh : null,
      ten_bcvh: valueOrUnavailable(item.ten_bcvh),
    },
    evidence: {
      primary: condition,
      impact,
      failed_bg: item.failed_bg ?? null,
      source_label: 'Khuyến nghị điều hành',
    },
    confirmed_cause: UNAVAILABLE_TEXT,
    recommended_action: valueOrUnavailable(item.action),
    source: 'RULE_RECOMMENDATION',
    confidence: UNAVAILABLE_TEXT,
    owner: UNAVAILABLE_TEXT,
    status: UNAVAILABLE_TEXT,
    follow_up: {
      label: 'Chi tiết',
      href: hasBcvhCode ? `/f13/ranking/route?bcvh_id=${encodeURIComponent(item.ma_bcvh)}` : '/f13/ranking/bcvh',
    },
    message_draft: null,
  };
}

export function mapUnifiedActionCenter({
  recommendations = [],
  kpiData = null,
  fromDate,
  toDate,
  maBcvh = 'all',
  bcvhLabel,
  errors = {},
} = {}) {
  const seen = new Set();
  const items = [];

  for (const [index, recommendation] of (Array.isArray(recommendations) ? recommendations : []).entries()) {
    const item = normalizeRecommendationItem(recommendation, index);
    if (seen.has(item.dedupe_key)) continue;
    seen.add(item.dedupe_key);
    items.push(item);
  }

  items.sort((a, b) => {
    const aOrder = PRIORITY_ORDER[String(a.priority).toUpperCase()] || 99;
    const bOrder = PRIORITY_ORDER[String(b.priority).toUpperCase()] || 99;
    return aOrder - bOrder;
  });

  return {
    meta: buildActionCenterMeta({ fromDate, toDate, maBcvh, bcvhLabel }),
    items,
    kpi_context: {
      total_volume: primitiveOrUnavailable(kpiData?.total_bg),
      pass_rate: primitiveOrUnavailable(kpiData?.passed_rate),
      failed_rate: primitiveOrUnavailable(kpiData?.failed_rate),
      national_rank: formatNationalRank(kpiData?.national_rank ?? kpiData?.rank),
    },
    states: {
      recommendations: errors.recommendations ? 'error' : (items.length > 0 ? 'success' : 'empty'),
      kpi_context: errors.kpi_context ? 'error' : (kpiData ? 'success' : 'empty'),
    },
    errors,
  };
}
