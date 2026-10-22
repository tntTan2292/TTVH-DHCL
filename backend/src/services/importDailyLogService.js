'use strict';

/**
 * IMPORT-DAILYLOG-01 -- "Log ngày mới": has today's automatic import finished, and what needs the PO right now.
 *
 * One read-only picture for a business day D (the day the scheduled import runs on, Vietnam time):
 *   - a grid indicator x lane x day for the new day D-1 and the refresh days (24 cells with 4 indicators, 2 lanes, 3 days),
 *     each cell taken from the jobs of D's runs and, when there is no job, from the import log;
 *   - the scheduler cycle of D (attempt, next retry, gave up) and the HUE / TCT sessions;
 *   - the runs of D, old failed days kept apart (the schedule ignores them in its retry decision), and the manual /
 *     failed imports of the day;
 *   - an ordered "needs attention" list with a one-line verdict.
 * It never writes and never opens a browser.
 */

const { formatDateInTimezone, addUtcDays, ISO_DATE } = require('./autoBackfillBusinessCalendar');
const { listIndicatorConfigs } = require('./importIndicatorRegistry');
const { AutoImportScheduler, vietnamClock } = require('./autoImportScheduler');

const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
const OK_JOB_STATES = new Set(['SUCCESS', 'SKIPPED_ALREADY_SUCCESS']);
const ACTIVE_JOB_STATES = new Set(['QUEUED', 'RUNNING', 'RECOVERY_CHECK']);
const BAD_SESSION_STATUSES = new Set(['AUTHENTICATION_REQUIRED', 'LOGIN_TIMEOUT', 'SESSION_CHECK_FAILED', 'DISCONNECTED']);
const OVERDUE_GRACE_MINUTES = 30;

const CELL_STATES = Object.freeze({
    OK: 'OK',
    FAILED: 'FAILED',
    RUNNING: 'RUNNING',
    QUEUED: 'QUEUED',
    WAITING_AUTH: 'WAITING_AUTH',
    MISSING: 'MISSING'
});

