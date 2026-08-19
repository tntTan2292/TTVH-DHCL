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

// The 6 canonical, registry-driven Coverage states locked by
// AUTO-BACKFILL-UI_PLAN.md Section 4. `DATA_COMPLETE_WITH_EVIDENCE` and
// `TRUE_MISSING`/`MANUAL_REVIEW_REQUIRED` are derived straight from the raw
// completion policy; `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE`, `VERIFIED_NO_DATA`
// and `PO_EXEMPTED` are the 3 controlled, audited coverage-exception overlays.
const COVERAGE_STATUSES = Object.freeze([
    'DATA_COMPLETE_WITH_EVIDENCE',
    'LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE',
    'TRUE_MISSING',
    'VERIFIED_NO_DATA',
    'PO_EXEMPTED',
    'MANUAL_REVIEW_REQUIRED',
]);

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

// Maps the raw 4-state completion policy result onto the 6 canonical
// Coverage display states, applying the exception overlay (if any) when the
// raw result is not already `SUCCESS`. Real, currently-committed complete
// data always wins over a stale exception record.
function toCoverageStatus(rawStatus, exception) {
    if (rawStatus === COMPLETION_STATUSES.SUCCESS) return 'DATA_COMPLETE_WITH_EVIDENCE';
    if (exception) return exception.exception_type;
    if (rawStatus === COMPLETION_STATUSES.MISSING) return 'TRUE_MISSING';
    return 'MANUAL_REVIEW_REQUIRED';
}

function queueDisposition(indicator, lane, completionStatus, exception) {
    if (completionStatus === COMPLETION_STATUSES.SUCCESS) {
        return { queueEligible: false, reason: 'ALREADY_SUCCESS' };
    }
    if (exception) {
        // VERIFIED_NO_DATA, PO_EXEMPTED and LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE
        // are valid, audited business outcomes: never queue, retry, or count
        // them toward a circuit -- they never reach the Queue/Safety layer at all.
        return { queueEligible: false, reason: exception.exception_type };
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
    return Object.fromEntries(COVERAGE_STATUSES.map((status) => [status, 0]));
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
            const status = toCoverageStatus(completion.status, exception);
            const disposition = queueDisposition(tuple.indicator, tuple.lane, completion.status, exception);
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
                    items: [],
                });
            }
        }
        for (const item of items) {
            const group = laneGroups.get(`${item.indicator} ${item.source_lane}`);
            group.counts[item.status] += 1;
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
            coverage_statuses: COVERAGE_STATUSES,
            indicators: indicatorsMetadata,
            total_items: items.length,
            runnable_portal_jobs: items.filter((item) => item.queue_eligible).length,
            lanes: [...laneGroups.values()],
            items,
        };
    }
}

module.exports = {
    AutoBackfillCoverageService,
    COVERAGE_STATUSES,
    COVERAGE_EXCEPTION_TYPES,
    normalizeBusinessDate,
    formatDateInTimezone,
    addUtcDays,
    enumerateDatesDescending,
};
