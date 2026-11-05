'use strict';

// F13-WHY-AGG-01 Phase 3: background refresh of f13_cause_parcel after imports (Design of Record section 8).
//  - OFF by default behind ONE switch (env QIS_F13_CAUSE_REFRESH=on): with it off the import hook and the startup resume do nothing at all,
//    so the backend never writes f13_cause_parcel on its own until P4 and the PO's agreement (Opus rule).
//  - The builder runs on its OWN writer connection with busy_timeout, never the shared config/db one (P1-R1).
//  - An import of source day X marks X-5..X+10 (BF Phát: X-6..X+10); the bounds come from JourneyService's constants.
//  - Bursts of imports are merged into one pending range and one run; a request during a run joins it (CauseAggBuilder.run).

const { DAYS_BEFORE, DAYS_AFTER, BF_EXTRA_DAYS, shiftIsoDate } = require('./JourneyService');
const { CauseAggBuilder } = require('./CauseAggBuilder');

const SWITCH_ENV = 'QIS_F13_CAUSE_REFRESH';
const BUSY_TIMEOUT_MS = 60000;
const DEFAULT_DEBOUNCE_MS = 5000;
const DEFAULT_RESUME_DAYS = 45;
const QUIET_POLL_MS = 2000;
const QUIET_MAX_WAIT_MS = 10 * 60 * 1000;

// Source tables whose import can change a day (F1.3, F4.1, F4.2, F1.1 + BF Phát lot numbers).
const SOURCE_TABLES = Object.freeze(['fact_f13', 'fact_f41', 'fact_f42', 'fact_f11', 'fact_bf_phat']);

function isEnabled(env = process.env) {
    return ['on', '1', 'true', 'yes'].includes(String(env[SWITCH_ENV] || 'off').trim().toLowerCase());
}

/** Days D whose rows can change when source day X is imported: X-DAYS_AFTER .. X+DAYS_BEFORE (BF Phát one more day before). */
function affectedRange(sourceDay, table) {
    const before = DAYS_AFTER + (table === 'fact_bf_phat' ? BF_EXTRA_DAYS : 0);
    return { from: shiftIsoDate(sourceDay, -before), to: shiftIsoDate(sourceDay, DAYS_BEFORE) };
}

