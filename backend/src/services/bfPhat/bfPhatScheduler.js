/**
 * BF-PHAT-IMPORT-01 -- daily N-1 load of the delivery BatchFile.
 *
 * From BF_PHAT_SCHEDULE_START (Vietnam time, default 05:00 -- the server writes the file for D-1 at about 04:00) a tick
 * every minute checks whether D-1 has a SUCCESS BF-PHAT import_log row written today. If not, it downloads D-1 and the
 * two refresh days D-2, D-3 with WinSCP and imports them. A failure (file not there yet, WinSCP down, bad file) is
 * written to import_log as FAILED and retried after BF_PHAT_RETRY_MS (default 1 h) until BF_PHAT_MAX_ATTEMPTS (default 12).
 * Refresh days are re-imported only when the newest local file differs from the last logged one, so the log is not
 * flooded with identical rows. Off with BF_PHAT_SCHEDULE_ENABLED=false.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { BfPhatImportService, pickDailyFiles, INDICATOR, LANE } = require('./bfPhatImportService');
const { downloadDays, ddmmyyyy, DEFAULT_LOCAL_ROOT } = require('./bfPhatWinscpService');
const { insertImportLogRow } = require('../importLogAudit');

const TZ = 'Asia/Ho_Chi_Minh';
const TICK_MS = 60 * 1000;
const REFRESH_DAYS = 2;

function vietnamNow(date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(date).map((part) => [part.type, part.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function addDays(iso, delta) {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + delta);
    return date.toISOString().slice(0, 10);
}

/** { newDay: D-1, refreshDays: [D-2, D-3] } for a Vietnam business day D. */
function windowFor(day) {
    return { newDay: addDays(day, -1), refreshDays: Array.from({ length: REFRESH_DAYS }, (_, index) => addDays(day, -(index + 2))) };
}

function parseStart(text) {
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(text || '05:00').trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : 300;
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const conn = new sqlite3.Database(dbPath, (error) => {
            if (error) return reject(error);
            conn.exec('PRAGMA busy_timeout = 30000;', () => resolve(conn));
        });
    });
}
const allOn = (conn, sql, params = []) => new Promise((resolve, reject) => conn.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows))));
const runOn = (conn, sql, params = []) => new Promise((resolve, reject) => conn.run(sql, params, function onRun(error) { return error ? reject(error) : resolve({ lastID: this.lastID }); }));

class BfPhatScheduler {
    constructor({ env = process.env, clock = () => new Date(), logger = console, dbPath = path.resolve(__dirname, '../../db/database.sqlite'), importer = null, download = downloadDays } = {}) {
        this.env = env;
        this.clock = clock;
        this.logger = logger;
        this.dbPath = dbPath;
        this.importer = importer || new BfPhatImportService({ dbPath });
        this.download = download;
        this.timer = null;
        this.busy = false;
        this.attempts = new Map(); // business day -> { count, lastAt }
    }

    isEnabled() { return String(this.env.BF_PHAT_SCHEDULE_ENABLED ?? 'true').toLowerCase() !== 'false'; }
    retryMs() { return Number(this.env.BF_PHAT_RETRY_MS) > 0 ? Number(this.env.BF_PHAT_RETRY_MS) : 60 * 60 * 1000; }
    maxAttempts() { return Number(this.env.BF_PHAT_MAX_ATTEMPTS) > 0 ? Number(this.env.BF_PHAT_MAX_ATTEMPTS) : 12; }

    start() {
        if (!this.isEnabled()) { this.logger.log?.('[BF-PHAT] schedule off (BF_PHAT_SCHEDULE_ENABLED=false).'); return; }
        this.logger.log?.(`[BF-PHAT] schedule on: from ${this.env.BF_PHAT_SCHEDULE_START || '05:00'} Vietnam time, D-1 plus ${REFRESH_DAYS} refresh days, retry ${Math.round(this.retryMs() / 60000)} min.`);
        this.timer = setInterval(() => this.tick().catch((error) => this.logger.warn?.(`[BF-PHAT] tick failed: ${error.message}`)), TICK_MS);
        this.timer.unref?.();
        this.tick().catch(() => {});
    }

    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

