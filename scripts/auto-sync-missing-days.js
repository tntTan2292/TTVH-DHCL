#!/usr/bin/env node
'use strict';

/**
 * Unattended supervisor for the existing Auto Backfill queue (F1.3, F4.1, F1.1; HUE and TCT lanes).
 *
 * It does NOT download anything itself: it signs in to the QIS backend as admin, asks for one unscoped
 * Auto Backfill run (the same as the "Bù dữ liệu tự động" button), watches it, and keeps going until no
 * missing day is left. Every safety rule of the queue stays in force (verified adapters, reconciliation,
 * circuit breakers, one Portal job at a time).
 *
 * Needs: the backend running, and HUE / TCT already signed in by hand in the DKCL windows.
 * It cannot sign in to the portals for you: when a portal session expires the queue stops with
 * WAITING_AUTH; the script rings, logs it, and tries "Resume" every few minutes, so a manual re-login
 * is enough to let it continue.
 *
 * Usage: node scripts/auto-sync-missing-days.js [--dry] [--watch] [--indicator F1.3] [--lane HUE]
 *        (see --help). Password: env QIS_ADMIN_PASSWORD, otherwise a hidden prompt.
 */

const fs = require('node:fs');
const path = require('node:path');

const OPEN_STATUSES = 'RUNNING,PAUSING,PAUSED';
const REQUEST_TIMEOUT_MS = 60000;
const HEARTBEAT_MS = 10 * 60000;
const IDLE_CHECK_MS = Number(process.env.QIS_SYNC_IDLE_CHECK_MS) || 2 * 60000;

function parseArgs(argv) {
    const options = {
        base: process.env.QIS_BACKEND_URL || 'http://127.0.0.1:5050',
        user: process.env.QIS_ADMIN_USERNAME || 'admin',
        indicator: null,
        lane: null,
        pollSeconds: 30,
        authRetryMinutes: 5,
        authGiveUpHours: 8,
        circuitWaitMinutes: 10,
        maxCircuitResets: 3,
        maxStagnantRuns: 2,
        stallWarnMinutes: 45,
        stallGiveUpHours: 3,
        watchMinutes: 0,
        dry: false,
        help: false,
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = () => argv[++i];
        if (arg === '--dry') options.dry = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg === '--watch') options.watchMinutes = 60;
        else if (arg === '--watch-minutes') options.watchMinutes = Number(next());
        else if (arg === '--base') options.base = next();
        else if (arg === '--user') options.user = next();
        else if (arg === '--indicator') options.indicator = next();
        else if (arg === '--lane') options.lane = next();
        else if (arg === '--poll-seconds') options.pollSeconds = Number(next());
        else if (arg === '--auth-retry-minutes') options.authRetryMinutes = Number(next());
        else if (arg === '--auth-give-up-hours') options.authGiveUpHours = Number(next());
        else if (arg === '--circuit-wait-minutes') options.circuitWaitMinutes = Number(next());
        else if (arg === '--max-circuit-resets') options.maxCircuitResets = Number(next());
        else if (arg === '--max-stagnant-runs') options.maxStagnantRuns = Number(next());
        else throw new Error(`Unknown argument: ${arg}`);
    }
    options.base = String(options.base).replace(/\/+$/, '');
    return options;
}