/** Opens the builder's own writer connection: a separate sqlite3 Database with busy_timeout (P1-R1). */
function openWriter(dbPath, sqlite3 = require('sqlite3')) {
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database(dbPath, (error) => {
            if (error) return reject(error);
            return database.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}; PRAGMA cache_size = -65536;`, (pragmaError) => (pragmaError ? reject(pragmaError) : resolve(database)));
        });
    });
}

class CauseRefresh {
    /**
     * @param {object} options
     *   dbPath         file the writer connection opens (default: the database config/db is on)
     *   sharedDb       the shared config/db connection (default: required lazily); the writer must never be it
     *   openWriterFn   (dbPath) => Promise<sqlite3.Database>
     *   makeBuilder    ({ writer, quietGate }) => CauseAggBuilder (tests inject)
     *   isImportActive () => boolean (default: config/db txState.active > 0)
     */
    constructor({ dbPath = null, sharedDb = null, openWriterFn = openWriter, makeBuilder = null, isImportActive = null, env = process.env,
        debounceMs = DEFAULT_DEBOUNCE_MS, resumeDays = DEFAULT_RESUME_DAYS, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        now = () => new Date(), logger = console } = {}) {
        this.dbPath = dbPath;
        this.sharedDb = sharedDb;
        this.openWriterFn = openWriterFn;
        this.makeBuilder = makeBuilder;
        this.isImportActiveFn = isImportActive;
        this.env = env;
        this.debounceMs = debounceMs;
        this.resumeDays = resumeDays;
        this.sleep = sleep;
        this.now = now;
        this.logger = logger;
        this.writer = null;
        this.builder = null;
        this.pending = null;
        this.timer = null;
        this.lastRun = null;
        this.idle = Promise.resolve();
    }

    isEnabled() {
        return isEnabled(this.env);
    }

    _shared() {
        if (this.sharedDb) return { db: this.sharedDb, dbPath: this.dbPath };
        const shared = require('../../config/db');
        return { db: shared.db, dbPath: this.dbPath || shared.dbPath, txState: shared.txState };
    }

    _importActive() {
        if (this.isImportActiveFn) return Boolean(this.isImportActiveFn());
        const { txState } = this._shared();
        return Boolean(txState && txState.active > 0);
    }

    async _quietGate() {
        const started = Date.now();
        while (this._importActive() && Date.now() - started < QUIET_MAX_WAIT_MS) await this.sleep(QUIET_POLL_MS);
    }

    /** The builder on its own writer connection (opened once, on first use). */
    async _ensureBuilder() {
        if (this.builder) return this.builder;
        const { db: shared, dbPath } = this._shared();
        const writer = await this.openWriterFn(dbPath);
        if (writer === shared) throw new Error('CauseRefresh: the builder must not use the shared config/db connection (P1-R1)');
        this.writer = writer;
        if (this.makeBuilder) this.builder = this.makeBuilder({ writer, quietGate: () => this._quietGate() });
        else {
            const { JourneyService } = require('./JourneyService');
            const { F13JourneyRepository } = require('../../repositories/F13JourneyRepository');
            this.builder = new CauseAggBuilder({
                db: writer,
                journeyService: new JourneyService({ repository: new F13JourneyRepository() }), // reads on the shared connection (read only)
                quietGate: () => this._quietGate(),
                logger: this.logger,
            });
        }
        return this.builder;
    }

    /**
     * Import hook: call after the import COMMIT. Never throws and never blocks the import. With the switch off it returns at once and
     * touches nothing (no connection, no write). Otherwise it merges the affected range into the pending one and schedules one run.
     */
    afterImport({ table, date }) {
        if (!this.isEnabled()) return { enqueued: false, reason: 'DISABLED' };
        if (!SOURCE_TABLES.includes(table) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { enqueued: false, reason: 'IGNORED' };
        const range = affectedRange(date, table);
        this.pending = this.pending
            ? { from: this.pending.from < range.from ? this.pending.from : range.from, to: this.pending.to > range.to ? this.pending.to : range.to, sources: this.pending.sources + 1 }
            : { ...range, sources: 1 };
        if (!this.timer) {
            this.timer = setTimeout(() => { this.timer = null; this.idle = this.flush().catch((error) => this.logger.error(`[f13-cause] refresh failed: ${error.message}`)); }, this.debounceMs);
            this.timer.unref?.();
        }
        return { enqueued: true, ...range };
    }

    /** Starts the run for the merged pending range now (tests and the timer call it). */
    async flush() {
        const range = this.pending;
        this.pending = null;
        if (!range) return null;
        const builder = await this._ensureBuilder();
        const marked = await builder.markStale(range.from, range.to, 'IMPORT_PENDING');
        this.logger.log(`[f13-cause] import marks ${range.from}..${range.to} (${marked} day(s) set STALE, ${range.sources} source import(s))`);
        this.lastRun = await builder.run({ from: range.from, to: range.to, mode: 'build', trigger: 'import' });
        return this.lastRun;
    }

    /**
     * Startup resume: builds the missing and stale days of the last `resumeDays` days (and of any day still not FRESH). Does nothing when the
     * switch is off. Not awaited by the caller.
     */
    async resumeOnStartup() {
        if (!this.isEnabled()) return { started: false, reason: 'DISABLED' };
        const builder = await this._ensureBuilder();
        const to = this.now().toISOString().slice(0, 10);
        let from = shiftIsoDate(to, -this.resumeDays);
        const oldest = await builder.db.get("SELECT MIN(ngay_do_kiem) AS d FROM f13_cause_day WHERE state <> 'FRESH'");
        if (oldest && oldest.d && oldest.d < from) from = oldest.d;
        this.lastRun = await builder.run({ from, to, mode: 'build', trigger: 'startup' });
        return { started: true, from, to, ...this.lastRun };
    }

    async close() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        await this.idle.catch(() => {});
        if (this.writer) await new Promise((resolve) => this.writer.close(() => resolve()));
        this.writer = null;
        this.builder = null;
    }
}

let singleton = null;
function getCauseRefresh() {
    if (!singleton) singleton = new CauseRefresh();
    return singleton;
}

/** Fire-and-forget hook for the import code paths: safe to call with the switch off, never throws. */
function notifySourceImported(table, date) {
    try {
        if (!isEnabled()) return { enqueued: false, reason: 'DISABLED' };
        return getCauseRefresh().afterImport({ table, date });
    } catch (error) {
        console.error(`[f13-cause] hook failed (import not affected): ${error.message}`);
        return { enqueued: false, reason: 'ERROR' };
    }
}

module.exports = { CauseRefresh, SWITCH_ENV, SOURCE_TABLES, isEnabled, affectedRange, openWriter, getCauseRefresh, notifySourceImported };
