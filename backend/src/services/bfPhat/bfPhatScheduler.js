/**
 * BF-PHAT-IMPORT-01 -- daily N-1 load of the delivery BatchFile.
 *
 * From BF_PHAT_SCHEDULE_START (Vietnam time, default 05:00 -- the server writes the file for D-1 at about 04:00) a tick
 * every minute checks whether D-1 has a SUCCESS BF-PHAT import_log row written today. If not, one sync pass lists the
 * server folder, downloads D-1 and any earlier day whose file was re-exported bigger (TCT corrects old days), deletes the
 * superseded local file so a day keeps one file, and imports the changed days. There is no fixed refresh window: an
 * unchanged old day is never touched. A failure (file not there yet, WinSCP down, bad file) is written to import_log
 * as FAILED and retried after BF_PHAT_RETRY_MS (default 1 h) until BF_PHAT_MAX_ATTEMPTS (default 12).
 * Off with BF_PHAT_SCHEDULE_ENABLED=false.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { BfPhatImportService, INDICATOR, LANE } = require('./bfPhatImportService');
const { syncChangedDays } = require('./bfPhatSync');
const { listRemote, downloadFiles, ddmmyyyy } = require('./bfPhatWinscpService');
const { insertImportLogRow } = require('../importLogAudit');

const TZ = 'Asia/Ho_Chi_Minh';
const TICK_MS = 60 * 1000;

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

/** { newDay: D-1 } for a Vietnam business day D. */
function windowFor(day) {
    return { newDay: addDays(day, -1) };
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
    constructor({ env = process.env, clock = () => new Date(), logger = console, dbPath = path.resolve(__dirname, '../../db/database.sqlite'), importer = null, list = listRemote, downloadFiles: download = downloadFiles } = {}) {
        this.env = env;
        this.clock = clock;
        this.logger = logger;
        this.dbPath = dbPath;
        this.importer = importer || new BfPhatImportService({ dbPath });
        this.list = list;
        this.downloadFiles = download;
        this.timer = null;
        this.busy = false;
        this.attempts = new Map(); // business day -> { count, lastAt }
    }

    isEnabled() { return String(this.env.BF_PHAT_SCHEDULE_ENABLED ?? 'true').toLowerCase() !== 'false'; }
    retryMs() { return Number(this.env.BF_PHAT_RETRY_MS) > 0 ? Number(this.env.BF_PHAT_RETRY_MS) : 60 * 60 * 1000; }
    maxAttempts() { return Number(this.env.BF_PHAT_MAX_ATTEMPTS) > 0 ? Number(this.env.BF_PHAT_MAX_ATTEMPTS) : 12; }

    start() {
        if (!this.isEnabled()) { this.logger.log?.('[BF-PHAT] schedule off (BF_PHAT_SCHEDULE_ENABLED=false).'); return; }
        this.logger.log?.(`[BF-PHAT] schedule on: from ${this.env.BF_PHAT_SCHEDULE_START || '05:00'} Vietnam time, D-1 plus any re-exported older day, retry ${Math.round(this.retryMs() / 60000)} min.`);
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
        const { newDay } = windowFor(day);

        this.busy = true;
        const conn = await openDb(this.dbPath);
        try {
            if (await this.doneToday(conn, newDay, day)) return null;
            const attempt = this.attempts.get(day) || { count: 0, lastAt: 0 };
            if (attempt.count >= this.maxAttempts() || now.getTime() - attempt.lastAt < this.retryMs()) return null;
            this.attempts.set(day, { count: attempt.count + 1, lastAt: now.getTime() });
            return await this.runWindow(conn, { newDay, attemptNo: attempt.count + 1 });
        } finally {
            this.busy = false;
            await new Promise((resolve) => conn.close(resolve));
        }
    }

    async logFailure(conn, date, message) {
        await insertImportLogRow({
            run: (sql, params) => runOn(conn, sql, params),
            all: (sql, params) => allOn(conn, sql, params),
            columns: ['file_name', 'ngay_do_kiem', 'indicator', 'source_lane', 'trigger_source', 'status', 'total_records', 'error_records', 'skipped_records'],
            values: [`SanLuongChiTiet_${ddmmyyyy(date)}.xlsx — ${message}`.slice(0, 250), date, INDICATOR, LANE, 'AUTO', 'FAILED', 0, 1, 0],
        });
    }

    /**
     * One pass: the new day D-1 plus any earlier day whose file was re-exported bigger (downloaded, the old local file
     * deleted, the day imported again). No fixed refresh window: an unchanged old day is never touched.
     */
    async runWindow(conn, { newDay, attemptNo }) {
        const sync = await syncChangedDays({
            toDate: newDay, importer: this.importer, list: this.list, download: this.downloadFiles,
            actor: 'bf-phat-scheduler', trigger: 'AUTO', logger: this.logger,
        });
        const summary = sync.results.map((result) => `${result.date}=${result.status}${result.reason === 'CHANGED' ? '(đổi)' : ''}`);
        if (sync.errors.length) {
            await this.logFailure(conn, newDay, sync.errors.join('; '));
            summary.push(...sync.errors);
        } else if (!sync.results.some((result) => result.date === newDay && result.status === 'SUCCESS')) {
            const loaded = await allOn(conn, 'SELECT 1 FROM fact_bf_phat WHERE ngay_bf = ? LIMIT 1', [newDay]);
            if (loaded.length === 0 || !sync.newDayOnServer) {
                await this.logFailure(conn, newDay, sync.newDayOnServer ? 'chưa nạp được' : 'file chưa có trên máy chủ');
                summary.push(`${newDay}=NO_FILE`);
            }
        }
        this.logger.log?.(`[BF-PHAT] attempt ${attemptNo}: ${summary.join(', ') || 'không có gì thay đổi'}`);
        return summary;
    }
}

module.exports = { BfPhatScheduler, windowFor, vietnamNow, parseStart };
