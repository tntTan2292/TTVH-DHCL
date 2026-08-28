'use strict';

const fs = require('fs');
const {
    REGISTRY_VERSION,
    BUSINESS_TIMEZONE,
    listIndicatorConfigs,
    validateIndicatorRegistration,
} = require('./importIndicatorRegistry');
const { COMPLETION_STATUSES } = require('./autoBackfillCompletionPolicies');
const {
    ISO_DATE,
    createCalendarError,
    normalizeBusinessDate,
    formatDateInTimezone,
    addUtcDays,
    enumerateDatesDescending,
} = require('./autoBackfillBusinessCalendar');
const { AutoBackfillCoverageExceptionService, COVERAGE_EXCEPTION_TYPES } = require('./autoBackfillCoverageExceptionService');
const { AutoBackfillHolidayCalendarService } = require('./autoBackfillHolidayCalendarService');

// AB-CALENDAR-01: the 4 canonical, PO-facing coverage statuses that replace
// the frozen 6-state model (AUTO-BACKFILL-UI_PLAN.md Section 4, amended under
// approved decision D3 -- see AB-CALENDAR-01_4_STATUS_MODEL_DESIGN.md).
// `COMPLETED` and `INCOMPLETE` are derived straight from the raw completion
// policy; `EXCLUDED` covers an ACTIVE holiday, `PO_EXEMPTED` or
// `VERIFIED_NO_DATA` (no data, and PO/calendar confirms none is expected);
// `DATA_ERROR` covers `MANUAL_REVIEW_REQUIRED` or raw `INCOMPLETE` (import was
// attempted but failed) -- never a day nobody has touched.
const PO_STATUSES = Object.freeze(['COMPLETED', 'INCOMPLETE', 'EXCLUDED', 'DATA_ERROR']);

function createCoverageError(code, message, statusCode = 400) {
    return createCalendarError(code, message, statusCode);
}

function normalizeRoles(roles) {
    if (roles === null || roles === undefined) return null;
    const values = Array.isArray(roles) ? roles : [roles];
    return values.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
}

function laneCanBeRead(lane, roles) {
    if (roles === null) return true;
    const allowed = lane.permissions.coverageReadRoles.map((role) => String(role).toLowerCase());
    return roles.some((role) => allowed.includes(role));
}

// AB-CALENDAR-01 -- maps the raw 4-state completion policy result onto the 4
// PO-facing statuses, applying the exception/holiday overlay when the raw
// result is not already `SUCCESS`. Real, currently-committed complete data
// always wins over a stale exception or holiday record.
//
// D2 (approved): `LEGACY_BASELINE` means PO has confirmed pre-Import data is
// valid, so it maps to `COMPLETED` -- but only while that data is still
// actually there (`evidence.row_count > 0`). If it were ever removed
// afterwards, the exception no longer asserts anything true and the day
// falls through to the normal mapping for its current raw status instead of
// silently claiming completion.
function toPoStatus(rawStatus, exception, holiday, evidence) {
    if (rawStatus === COMPLETION_STATUSES.SUCCESS) return 'COMPLETED';
    if (exception && exception.exception_type === 'LEGACY_BASELINE') {
        if (Number(evidence?.row_count) > 0) return 'COMPLETED';
        // Stale LEGACY_BASELINE: the data it vouched for is gone. Fall through
        // to the normal raw-status mapping below.
    } else if (exception) {
        return 'EXCLUDED'; // PO_EXEMPTED, VERIFIED_NO_DATA
    } else if (holiday) {
        return 'EXCLUDED';
    }
    return rawStatus === COMPLETION_STATUSES.MISSING ? 'INCOMPLETE' : 'DATA_ERROR';
}

function queueDisposition(indicator, lane, completionStatus, exception, holiday) {
    if (completionStatus === COMPLETION_STATUSES.SUCCESS) {
        return { queueEligible: false, reason: 'ALREADY_SUCCESS' };
    }
    if (exception) {
        // VERIFIED_NO_DATA, PO_EXEMPTED and LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE
        // are valid, audited business outcomes: never queue, retry, or count
        // them toward a circuit -- they never reach the Queue/Safety layer at all.
        return { queueEligible: false, reason: exception.exception_type };
    }
    if (holiday) {
        // AB-CALENDAR-01 D3 supersedes the prior holiday design's PO decision 2:
        // EXCLUDED (holiday) is never auto-queued. "Nhập lại" still works for a
        // single tuple via the narrow include_excluded opt-in (Section 4.2).
        return { queueEligible: false, reason: 'HOLIDAY' };
    }
    if (indicator.status !== 'ACTIVE') {
        return { queueEligible: false, reason: 'INDICATOR_NOT_ACTIVE' };
    }
    if (lane.automationMode === 'DISABLED') {
        return { queueEligible: false, reason: 'AUTOMATION_DISABLED' };
    }
    if (lane.automationMode !== 'AUTOMATED') {
        return { queueEligible: false, reason: lane.manualOnlyReason || 'PORTAL_ADAPTER_NOT_REGISTERED' };
    }
    if (completionStatus !== COMPLETION_STATUSES.MISSING) {
        return { queueEligible: false, reason: 'COMPLETION_EVIDENCE_REQUIRES_REVIEW' };
    }
    return { queueEligible: true, reason: null };
}