const HELP = `Auto-sync missing days (F1.3 / F4.1 / F1.1, HUE + TCT)

  --dry                      sign in and show the coverage only, start nothing
  --watch                    after finishing, check again every 60 minutes (new days, 3-day F1.1 refresh)
  --watch-minutes N          same, every N minutes
  --indicator CODE           limit to one indicator (F1.3, F4.1, F1.1)
  --lane HUE|TCT             limit to one source lane
  --base URL                 backend address (default http://127.0.0.1:5050)
  --user NAME                admin user (default admin); password: env QIS_ADMIN_PASSWORD or prompt
  --poll-seconds N           progress check interval (default 30)
  --auth-retry-minutes N     while a portal session is expired, try Resume every N minutes (default 5)
  --auth-give-up-hours N     stop waiting for a re-login after N hours (default 8)
  --circuit-wait-minutes N   wait before resetting an open circuit (default 10)
  --max-circuit-resets N     circuit resets allowed per run (default 3)
  --max-stagnant-runs N      stop when N consecutive runs leave the missing count unchanged (default 2)
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function timestamp() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function createLogger(logFile) {
    return (message) => {
        const line = `[${timestamp()}] ${message}`;
        console.log(line);
        try { fs.appendFileSync(logFile, `${line}\n`); } catch { /* console output is enough */ }
    };
}

function promptHidden(question) {
    return new Promise((resolve, reject) => {
        if (!process.stdin.isTTY) {
            reject(new Error('No password: set QIS_ADMIN_PASSWORD or run from an interactive terminal.'));
            return;
        }
        process.stdout.write(question);
        let value = '';
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const onData = (chunk) => {
            for (const char of chunk) {
                if (char === '\r' || char === '\n') {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.off('data', onData);
                    process.stdout.write('\n');
                    resolve(value);
                    return;
                }
                if (char === '\u0003') process.exit(130);
                if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
                else value += char;
            }
        };
        process.stdin.on('data', onData);
    });
}

class QisClient {
    constructor({ base, user, password, log }) {
        Object.assign(this, { base, user, password, log, sessionId: null });
    }

    async login() {
        const response = await fetch(`${this.base}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: this.user, password: this.password }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.success) {
            throw new Error(`Login failed (${response.status}): ${body.error?.message || 'unknown error'}`);
        }
        this.sessionId = body.data.session_id;
        this.log(`Signed in as ${body.data.user.username} (${body.data.user.role}).`);
    }

    /** One request with re-login on 401 and a few retries while the backend is unreachable. */
    async call(method, route, payload) {
        let networkFailures = 0;
        for (;;) {
            let response;
            let body;
            try {
                // A request must never hang forever (a backend restart can leave a half-open connection).
                response = await fetch(`${this.base}/api${route}`, {
                    method,
                    headers: { 'content-type': 'application/json', 'x-session-id': this.sessionId || '' },
                    body: payload === undefined ? undefined : JSON.stringify(payload),
                    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                });
                body = await response.json().catch((error) => {
                    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw error;
                    return {};
                });
            } catch (error) {
                networkFailures += 1;
                if (networkFailures > 20) throw new Error(`Backend unreachable for too long: ${error.message}`);
                this.log(`Backend not reachable (${error.message}); retrying in 30 s [${networkFailures}/20].`);
                await sleep(30000);
                continue;
            }
            if (response.status === 401) {
                this.log('Session expired; signing in again.');
                await this.login();
                continue;
            }
            if (!response.ok || body.success === false) {
                const error = new Error(body.error?.message || `HTTP ${response.status}`);
                error.code = body.error?.code || `HTTP_${response.status}`;
                error.status = response.status;
                throw error;
            }
            return body.data;
        }
    }
}

const coverageQuery = (options) => {
    const params = new URLSearchParams();
    if (options.indicator) params.set('indicator', options.indicator);
    if (options.lane) params.set('lane', options.lane);
    const text = params.toString();
    return `/import/auto-backfill/coverage${text ? `?${text}` : ''}`;
};

function describeCoverage(coverage) {
    const lines = (coverage.lanes || []).map((lane) => {
        const c = lane.counts || {};
        return `  ${lane.indicator}/${lane.source_lane} [${lane.automation_mode}]: đã xong ${c.COMPLETED || 0}, chưa xong ${c.INCOMPLETE || 0}, lỗi dữ liệu ${c.DATA_ERROR || 0}, loại trừ ${c.EXCLUDED || 0}`;
    });
    return `Coverage as of ${coverage.as_of_business_date}: ${coverage.runnable_portal_jobs} day(s) runnable.\n${lines.join('\n')}`;
}

