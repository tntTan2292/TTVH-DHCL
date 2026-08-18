'use strict';

const fs = require('fs');
const {
    REGISTRY_VERSION,
    BUSINESS_TIMEZONE,
    listIndicatorConfigs,
    validateIndicatorRegistration,
} = require('./importIndicatorRegistry');
const { COMPLETION_STATUSES } = require('./autoBackfillCompletionPolicies');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COVERAGE_STATUSES = Object.freeze([
    COMPLETION_STATUSES.SUCCESS,
    COMPLETION_STATUSES.MISSING,
    COMPLETION_STATUSES.INCOMPLETE,
    COMPLETION_STATUSES.MANUAL_REVIEW_REQUIRED,
    'MANUAL_ONLY_MISSING',
]);

function normalizeBusinessDate(value, fieldName) {
    const text = String(value || '');
    if (!ISO_DATE.test(text)) throw createCoverageError('INVALID_DATE', `${fieldName} must use YYYY-MM-DD.`);
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw createCoverageError('INVALID_DATE', `${fieldName} is not a valid calendar date.`);
    }
    return text;
}

function formatDateInTimezone(value, timezone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw createCoverageError('INVALID_DATE', 'as_of is not a valid date or timestamp.');
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function addUtcDays(businessDate, amount) {
    const date = new Date(`${normalizeBusinessDate(businessDate, 'businessDate')}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}

function enumerateDatesDescending(fromDate, toDate) {
    if (fromDate > toDate) return [];
    const dates = [];
    for (let cursor = toDate; cursor >= fromDate; cursor = addUtcDays(cursor, -1)) dates.push(cursor);
    return dates;
}

function createCoverageError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
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

function queueDisposition(indicator, lane, completionStatus) {
    if (completionStatus === COMPLETION_STATUSES.SUCCESS) {
        return { queueEligible: false, reason: 'ALREADY_SUCCESS' };
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
    } = {}) {
        this.db = db || require('../config/db');
        this.fs = fsImpl;
        this.clock = clock;
        this.registryProvider = registryProvider;
        this.registryVersion = registryVersion;
        this.businessTimezone = businessTimezone;
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
            const status = completion.status === COMPLETION_STATUSES.MISSING && tuple.lane.automationMode === 'MANUAL_ONLY'
                ? 'MANUAL_ONLY_MISSING'
                : completion.status;
            const disposition = queueDisposition(tuple.indicator, tuple.lane, completion.status);
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
            });
        }

        const laneGroups = new Map();
        for (const indicatorConfig of scopedIndicators) {
            for (const laneConfig of Object.values(indicatorConfig.lanes)) {
                if (laneFilter && laneConfig.code !== laneFilter) continue;
                if (!laneCanBeRead(laneConfig, requesterRoles)) continue;
                const key = `${indicatorConfig.code}\u0000${laneConfig.code}`;
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
            const group = laneGroups.get(`${item.indicator}\u0000${item.source_lane}`);
            group.counts[item.status] += 1;
            group.items.push(item);
        }

        return {
            registry_version: this.registryVersion,
            business_timezone: this.businessTimezone,
            as_of_business_date: asOfBusinessDate,
            to_date: toDate,
            ordering: ['business_date_desc', 'indicator_priority_asc', 'lane_priority_asc'],
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
    normalizeBusinessDate,
    formatDateInTimezone,
    addUtcDays,
    enumerateDatesDescending,
};