function emptyCounts() {
    return Object.fromEntries(PO_STATUSES.map((status) => [status, 0]));
}

// AB-CALENDAR-01 -- LỊCH NGHỈ overlay.
//
// Precedence is strict and one-directional: real committed data (SUCCESS)
// beats an ACTIVE coverage exception, which beats a holiday. A holiday is
// therefore only ever consulted when the raw completion policy says MISSING
// and no exception applies -- which is exactly what keeps a day that really
// did produce data fully visible and fully importable ("không chặn nhập nếu
// ngày đó thực ra có dữ liệu thật").
//
// Under the 4-status model (design D3, superseding the prior holiday design's
// PO decision 2) a holiday now maps its day to the `EXCLUDED` PO status and
// makes it `queue_eligible: false` -- see `toPoStatus()` and
// `queueDisposition()`. The `holiday` field is still emitted so the specific
// reason stays visible as a secondary chip.
function resolveHoliday(completionStatus, exception, holidayMap, businessDate) {
    if (completionStatus !== COMPLETION_STATUSES.MISSING) return null;
    if (exception) return null;
    return holidayMap.get(businessDate) || null;
}

class AutoBackfillCoverageService {
    constructor({
        db = null,
        fsImpl = fs,
        clock = () => new Date(),
        registryProvider = listIndicatorConfigs,
        registryVersion = REGISTRY_VERSION,
        businessTimezone = BUSINESS_TIMEZONE,
        exceptionService = null,
        holidayCalendarService = null,
    } = {}) {
        this.db = db || require('../config/db');
        this.fs = fsImpl;
        this.clock = clock;
        this.registryProvider = registryProvider;
        this.registryVersion = registryVersion;
        this.businessTimezone = businessTimezone;
        this.exceptionService = exceptionService || new AutoBackfillCoverageExceptionService({
            db: this.db,
            fsImpl: this.fs,
            clock: this.clock,
            registryProvider: this.registryProvider,
            registryVersion: this.registryVersion,
            businessTimezone: this.businessTimezone,
        });
        this.holidayCalendarService = holidayCalendarService || new AutoBackfillHolidayCalendarService({
            db: this.db,
            clock: this.clock,
            businessTimezone: this.businessTimezone,
        });
    }

