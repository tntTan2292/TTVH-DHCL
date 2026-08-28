const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');
const { classifyRoute } = require('../config/f13RouteClassificationCatalog');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftIsoDate(dateString, days) {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function formatBusinessIsoDate(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
}

function monthKeysThrough(anchorDate) {
    if (!anchorDate) return [];
    const year = anchorDate.slice(0, 4);
    const lastMonth = Number(anchorDate.slice(5, 7));
    return Array.from({ length: lastMonth }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

function dateKeysThrough(anchorDate) {
    if (!anchorDate) return [];
    const start = `${anchorDate.slice(0, 7)}-01`;
    const dates = [];
    for (let current = start; current <= anchorDate; current = shiftIsoDate(current, 1)) dates.push(current);
    return dates;
}

function nullableRate(passed, volume) {
    const denominator = Number(volume || 0);
    if (denominator <= 0) return null;
    return Number(((Number(passed || 0) / denominator) * 100).toFixed(4));
}

function rankMtd(rows) {
    const ranked = rows
        .filter((row) => row.rate !== null)
        .sort((a, b) => (b.rate - a.rate) || (b.volume - a.volume));
    let previousKey = null;
    let previousRank = null;
    ranked.forEach((row, index) => {
        const key = `${row.rate}|${row.volume}`;
        if (key !== previousKey) previousRank = index + 1;
        row.rank = previousRank;
        previousKey = key;
    });
    return rows;
}

class BcvhOverviewService {
    constructor({ repository, now = () => new Date() } = {}) {
        if (!repository) throw new Error('BcvhOverviewService requires a repository');
        this.repository = repository;
        this.now = now;
        this.units = CANONICAL_BCVH_UNITS.map((unit) => ({ ...unit }));
        this.codes = this.units.map((unit) => unit.ma_bcvh);
        this.unitByCode = new Map(this.units.map((unit) => [unit.ma_bcvh, unit]));
    }

    _yesterday() {
        const today = formatBusinessIsoDate(this.now());
        return shiftIsoDate(today, -1);
    }

    _resolveCeiling(requestedAnchor) {
        if (requestedAnchor !== undefined && requestedAnchor !== null && !ISO_DATE_RE.test(requestedAnchor)) {
            const error = new Error('anchor_date must be a valid ISO date in YYYY-MM-DD format');
            error.code = 'INVALID_DATE';
            throw error;
        }
        const yesterday = this._yesterday();
        return requestedAnchor && requestedAnchor < yesterday ? requestedAnchor : yesterday;
    }

    _anchorFrom(rowsByKind) {
        const anchors = rowsByKind.flatMap((rows) => rows.map((row) => row.anchor_date).filter(Boolean));
        if (!anchors.length) return null;
        const first = anchors[0];
        if (anchors.some((anchor) => anchor !== first)) {
            const error = new Error('BCVH overview aggregate queries resolved inconsistent anchor dates');
            error.code = 'INCONSISTENT_ANCHOR_DATE';
            throw error;
        }
        return first;
    }

    async getOverview(requestedAnchor) {
        const anchorCeiling = this._resolveCeiling(requestedAnchor);
        const [monthlyRows, dailyRows, mtdRows, routeRows] = await Promise.all([
            this.repository.getBcvhOverviewMonthly(anchorCeiling, this.codes),
            this.repository.getBcvhOverviewDaily(anchorCeiling, this.codes),
            this.repository.getBcvhOverviewMtd(anchorCeiling, this.codes),
            this.repository.getBcvhOverviewRoutes(anchorCeiling, this.codes),
        ]);
        const anchorDate = this._anchorFrom([monthlyRows, dailyRows, mtdRows, routeRows]);
        if (!anchorDate) {
            return this._emptyOverview(anchorCeiling);
        }

        const monthlyMap = new Map(monthlyRows.map((row) => [`${row.month}|${row.ma_bcvh}`, row]));
        const monthlyDays = new Map(monthlyRows.map((row) => [row.month, Number(row.days_in_period || 0)]));
        const monthly = monthKeysThrough(anchorDate).flatMap((month) => this.units.map((unit) => {
            const row = monthlyMap.get(`${month}|${unit.ma_bcvh}`);
            const volume = Number(row?.volume || 0);
            const passed = Number(row?.passed || 0);
            return {
                month,
                label: `T${Number(month.slice(5, 7))}`,
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                volume,
                passed,
                failed: Number(row?.failed || 0),
                rate: nullableRate(passed, volume),
                days_with_data: Number(row?.days_with_data || 0),
                days_in_period: monthlyDays.get(month) || 0,
            };
        }));

        const dailyMap = new Map(dailyRows.map((row) => [`${row.date}|${row.ma_bcvh}`, row]));
        const daily = dateKeysThrough(anchorDate).flatMap((date) => this.units.map((unit) => {
            const row = dailyMap.get(`${date}|${unit.ma_bcvh}`);
            const volume = Number(row?.volume || 0);
            const passed = Number(row?.passed || 0);
            return {
                date,
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                volume,
                passed,
                failed: Number(row?.failed || 0),
                rate: nullableRate(passed, volume),
            };
        }));

        const mtdMap = new Map(mtdRows.map((row) => [row.ma_bcvh, row]));
        const mtd = rankMtd(this.units.map((unit) => {
            const row = mtdMap.get(unit.ma_bcvh);
            const volume = Number(row?.volume || 0);
            const passed = Number(row?.passed || 0);
            const previousVolume = Number(row?.previous_volume || 0);
            const previousPassed = Number(row?.previous_passed || 0);
            return {
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                volume,
                passed,
                failed: Number(row?.failed || 0),
                rate: nullableRate(passed, volume),
                rank: null,
                previous_month_to_date: {
                    volume: previousVolume,
                    passed: previousPassed,
                    rate: nullableRate(previousPassed, previousVolume),
                },
            };
        }));

        const routeMap = {};
        routeRows.forEach((row) => {
            const code = String(row.ma_bcvh || '');
            const routeCode = String(row.ma_tuyen || '').trim();
            const classification = classifyRoute(routeCode);
            if (!this.unitByCode.has(code) || classification.route_scope !== 'hue' || !classification.is_postman_delivery_route) return;
            if (!routeMap[code]) routeMap[code] = {};
            routeMap[code][routeCode] = {
                total_bg: Number(row.total_bg || 0),
                dat_kpi_2026: Number(row.dat_kpi_2026 || 0),
            };
        });
        const routes = this.units.map((unit) => {
            const routeList = Object.values(routeMap[unit.ma_bcvh] || {});
            const counts = { green: 0, pink: 0, yellow: 0, red: 0 };
            routeList.forEach((route) => {
                const rate = nullableRate(route.dat_kpi_2026, route.total_bg) || 0;
                if (rate >= 70) counts.green += 1;
                else if (rate >= 60) counts.pink += 1;
                else if (rate >= 50) counts.yellow += 1;
                else counts.red += 1;
            });
            return {
                ma_bcvh: unit.ma_bcvh,
                ten_bcvh: unit.ten_bcvh,
                participating_route_count: routeList.length,
                ...counts,
            };
        });

        return {
            monthly,
            daily,
            mtd,
            routes,
            meta: this._buildMeta(anchorDate, anchorCeiling),
        };
    }

    _emptyOverview(anchorCeiling) {
        return {
            monthly: [], daily: [],
            mtd: this.units.map((unit) => ({
                ...unit, volume: 0, passed: 0, failed: 0, rate: null, rank: null,
                previous_month_to_date: { volume: 0, passed: 0, rate: null },
            })),
            routes: this.units.map((unit) => ({
                ...unit, participating_route_count: 0, green: 0, pink: 0, yellow: 0, red: 0,
            })),
            meta: {
                anchor_date: null,
                anchor_source: null,
                max_date: null,
                requested_ceiling: anchorCeiling,
                month_period: { from_date: null, to_date: null },
                year_period: { from_date: null, to_date: null },
                route_period: { from_date: null, to_date: null, basis: 'MTD' },
                canonical_bcvh_count: this.units.length,
            },
        };
    }

    _buildMeta(anchorDate, anchorCeiling) {
        const yesterday = this._yesterday();
        return {
            anchor_date: anchorDate,
            anchor_source: anchorDate === yesterday ? 'yesterday' : 'max_date',
            max_date: anchorDate,
            requested_ceiling: anchorCeiling,
            month_period: { from_date: `${anchorDate.slice(0, 7)}-01`, to_date: anchorDate },
            year_period: { from_date: `${anchorDate.slice(0, 4)}-01-01`, to_date: anchorDate },
            route_period: { from_date: `${anchorDate.slice(0, 7)}-01`, to_date: anchorDate, basis: 'MTD' },
            canonical_bcvh_count: this.units.length,
        };
    }
}

module.exports = {
    BcvhOverviewService,
    nullableRate,
    rankMtd,
};