/**
 * Watches EVERY open run (the UI creates one run per day, so there can be dozens) until none is left
 * running. Runs parked in WAITING_AUTH are resumed (the backend re-validates the portal session first);
 * open circuits are reset after a cooldown. Returns 'IDLE' or a stop reason.
 */
async function superviseOpenRuns(client, options, log) {
    let lastSummary = '';
    let authSince = null;
    let lastResumeAttempt = 0;
    let circuitSince = null;
    const circuitResets = new Map();
    let lastChangeAt = Date.now();
    let lastLogAt = Date.now();
    let idleSince = null;
    let stallWarned = false;
    for (;;) {
        const listing = await client.call('GET', `/import/auto-backfill/runs?status=${OPEN_STATUSES}&limit=200`);
        const entries = listing.runs || [];
        const active = entries.filter((entry) => entry.run.status === 'RUNNING' || entry.run.status === 'PAUSING');
        if (active.length === 0) {
            if (entries.length > 0) log(`${entries.length} run đang ở trạng thái PAUSED (do người dùng); script không tự tiếp tục chúng.`);
            return 'IDLE';
        }

        const totals = {};
        for (const entry of active) {
            for (const [state, n] of Object.entries(entry.jobCountsByState || {})) totals[state] = (totals[state] || 0) + n;
        }
        const waiting = active.filter((entry) => entry.run.safety_state === 'WAITING_AUTH');
        let circuits = active.filter((entry) => entry.run.safety_state === 'CIRCUIT_OPEN');

        // After a backend restart the run-level flag can be cleared while the jobs stay parked in
        // CIRCUIT_OPEN, which neither the screen nor the check above can see. If nothing is running although
        // jobs are queued, look at the jobs themselves.
        const idle = !totals.RUNNING && (totals.QUEUED || 0) > 0 && waiting.length === 0;
        if (!idle) idleSince = null;
        else if (!idleSince) idleSince = Date.now();
        if (idle && circuits.length === 0 && Date.now() - idleSince > IDLE_CHECK_MS) {
            for (const entry of active) {
                const detail = await client.call('GET', `/import/auto-backfill/runs/${encodeURIComponent(entry.run.id)}`);
                if (detail.jobs.some((job) => job.state === 'QUEUED' && job.safety_state === 'CIRCUIT_OPEN')) {
                    circuits.push(entry);
                    circuitSince = Date.now() - options.circuitWaitMinutes * 60000; // it has been parked long enough
                }
            }
            if (circuits.length) log(`Hàng đợi đứng yên: ${circuits.length} run có job bị mạch ngắt giữ lại (cờ mạch ở mức run đã bị xóa).`);
        }
        const summary = `${active.length} run mở | job ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(' ')}${waiting.length ? ` | chờ đăng nhập=${waiting.length}` : ''}${circuits.length ? ` | mạch mở=${circuits.length}` : ''}`;
        if (summary !== lastSummary) { log(summary); lastSummary = summary; lastChangeAt = Date.now(); lastLogAt = Date.now(); stallWarned = false; }
        else if (Date.now() - lastLogAt > HEARTBEAT_MS) { log(`(vẫn theo dõi) ${summary}`); lastLogAt = Date.now(); }

        const integrity = active.find((entry) => entry.run.safety_state === 'BLOCKED_INTEGRITY');
        if (integrity) {
            process.stdout.write('\x07');
            log(`DỪNG: toàn vẹn dữ liệu bị chặn ở run ${integrity.run.id} (${integrity.run.status_reason || 'BLOCKED_INTEGRITY'}). ${integrity.run.action_required || ''} Không tự thử lại.`);
            return 'BLOCKED_INTEGRITY';
        }

        if (waiting.length > 0) {
            if (!authSince) {
                authSince = Date.now();
                lastResumeAttempt = 0;
                process.stdout.write('\x07\x07\x07');
                log('CẦN ĐĂNG NHẬP LẠI: phiên HUE hoặc TCT đã hết hạn. Nếu "Tiếp tục" không được, hãy đăng nhập tay vào cửa sổ DKCL; script tự thử lại mỗi vài phút.');
            }
            if (Date.now() - authSince > options.authGiveUpHours * 3600000) {
                log(`Bỏ cuộc: chờ đăng nhập lại quá ${options.authGiveUpHours} giờ.`);
                return 'AUTH_TIMEOUT';
            }
            if (Date.now() - lastResumeAttempt >= options.authRetryMinutes * 60000) {
                lastResumeAttempt = Date.now();
                let resumed = 0;
                let lastError = null;
                for (const entry of waiting) {
                    try {
                        await client.call('POST', `/import/auto-backfill/runs/${encodeURIComponent(entry.run.id)}/resume`);
                        resumed += 1;
                    } catch (error) { lastError = error; }
                }
                if (resumed > 0) { log(`Đã Resume ${resumed}/${waiting.length} run chờ đăng nhập.`); authSince = null; }
                if (lastError) log(`Resume chưa được ${waiting.length - resumed} run (${lastError.code}: ${lastError.message}); thử lại sau ${options.authRetryMinutes} phút.`);
            }
        } else {
            authSince = null;
        }

        if (circuits.length > 0) {
            if (!circuitSince) {
                circuitSince = Date.now();
                log(`Mạch ngắt (circuit) đã mở ở ${circuits.length} run: ${circuits[0].run.action_required || ''} Chờ ${options.circuitWaitMinutes} phút rồi reset.`);
            }
            if (Date.now() - circuitSince >= options.circuitWaitMinutes * 60000) {
                circuitSince = null;
                for (const entry of circuits) {
                    const used = circuitResets.get(entry.run.id) || 0;
                    if (used >= options.maxCircuitResets) {
                        process.stdout.write('\x07');
                        log(`Bỏ cuộc: mạch ngắt của run ${entry.run.id} đã reset ${used} lần mà vẫn mở lại. Cần xem nhật ký lỗi.`);
                        return 'CIRCUIT_EXHAUSTED';
                    }
                    circuitResets.set(entry.run.id, used + 1);
                    try {
                        await client.call('POST', `/import/auto-backfill/runs/${encodeURIComponent(entry.run.id)}/circuit/reset`);
                        log(`Đã reset mạch ngắt run ${entry.run.id} (${used + 1}/${options.maxCircuitResets}).`);
                    } catch (error) { log(`Reset mạch ngắt không được: ${error.code}: ${error.message}`); }
                }
            }
        } else {
            circuitSince = null;
        }

        const quiet = Date.now() - lastChangeAt;
        if (!waiting.length && !circuits.length && quiet > options.stallWarnMinutes * 60000 && !stallWarned) {
            stallWarned = true;
            process.stdout.write('\x07');
            log(`Cảnh báo: ${options.stallWarnMinutes} phút không có thay đổi nào ở hàng đợi (có thể một ngày tải rất chậm hoặc backend bị treo).`);
        }
        if (quiet > options.stallGiveUpHours * 3600000) {
            log(`Bỏ cuộc: hàng đợi không thay đổi suốt ${options.stallGiveUpHours} giờ.`);
            return 'STALLED';
        }
        await sleep(options.pollSeconds * 1000);
    }
}