    async scan({ asOf = null, indicator = null, lane = null, roles = null } = {}) {
        const asOfBusinessDate = typeof asOf === 'string' && ISO_DATE.test(asOf)
            ? normalizeBusinessDate(asOf, 'as_of')
            : formatDateInTimezone(asOf || this.clock(), this.businessTimezone);
        const toDate = addUtcDays(asOfBusinessDate, -1);
        const indicatorFilter = indicator ? String(indicator).trim().toUpperCase() : null;
        const laneFilter = lane ? String(lane).trim().toUpperCase() : null;
        const requesterRoles = normalizeRoles(roles);
        const registrations = this.registryProvider().map((entry) => validateIndicatorRegistration(entry, entry.code));

        if (indicatorFilter && !registrations.some((entry) => entry.code === indicatorFilter)) {
            throw createCoverageError('INDICATOR_NOT_REGISTERED', `Indicator '${indicator}' is not registered.`);
        }
        if (laneFilter && !registrations.some((entry) => Object.hasOwn(entry.lanes, laneFilter))) {
            throw createCoverageError('LANE_NOT_REGISTERED', `Source lane '${lane}' is not registered.`);
        }

        const scopedIndicators = registrations
            .filter((entry) => ['ACTIVE', 'PAUSED'].includes(entry.status))
            .filter((entry) => !indicatorFilter || entry.code === indicatorFilter);
        const tuples = [];
        let matchedBeforePermission = 0;
        let matchedAfterPermission = 0;

        for (const indicatorConfig of scopedIndicators) {
            for (const laneConfig of Object.values(indicatorConfig.lanes)) {
                if (laneFilter && laneConfig.code !== laneFilter) continue;
                matchedBeforePermission += 1;
                if (!laneCanBeRead(laneConfig, requesterRoles)) continue;
                matchedAfterPermission += 1;
                for (const businessDate of enumerateDatesDescending(indicatorConfig.trackingStartDate, toDate)) {
                    tuples.push({ indicator: indicatorConfig, lane: laneConfig, businessDate });
                }
            }
        }

        if (matchedBeforePermission > 0 && matchedAfterPermission === 0) {
            throw createCoverageError('COVERAGE_FORBIDDEN', 'Coverage access is not granted by the indicator registry.', 403);
        }

        tuples.sort((left, right) =>
            right.businessDate.localeCompare(left.businessDate)
            || left.indicator.priority - right.indicator.priority
            || left.lane.priority - right.lane.priority
            || left.indicator.code.localeCompare(right.indicator.code)
            || left.lane.code.localeCompare(right.lane.code));

        const exceptionMap = await this.exceptionService.loadActiveExceptionMap({
            indicatorCodes: scopedIndicators.map((entry) => entry.code),
            laneCode: laneFilter,
        });
        // AB-CALENDAR-01: one extra batched load, bounded by the widest
        // tracking window in scope, alongside the exception map.
        const holidayMap = await this.holidayCalendarService.loadActiveHolidayMap({
            fromDate: scopedIndicators.reduce(
                (earliest, entry) => (earliest === null || entry.trackingStartDate < earliest ? entry.trackingStartDate : earliest),
                null,
            ),
            toDate,
        });

        const items = [];
        for (const tuple of tuples) {
            const completion = await tuple.lane.completionPolicy.evaluate({
                db: this.db,
                fs: this.fs,
                indicator: tuple.indicator,
                lane: tuple.lane,
                businessDate: tuple.businessDate,
            });
            if (!Object.values(COMPLETION_STATUSES).includes(completion.status)) {
                throw createCoverageError('INVALID_COMPLETION_STATUS', `${tuple.lane.completionPolicy.id} returned an invalid status.`);
            }
            const exception = completion.status === COMPLETION_STATUSES.SUCCESS
                ? null
                : exceptionMap.get(tuple.indicator.code + '|' + tuple.lane.code + '|' + tuple.businessDate) || null;
            const holiday = resolveHoliday(completion.status, exception, holidayMap, tuple.businessDate);
            const status = toPoStatus(completion.status, exception, holiday, completion.evidence);
            const disposition = queueDisposition(tuple.indicator, tuple.lane, completion.status, exception, holiday);
            // AB-CALENDAR-01: "chưa xử lý xong" is exactly INCOMPLETE + DATA_ERROR,
            // derived from the final PO status rather than re-deriving raw
            // completion/exception/holiday logic, so it stays correct even for the
            // stale-LEGACY_BASELINE fallthrough in toPoStatus(). `counts_as_missing`
            // is kept as a deprecated alias for one release.
            const countsAsUnprocessed = status === 'INCOMPLETE' || status === 'DATA_ERROR';
            items.push({
                indicator: tuple.indicator.code,
                source_lane: tuple.lane.code,
                business_date: tuple.businessDate,
                status,
                completion_status: completion.status,
                completion_reason: completion.reason,
                completion_policy_id: tuple.lane.completionPolicy.id,
                automation_mode: tuple.lane.automationMode,
                queue_eligible: disposition.queueEligible,
                queue_ineligible_reason: disposition.reason,
                evidence: completion.evidence,
                // AB-CALENDAR-01 additive fields.
                holiday: holiday ? {
                    id: holiday.id,
                    business_date: holiday.business_date,
                    reason: holiday.reason,
                    created_by: holiday.created_by,
                    created_at: holiday.created_at,
                } : null,
                counts_as_unprocessed: countsAsUnprocessed,
                counts_as_missing: countsAsUnprocessed, // deprecated alias, kept for one release
                exception: exception ? {
                    id: exception.id,
                    exception_type: exception.exception_type,
                    reason: exception.reason,
                    created_by: exception.created_by,
                    created_at: exception.created_at,
                } : null,
            });
        }

        const laneGroups = new Map();
        for (const indicatorConfig of scopedIndicators) {
            for (const laneConfig of Object.values(indicatorConfig.lanes)) {
                if (laneFilter && laneConfig.code !== laneFilter) continue;
                if (!laneCanBeRead(laneConfig, requesterRoles)) continue;
                const key = `${indicatorConfig.code} ${laneConfig.code}`;
                laneGroups.set(key, {
                    indicator: indicatorConfig.code,
                    indicator_name: indicatorConfig.name,
                    indicator_status: indicatorConfig.status,
                    source_lane: laneConfig.code,
                    tracking_start_date: indicatorConfig.trackingStartDate,
                    to_date: toDate,
                    automation_mode: laneConfig.automationMode,
                    manual_only_reason: laneConfig.manualOnlyReason || null,
                    portal_adapter_id: laneConfig.portalAdapter?.id || null,
                    completion_policy_id: laneConfig.completionPolicy.id,
                    counts: emptyCounts(),
                    // AB-CALENDAR-01: additive visibility field, kept outside
                    // the 4-status `counts` object on purpose (a holiday day
                    // is already counted under `EXCLUDED` in `counts`).
                    holiday_skipped_count: 0,
                    items: [],
                });
            }
        }
        for (const item of items) {
            const group = laneGroups.get(`${item.indicator} ${item.source_lane}`);
            group.counts[item.status] += 1;
            if (item.holiday) group.holiday_skipped_count += 1;
            group.items.push(item);
        }

        const APPROVED_BADGE_THEMES = new Set(['blue', 'teal', 'indigo', 'purple', 'emerald', 'amber', 'rose']);
        const indicatorsMetadata = scopedIndicators.map((ind, index) => ({
            code: ind.code,
            display_name: ind.name,
            display_order: ind.priority || (index + 1),
            status: ind.status,
            tracking_start_date: ind.trackingStartDate,
            supported_lanes: Object.keys(ind.lanes || {}),
            automation_mode: Object.values(ind.lanes || {}).some((l) => l.automationMode === 'AUTOMATED') ? 'AUTOMATED' : 'MANUAL_ONLY',
            badge_theme: APPROVED_BADGE_THEMES.has(ind.badgeTheme) ? ind.badgeTheme : 'slate',
        }));

        return {
            registry_version: this.registryVersion,
            business_timezone: this.businessTimezone,
            as_of_business_date: asOfBusinessDate,
            to_date: toDate,
            ordering: ['business_date_desc', 'indicator_priority_asc', 'lane_priority_asc'],
            coverage_statuses: PO_STATUSES,
            indicators: indicatorsMetadata,
            total_items: items.length,
            runnable_portal_jobs: items.filter((item) => item.queue_eligible).length,
            holiday_skipped_total: items.filter((item) => item.holiday).length,
            lanes: [...laneGroups.values()],
            items,
        };
    }