function toIso(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const date = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? new Date(raw) : new Date(`${raw.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** UTC bounds ('YYYY-MM-DD HH:MM:SS', the SQLite format of import_log.created_at) of a Vietnam business day. */
function vietnamDayUtcBounds(day) {
    const start = `${addUtcDays(day, -1)} 17:00:00`;
    const end = `${day} 17:00:00`;
    return { start, end };
}

class ImportDailyLogService {
    constructor({
        db,
        sessionService = null,
        scheduler = null,
        env = process.env,
        clock = () => new Date(),
        indicators = null
    } = {}) {
        this.db = db;
        this.sessionService = sessionService;
        this.env = env;
        this.clock = clock;
        // only the schedule's settings and its saved state are read here; it is never started
        this.scheduler = scheduler || new AutoImportScheduler({ env, clock });
        this.indicatorList = indicators;
    }

    indicators() {
        if (this.indicatorList) return this.indicatorList;
        return listIndicatorConfigs()
            .filter((indicator) => indicator.status === 'ACTIVE'
                && Object.values(indicator.lanes || {}).some((lane) => lane.automationMode === 'AUTOMATED'))
            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
            .map((indicator) => ({ code: indicator.code, label: indicator.name || indicator.code }));
    }

    async build({ date = null } = {}) {
        const now = this.clock();
        const today = formatDateInTimezone(now, BUSINESS_TIMEZONE);
        const day = date || today;
        if (!ISO_DATE.test(day)) {
            const error = new Error('date must be YYYY-MM-DD.');
            error.code = 'INVALID_DATE';
            throw error;
        }
        const recentDays = Math.max(1, this.scheduler.recentDays());
        const windowDays = Array.from({ length: recentDays }, (_, index) => addUtcDays(day, -(index + 1)));
        const windowStart = windowDays[windowDays.length - 1];
        const windowEnd = windowDays[0];
        const lanes = this.scheduler.lanes();
        const indicators = this.indicators();

        const [jobs, importRows, runs] = await Promise.all([
            this.loadJobs(day, windowStart, windowEnd),
            this.loadLatestImports(windowStart, windowEnd),
            this.loadRuns(day)
        ]);

        const grid = [];
        const cells = [];
        for (const indicator of indicators) {
            for (const lane of lanes) {
                const row = { indicator: indicator.code, label: indicator.label, lane, days: [] };
                for (const businessDate of windowDays) {
                    const cell = await this.buildCell({ indicator: indicator.code, lane, businessDate, jobs, importRows });
                    row.days.push(cell);
                    cells.push(cell);
                }
                grid.push(row);
            }
        }

        const [oldFailures, manualImports] = await Promise.all([
            this.loadOldFailures(day, windowStart),
            this.loadManualAndFailedImports(day)
        ]);
        const scheduler = this.describeScheduler(day, today, now);
        const sessions = await this.describeSessions();

        const counts = { OK: 0, FAILED: 0, RUNNING: 0, QUEUED: 0, WAITING_AUTH: 0, MISSING: 0 };
        for (const cell of cells) counts[cell.state] += 1;
        const attention = this.buildAttention({ day, today, cells, scheduler, sessions, manualImports, oldFailures, counts });
        const verdict = this.buildVerdict({ counts, attention, scheduler, expected: cells.length });

        return {
            as_of: day,
            is_today: day === today,
            generated_at: now.toISOString(),
            window: { new_day: windowEnd, days: windowDays, recent_days: recentDays },
            summary: { expected: cells.length, ...counts, verdict: verdict.code, verdict_text: verdict.text },
            attention,
            grid,
            scheduler,
            sessions,
            runs,
            old_failures: oldFailures,
            manual_imports: manualImports
        };
    }

    async loadJobs(day, windowStart, windowEnd) {
        return this.db.all(
            `SELECT j.id, j.run_id, j.indicator, j.source_lane, j.business_date, j.state, j.safety_state, j.terminal_reason,
                    j.force_reimport, j.created_at, j.ended_at, r.requested_by
             FROM auto_backfill_job j
             JOIN auto_backfill_run r ON r.id = j.run_id
             WHERE r.as_of_business_date = ? AND j.business_date BETWEEN ? AND ?
             ORDER BY j.created_at ASC, j.id ASC`,
            [day, windowStart, windowEnd]
        );
    }

    async loadLatestImports(windowStart, windowEnd) {
        return this.db.all(
            `SELECT id, COALESCE(indicator, 'F1.3') AS indicator, source_lane, ngay_do_kiem, status, created_at
             FROM import_log
             WHERE id IN (
                 SELECT MAX(id) FROM import_log WHERE ngay_do_kiem BETWEEN ? AND ?
                 GROUP BY ngay_do_kiem, COALESCE(indicator, 'F1.3'), source_lane
             )`,
            [windowStart, windowEnd]
        );
    }

    async loadRuns(day) {
        const runs = await this.db.all(
            `SELECT id, requested_by, requested_lane, status, status_reason, created_at, ended_at
             FROM auto_backfill_run WHERE as_of_business_date = ? ORDER BY created_at DESC`,
            [day]
        );
        if (runs.length === 0) return [];
        const counts = await this.db.all(
            `SELECT run_id, state, COUNT(*) AS n FROM auto_backfill_job
             WHERE run_id IN (${runs.map(() => '?').join(',')}) GROUP BY run_id, state`,
            runs.map((run) => run.id)
        );
        const byRun = new Map();
        for (const row of counts) {
            if (!byRun.has(row.run_id)) byRun.set(row.run_id, {});
            byRun.get(row.run_id)[row.state] = Number(row.n);
        }
        return runs.map((run) => ({
            id: run.id,
            requested_by: run.requested_by,
            lane: run.requested_lane || null,
            status: run.status,
            status_reason: run.status_reason || null,
            created_at: toIso(run.created_at),
            ended_at: toIso(run.ended_at),
            job_counts: byRun.get(run.id) || {}
        }));
    }

    async buildCell({ indicator, lane, businessDate, jobs, importRows }) {
        const tupleJobs = jobs.filter((job) => job.indicator === indicator && job.source_lane === lane && job.business_date === businessDate);
        const latest = tupleJobs[tupleJobs.length - 1] || null;
        const lastImport = importRows.find((row) => row.indicator === indicator && row.source_lane === lane && row.ngay_do_kiem === businessDate) || null;
        const hasData = tupleJobs.some((job) => OK_JOB_STATES.has(job.state)) || lastImport?.status === 'SUCCESS';
        const cell = {
            indicator,
            lane,
            date: businessDate,
            state: CELL_STATES.MISSING,
            reason: null,
            detail: null,
            has_data: hasData,
            job_id: latest?.id || null,
            run_id: latest?.run_id || null,
            attempts_in_day: tupleJobs.length,
            last_import_at: toIso(lastImport?.created_at),
            last_import_status: lastImport?.status || null
        };

        if (latest) {
            if (OK_JOB_STATES.has(latest.state)) {
                cell.state = CELL_STATES.OK;
            } else if (latest.state === 'RUNNING' || latest.state === 'RECOVERY_CHECK') {
                cell.state = CELL_STATES.RUNNING;
            } else if (latest.state === 'QUEUED') {
                cell.state = latest.safety_state === 'WAITING_AUTH' ? CELL_STATES.WAITING_AUTH : CELL_STATES.QUEUED;
            } else if (latest.state === 'FAILED_TERMINAL') {
                cell.state = CELL_STATES.FAILED;
                cell.reason = latest.terminal_reason || 'FAILED_TERMINAL';
                const attempt = await this.db.get(
                    `SELECT result_code, error_signature, classification, action_required
                     FROM auto_backfill_attempt WHERE job_id = ? ORDER BY attempt_number DESC LIMIT 1`,
                    [latest.id]
                ).catch(() => null);
                if (attempt) {
                    cell.detail = attempt.error_signature || attempt.result_code || null;
                    cell.classification = attempt.classification || null;
                    cell.action_required = attempt.action_required || null;
                }
            } else if (latest.state === 'CANCELLED') {
                cell.state = hasData ? CELL_STATES.OK : CELL_STATES.MISSING;
                cell.reason = 'CANCELLED';
            }
            if (latest.safety_state === 'WAITING_AUTH' && ACTIVE_JOB_STATES.has(latest.state)) cell.state = CELL_STATES.WAITING_AUTH;
        } else if (lastImport?.status === 'SUCCESS') {
            cell.state = CELL_STATES.OK;
            cell.reason = 'NO_JOB_TODAY_DATA_PRESENT';
        } else if (lastImport?.status === 'FAILED') {
            cell.state = CELL_STATES.FAILED;
            cell.reason = 'IMPORT_LOG_FAILED';
        }
        return cell;
    }

    /** Failed days older than the schedule's recent window whose latest job is still failed, grouped by indicator, lane, reason. */
    async loadOldFailures(day, windowStart) {
        const rows = await this.db.all(
            `SELECT j.indicator, j.source_lane, j.business_date, j.terminal_reason
             FROM auto_backfill_job j JOIN auto_backfill_run r ON r.id = j.run_id
             WHERE r.as_of_business_date = ? AND j.state = 'FAILED_TERMINAL' AND j.business_date < ?
             GROUP BY j.indicator, j.source_lane, j.business_date`,
            [day, windowStart]
        );
        const still = [];
        for (const row of rows) {
            const latest = await this.db.get(
                `SELECT state FROM auto_backfill_job WHERE indicator = ? AND source_lane = ? AND business_date = ?
                 ORDER BY created_at DESC, id DESC LIMIT 1`,
                [row.indicator, row.source_lane, row.business_date]
            );
            if (latest?.state === 'FAILED_TERMINAL') still.push(row);
        }
        const groups = new Map();
        for (const row of still) {
            const key = `${row.indicator}|${row.source_lane}|${row.terminal_reason || ''}`;
            if (!groups.has(key)) {
                groups.set(key, { indicator: row.indicator, lane: row.source_lane, reason: row.terminal_reason || null, dates: [] });
            }
            groups.get(key).dates.push(row.business_date);
        }
        return [...groups.values()].map((group) => {
            const dates = group.dates.sort();
            return {
                indicator: group.indicator,
                lane: group.lane,
                reason: group.reason,
                count: dates.length,
                first_date: dates[0],
                last_date: dates[dates.length - 1],
                sample_dates: dates.slice(-5)
            };
        }).sort((a, b) => b.count - a.count);
    }

    /** Imports of the Vietnam day made by a person (manual upload, or a run started by a user), plus every failed import. */
    async loadManualAndFailedImports(day) {
        const { start, end } = vietnamDayUtcBounds(day);
        const columns = new Set((await this.db.all('PRAGMA table_info(import_log)')).map((column) => column.name));
        const audit = (name) => (columns.has(name) ? name : 'NULL');
        const rows = await this.db.all(
            `SELECT id, file_name, ngay_do_kiem, COALESCE(indicator, 'F1.3') AS indicator, source_lane, trigger_source, status,
                    created_at, total_records, error_records,
                    ${audit('actor')} AS actor, ${audit('import_mode')} AS import_mode
             FROM import_log
             WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)
               AND (status = 'FAILED' OR trigger_source LIKE 'MANUAL%'
                    OR (${columns.has('actor') ? "actor IS NOT NULL AND actor NOT IN ('scheduler', 'system') AND trigger_source NOT LIKE 'AUTO_BACKFILL%'" : '0'}))
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT 100`,
            [start, end]
        );
        const result = [];
        for (const row of rows) {
            let resolved = false;
            if (row.status === 'FAILED') {
                const later = await this.db.get(
                    `SELECT id FROM import_log WHERE ngay_do_kiem = ? AND COALESCE(indicator, 'F1.3') = ? AND source_lane IS ?
                       AND status = 'SUCCESS' AND id > ? LIMIT 1`,
                    [row.ngay_do_kiem, row.indicator, row.source_lane, row.id]
                );
                resolved = Boolean(later);
            }
            result.push({
                id: row.id,
                file_name: row.file_name,
                business_date: row.ngay_do_kiem,
                indicator: row.indicator,
                lane: row.source_lane,
                trigger_source: row.trigger_source,
                actor: row.actor || null,
                import_mode: row.import_mode || null,
                status: row.status,
                resolved,
                total_records: Number(row.total_records || 0),
                error_records: Number(row.error_records || 0),
                created_at: toIso(row.created_at)
            });
        }
        return result;
    }

    describeScheduler(day, today, now) {
        const state = this.scheduler.readState();
        const cycle = state.cycle && state.cycle.day === day ? state.cycle : null;
        const times = this.scheduler.times();
        const enabled = this.scheduler.isEnabled();
        let overdue = false;
        if (enabled && day === today && !cycle && times.length > 0) {
            const { minutes } = vietnamClock(now);
            const [hour, minute] = times[0].split(':').map(Number);
            overdue = minutes >= hour * 60 + minute + OVERDUE_GRACE_MINUTES;
        }
        return {
            enabled,
            times,
            lanes: this.scheduler.lanes(),
            max_attempts: this.scheduler.maxAttempts(),
            retry_minutes: Math.round(this.scheduler.retryMs() / 60000),
            overdue,
            cycle: cycle ? {
                slot: cycle.slot,
                attempts: cycle.attempts,
                done: Boolean(cycle.done),
                gave_up: Boolean(cycle.done && /gave up/.test(cycle.lastSummary || '')),
                summary: cycle.lastSummary || null,
                next_attempt_at: !cycle.done && cycle.nextAttemptAt ? new Date(cycle.nextAttemptAt).toISOString() : null,
                attempt_running: Boolean(cycle.attempt),
                lanes: cycle.attempt?.lanes || null
            } : null
        };
    }

    async describeSessions() {
        const result = {};
        for (const source of ['HUE', 'TCT']) {
            try {
                const status = await this.sessionService.getSessionStatus(source);
                result[source] = {
                    status: status.status,
                    disconnected: Boolean(status.disconnected),
                    last_validated_at: status.last_validated_at || null,
                    last_error: status.last_error || null
                };
            } catch (error) {
                result[source] = { status: 'UNKNOWN', disconnected: false, last_validated_at: null, last_error: error.message };
            }
        }
        return result;
    }

    buildAttention({ day, today, cells, scheduler, sessions, manualImports, oldFailures, counts }) {
        const items = [];
        const add = (severity, code, message, extra = {}) => items.push({ severity, code, message, ...extra });
        const isToday = day === today;

        if (isToday) {
            for (const [source, session] of Object.entries(sessions)) {
                if (BAD_SESSION_STATUSES.has(session.status)) {
                    add('high', 'SESSION_NOT_READY', session.disconnected
                        ? `Phiên ${source} đã ngắt: cần đăng nhập lại để import tự động chạy được.`
                        : `Phiên ${source} chưa đăng nhập hoặc đã hết hạn (${session.status}): cần đăng nhập.`, { source });
                }
            }
        }
        if (scheduler.overdue) {
            add('high', 'SCHEDULE_NOT_STARTED', `Đã quá giờ lịch ${scheduler.times[0]} mà hôm nay chưa có lượt chạy tự động nào (backend có đang chạy không?).`);
        }
        if (scheduler.cycle?.gave_up) {
            add('high', 'SCHEDULE_GAVE_UP', `Lịch tự động đã bỏ cuộc sau ${scheduler.cycle.attempts} lần thử: cần PO xử lý và import lại.`);
        } else if (scheduler.cycle && !scheduler.cycle.done && scheduler.cycle.attempts >= 2) {
            add('medium', 'SCHEDULE_RETRYING', `Lịch tự động đang thử lại (đã ${scheduler.cycle.attempts} lần)${scheduler.cycle.next_attempt_at ? ', lần kế tiếp sau giờ ghi bên dưới' : ''}.`);
        }
        for (const cell of cells) {
            const where = { indicator: cell.indicator, lane: cell.lane, date: cell.date };
            if (cell.state === CELL_STATES.FAILED) {
                add('high', 'CELL_FAILED', `${cell.indicator} ${cell.lane} ngày ${cell.date} lỗi${cell.reason ? ` (${cell.reason})` : ''}${cell.has_data ? ' — đã có số liệu cũ, chưa làm mới được' : ''}.`, where);
            } else if (cell.state === CELL_STATES.WAITING_AUTH) {
                add('high', 'CELL_WAITING_AUTH', `${cell.indicator} ${cell.lane} ngày ${cell.date} đang chờ đăng nhập.`, where);
            } else if (cell.state === CELL_STATES.MISSING && isToday) {
                add('medium', 'CELL_MISSING', `${cell.indicator} ${cell.lane} ngày ${cell.date} chưa có lượt nhập nào.`, where);
            }
        }
        for (const row of manualImports) {
            if (row.status === 'FAILED' && !row.resolved) {
                add('high', 'FILE_IMPORT_FAILED', `File ${row.file_name} (${row.indicator} ${row.lane || ''} ngày ${row.business_date}) nhập lỗi, chưa nhập lại thành công.`, { import_id: row.id });
            }
        }
        if (oldFailures.length > 0) {
            const total = oldFailures.reduce((sum, group) => sum + group.count, 0);
            add('low', 'OLD_FAILURES', `Còn ${total} ngày cũ lỗi từ trước (lịch tự động bỏ qua khi quyết định thử lại); xem mục "Ngày cũ còn lỗi".`);
        }
        const order = { high: 0, medium: 1, low: 2 };
        return items.sort((a, b) => order[a.severity] - order[b.severity]);
    }

    buildVerdict({ counts, attention, scheduler, expected }) {
        const high = attention.filter((item) => item.severity === 'high').length;
        const working = counts.RUNNING + counts.QUEUED;
        if (high > 0) {
            return { code: 'ATTENTION', text: `Cần PO xử lý ${high} việc (${counts.OK}/${expected} ô đã xong).` };
        }
        if (working > 0 || (scheduler.cycle && !scheduler.cycle.done)) {
            return { code: 'IN_PROGRESS', text: `Đang chạy: ${counts.OK}/${expected} ô đã xong.` };
        }
        if (counts.MISSING > 0) {
            return { code: 'INCOMPLETE', text: `Chưa đủ: ${counts.OK}/${expected} ô đã xong, ${counts.MISSING} ô chưa có lượt nhập.` };
        }
        return { code: 'COMPLETE', text: `Đủ ${counts.OK}/${expected}: không có việc cần xử lý.` };
    }
}

module.exports = { ImportDailyLogService, CELL_STATES, vietnamDayUtcBounds };