function failedJobsText(jobs) {
    const failed = jobs.filter((job) => job.state === 'FAILED_TERMINAL');
    if (failed.length === 0) return '';
    return failed.map((job) => `  ${job.indicator}/${job.source_lane} ${job.business_date}: ${job.terminal_reason || '?'} ${job.action_required ? `- ${job.action_required}` : ''}`).join('\n');
}

async function syncOnce(client, options, log, state) {
    const coverage = await client.call('GET', coverageQuery(options));
    log(describeCoverage(coverage));
    const open = await client.call('GET', `/import/auto-backfill/runs?status=${OPEN_STATUSES}&limit=200`);
    if (options.dry) {
        log(`${(open.runs || []).length} run đang mở trong hàng đợi.`);
        return { done: true };
    }

    // 1. Finish whatever is already queued (e.g. runs started from the Import screen).
    if ((open.runs || []).length > 0) {
        log(`Có ${open.runs.length} run đang mở; xử lý chúng trước khi tạo run mới.`);
        const outcome = await superviseOpenRuns(client, options, log);
        if (outcome !== 'IDLE') return { done: true, stopped: outcome };
        return { done: false };
    }

    // 2. Plan the remaining missing days in one run.
    let runId;
    try {
        const created = await client.call('POST', '/import/auto-backfill/runs', {
            indicator: options.indicator || undefined,
            lane: options.lane || undefined,
        });
        runId = created.run.id;
        log(`Đã tạo run ${runId}: ${created.jobs.length} job.`);
    } catch (error) {
        if (error.code === 'AUTO_BACKFILL_NO_EXECUTABLE_COVERAGE') {
            log('Không còn ngày nào cần bù (hoặc phần còn lại là MANUAL_ONLY / ngày nghỉ).');
            return { done: true };
        }
        throw error;
    }

    const outcome = await superviseOpenRuns(client, options, log);
    const detail = await client.call('GET', `/import/auto-backfill/runs/${encodeURIComponent(runId)}`);
    const failed = failedJobsText(detail.jobs);
    log(`Kết thúc run ${runId}: ${detail.run.status}.${failed ? `\nJob lỗi:\n${failed}` : ''}`);
    if (outcome !== 'IDLE') return { done: true, stopped: outcome };

    const after = await client.call('GET', coverageQuery(options));
    const remaining = after.runnable_portal_jobs;
    log(`Còn ${remaining} ngày chưa xong sau run này.`);
    if (remaining === 0) return { done: true };
    state.stagnantRuns = state.lastRemaining !== null && remaining >= state.lastRemaining ? state.stagnantRuns + 1 : 0;
    state.lastRemaining = remaining;
    if (state.stagnantRuns >= options.maxStagnantRuns) {
        process.stdout.write('\x07');
        log(`Dừng: ${state.stagnantRuns} run liên tiếp không làm giảm số ngày còn thiếu (${remaining}). Xem job lỗi ở trên.`);
        return { done: true, stopped: 'NO_PROGRESS' };
    }
    return { done: false };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log(HELP); return 0; }

    const logDir = path.join(__dirname, '..', 'portal-downloads', 'auto-sync-logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, `auto-sync-${new Date().toISOString().slice(0, 10)}.log`);
    const log = createLogger(logFile);
    log(`Auto-sync started${options.dry ? ' (DRY: no run will be created)' : ''}; backend ${options.base}; log ${logFile}`);

    const password = process.env.QIS_ADMIN_PASSWORD || await promptHidden(`Mật khẩu QIS của "${options.user}": `);
    const client = new QisClient({ base: options.base, user: options.user, password, log });
    await client.login();

    const state = { lastRemaining: null, stagnantRuns: 0 };
    for (;;) {
        const result = await syncOnce(client, options, log, state);
        if (result.stopped) {
            log(`Script dừng với trạng thái ${result.stopped}.`);
            return 2;
        }
        if (result.done) {
            if (options.watchMinutes > 0 && !options.dry) {
                log(`Xong. Kiểm tra lại sau ${options.watchMinutes} phút (--watch).`);
                state.lastRemaining = null;
                state.stagnantRuns = 0;
                await sleep(options.watchMinutes * 60000);
                continue;
            }
            log('Hoàn tất.');
            return 0;
        }
    }
}

if (require.main === module) {
    main().then((code) => process.exit(code)).catch((error) => {
        console.error(`[${timestamp()}] FATAL: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { parseArgs, superviseOpenRuns, syncOnce, QisClient };