    async doneToday(conn, newDay, today) {
        const rows = await allOn(conn,
            `SELECT 1 FROM import_log WHERE indicator = ? AND source_lane = ? AND ngay_do_kiem = ? AND status = 'SUCCESS'
             AND date(created_at, '+7 hours') = ? LIMIT 1`, [INDICATOR, LANE, newDay, today]);
        return rows.length > 0;
    }

    async tick() {
        if (this.busy || !this.isEnabled()) return null;
        const now = this.clock();
        const { day, minutes } = vietnamNow(now);
        if (minutes < parseStart(this.env.BF_PHAT_SCHEDULE_START)) return null;
        const { newDay, refreshDays } = windowFor(day);

        this.busy = true;
        const conn = await openDb(this.dbPath);
        try {
            if (await this.doneToday(conn, newDay, day)) return null;
            const attempt = this.attempts.get(day) || { count: 0, lastAt: 0 };
            if (attempt.count >= this.maxAttempts() || now.getTime() - attempt.lastAt < this.retryMs()) return null;
            this.attempts.set(day, { count: attempt.count + 1, lastAt: now.getTime() });
            return await this.runWindow(conn, { newDay, refreshDays, attemptNo: attempt.count + 1 });
        } finally {
            this.busy = false;
            await new Promise((resolve) => conn.close(resolve));
        }
    }

    async lastLoggedFile(conn, date) {
        const rows = await allOn(conn,
            `SELECT file_name FROM import_log WHERE indicator = ? AND source_lane = ? AND ngay_do_kiem = ? AND status = 'SUCCESS' ORDER BY id DESC LIMIT 1`,
            [INDICATOR, LANE, date]);
        return rows[0]?.file_name || null;
    }

    async logFailure(conn, date, message) {
        await insertImportLogRow({
            run: (sql, params) => runOn(conn, sql, params),
            all: (sql, params) => allOn(conn, sql, params),
            columns: ['file_name', 'ngay_do_kiem', 'indicator', 'source_lane', 'trigger_source', 'status', 'total_records', 'error_records', 'skipped_records'],
            values: [`SanLuongChiTiet_${ddmmyyyy(date)}.xlsx — ${message}`.slice(0, 250), date, INDICATOR, LANE, 'AUTO', 'FAILED', 0, 1, 0],
        });
    }

    async runWindow(conn, { newDay, refreshDays, attemptNo }) {
        const dates = [newDay, ...refreshDays];
        const dl = await this.download(dates);
        if (dl.code !== 0) this.logger.warn?.(`[BF-PHAT] WinSCP exit ${dl.code} (attempt ${attemptNo}); importing whatever arrived.`);

        const localDir = path.join(process.env.BF_PHAT_LOCAL_ROOT || DEFAULT_LOCAL_ROOT, newDay.slice(0, 4));
        let files = [];
        try { files = pickDailyFiles(localDir); } catch (_) { files = []; }
        const byDate = new Map(files.map((file) => [file.date, file]));
        const summary = [];

        const newFile = byDate.get(newDay);
        if (!newFile) {
            await this.logFailure(conn, newDay, dl.code !== 0 ? 'không tải được từ WinSCP' : 'file chưa có trên máy chủ');
            summary.push(`${newDay}=NO_FILE`);
        } else {
            const result = await this.importer.importFile(newFile.path, { actor: 'bf-phat-scheduler', trigger: 'AUTO' });
            summary.push(`${newDay}=${result.status}`);
        }
        for (const date of refreshDays) {
            const file = byDate.get(date);
            if (!file) continue;
            if ((await this.lastLoggedFile(conn, date)) === file.name) continue; // unchanged
            const result = await this.importer.importFile(file.path, { actor: 'bf-phat-scheduler', trigger: 'AUTO' });
            summary.push(`${date}=${result.status}`);
        }
        this.logger.log?.(`[BF-PHAT] attempt ${attemptNo}: ${summary.join(', ')}`);
        return summary;
    }
}

module.exports = { BfPhatScheduler, windowFor, vietnamNow, parseStart };