    /**
     * AB-CALENDAR-01 -- backing API for "Chọn tất cả chưa hoàn tất".
     *
     * A thin wrapper over `scan()`: it duplicates no eligibility logic, it
     * only narrows the scan result to one month and keeps the days whose
     * `counts_as_unprocessed` is true (INCOMPLETE + DATA_ERROR). The excluded days are returned explicitly
     * so the operator can see what the calendar and the exception ledger
     * removed instead of silently losing them.
     *
     * The keys are `indicator|source_lane|business_date`, matching the
     * operator panel's own item key, so the frontend can seed its selection
     * directly and cover every page of a month at once.
     */
    async selectable({ indicator = null, lane = null, month = null, roles = null } = {}) {
        const monthFilter = month === null || month === undefined || month === '' || month === 'ALL'
            ? null
            : String(month).trim();
        if (monthFilter !== null && !/^\d{4}-\d{2}$/.test(monthFilter)) {
            throw createCoverageError('COVERAGE_MONTH_INVALID', 'month must use YYYY-MM.');
        }

        const coverage = await this.scan({ indicator, lane, roles });
        const inMonth = (item) => monthFilter === null || item.business_date.startsWith(`${monthFilter}-`);
        const scoped = coverage.items.filter(inMonth);

        return {
            registry_version: coverage.registry_version,
            business_timezone: coverage.business_timezone,
            as_of_business_date: coverage.as_of_business_date,
            to_date: coverage.to_date,
            indicator: indicator ? String(indicator).trim().toUpperCase() : 'ALL',
            lane: lane ? String(lane).trim().toUpperCase() : 'ALL',
            month: monthFilter || 'ALL',
            total_candidates: scoped.length,
            items: scoped
                .filter((item) => item.counts_as_unprocessed)
                .map((item) => ({
                    key: `${item.indicator}|${item.source_lane}|${item.business_date}`,
                    indicator: item.indicator,
                    source_lane: item.source_lane,
                    business_date: item.business_date,
                    status: item.status,
                })),
            excluded_holiday: scoped
                .filter((item) => item.holiday)
                .map((item) => ({
                    indicator: item.indicator,
                    source_lane: item.source_lane,
                    business_date: item.business_date,
                    reason: item.holiday.reason,
                })),
            excluded_exception: scoped
                .filter((item) => item.exception && item.status === 'EXCLUDED')
                .map((item) => ({
                    indicator: item.indicator,
                    source_lane: item.source_lane,
                    business_date: item.business_date,
                    exception_type: item.exception.exception_type,
                })),
            excluded_complete: scoped.filter((item) => item.status === 'COMPLETED').length,
        };
    }
}

module.exports = {
    AutoBackfillCoverageService,
    PO_STATUSES,
    COVERAGE_EXCEPTION_TYPES,
    normalizeBusinessDate,
    formatDateInTimezone,
    addUtcDays,
    enumerateDatesDescending,
};
