'use strict';

const fs = require('fs');
const path = require('path');
const { all, get } = require('../config/db');
const { executeImport, BASE_INCOMING } = require('../services/importPipeline');
const { getIndicatorConfig, normalizeIndicator, normalizeLane } = require('../services/importIndicatorRegistry');
const { presentImportHistoryRow } = require('../services/importHistoryPresenter');
const { runWithImportContext, IMPORT_MODES, AUDIT_COLUMNS } = require('../services/importLogAudit');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const vnTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
});

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const ALLOWED_PAGE_SIZES = [20, 50, 100];

function resolveIncomingDir(indicator, source) {
    const indicatorConfig = getIndicatorConfig(normalizeIndicator(indicator || 'F1.3'));
    const subDir = normalizeLane(source || 'HUE');
    const incomingDir = path.join(indicatorConfig.incomingDir, subDir);
    ensureDir(incomingDir);
    return incomingDir;
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolvePagination(query = {}) {
    const page = parsePositiveInt(query.page, 1);
    const requestedPageSize = parsePositiveInt(query.pageSize, 20);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 20;

    return { page, pageSize };
}

function normalizeSqliteUtcTimestamp(value) {
    if (!value) return null;
    const raw = String(value).trim();

    if (!raw) return null;
    if (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) {
        return new Date(raw).toISOString();
    }

    return new Date(`${raw.replace(' ', 'T')}Z`).toISOString();
}

function buildStatusPayload({ rows, summary, pagination, lastImport }) {
    const successCount = Number(summary?.successCount || 0);
    const failCount = Number(summary?.failCount || 0);

    return {
        pendingCount: 0,
        successCount,
        failCount,
        lastImport: normalizeSqliteUtcTimestamp(lastImport?.created_at),
        recentLogs: rows.map((row) => ({
            ...presentImportHistoryRow(row),
            id: row.id,
            ngay_import: normalizeSqliteUtcTimestamp(row.created_at),
            ten_file: row.file_name,
            ngay_so_lieu: row.ngay_do_kiem,
            so_luong_bg: row.total_records,
            so_bi_bo_qua: row.skipped_records,
            so_loi: row.error_records,
            trang_thai: row.status
        })),
        pagination
    };
}

function getSafeImportErrorMessage(error) {
    const message = error?.message || '';

    if (message.includes('Invalid filename format')) {
        return 'Tên file không hợp lệ. Vui lòng dùng đúng định dạng F1.3-YYYY.MM.DD.xlsx.';
    }

    if (message.includes('Required column')) {
        return 'File Excel không đúng mẫu. Không tìm thấy cột bắt buộc Số hiệu bưu gửi.';
    }

    if (message.includes('File already processed') || message.includes('does not exist')) {
        return 'Không tìm thấy file cần import. Vui lòng thử tải lại file.';
    }

    return message || 'Nạp dữ liệu thất bại. Vui lòng kiểm tra file và thử lại.';
}

class ImportController {
    async upload(req, res) {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_FILE', message: 'Vui lòng chọn file .xlsx để tải lên.' }
            });
        }

        const indicator = normalizeIndicator(req.body?.indicator || 'F1.3');
        const lane = normalizeLane(req.body?.source || 'HUE');
        const sourceDir = resolveIncomingDir(indicator, lane);
        const tmpPath = path.join(sourceDir, file.originalname);
        fs.writeFileSync(tmpPath, file.buffer);

        try {
            const forceReimport = req.query.force === 'true';
            // IMPORT-LOG-AUDIT-01: the import_log row records who uploaded the file and how.
            const result = await runWithImportContext(
                {
                    actor: req.auth?.user?.username || req.auth?.user?.id || null,
                    importMode: forceReimport ? IMPORT_MODES.MANUAL_REIMPORT : IMPORT_MODES.MANUAL_UPLOAD,
                },
                () => executeImport({
                    filePath: tmpPath,
                    forceReimport,
                    source: 'MANUAL',
                    indicator,
                    lane
                })
            );

            if (result?.requiresConfirmation) {
                return res.status(409).json({
                    success: false,
                    requiresConfirmation: true,
                    ngay_do_kiem: result.ngay_do_kiem,
                    error: {
                        code: 'REIMPORT_CONFIRMATION_REQUIRED',
                        message: `Đã có dữ liệu ngày ${result.ngay_do_kiem}. Vui lòng xác nhận nếu muốn ghi đè.`
                    }
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    file_name: file.originalname,
                    data_date: result.ngay_do_kiem || null,
                    total: result.total,
                    inserted: result.inserted,
                    skipped: result.skipped,
                    errors: result.errors,
                    import_log_id: result.import_log_id,
                    message: 'Nạp dữ liệu thành công.'
                }
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: error.code || 'IMPORT_FAILED',
                    message: getSafeImportErrorMessage(error)
                }
            });
        } finally {
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
            }
        }
    }

    // IMPORT-LOG-AUDIT-01: GET /import/log -- who imported what and when, filterable. Admin only (route).
    // Times are returned as UTC ISO plus the Asia/Ho_Chi_Minh wall clock; rows written before the audit
    // columns existed have actor / mode null (the screen shows "chưa ghi nhận").
    async log(req, res) {
        try {
            const resolved = resolvePagination(req.query);
            const latestRequested = ['1', 'true'].includes(String(req.query.latest || '').toLowerCase());
            const page = latestRequested ? 1 : resolved.page;
            const pageSize = latestRequested ? 5000 : resolved.pageSize;
            const columns = new Set((await all('PRAGMA table_info(import_log)')).map((column) => column.name));
            const audit = (name) => (columns.has(name) ? `log.${name}` : 'NULL');
            const where = [];
            const params = [];
            const from = String(req.query.date_from || '').trim();
            const to = String(req.query.date_to || '').trim();
            if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to))) {
                return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'date_from/date_to must be YYYY-MM-DD.' } });
            }
            if (from) { where.push('log.ngay_do_kiem >= ?'); params.push(from); }
            if (to) { where.push('log.ngay_do_kiem <= ?'); params.push(to); }
            const indicator = String(req.query.indicator || '').trim().toUpperCase();
            if (indicator) { where.push("COALESCE(log.indicator, 'F1.3') = ?"); params.push(indicator); }
            const lane = String(req.query.lane || req.query.source || '').trim().toUpperCase();
            if (lane) { where.push('log.source_lane = ?'); params.push(lane); }
            const status = String(req.query.status || '').trim().toUpperCase();
            if (status) { where.push('log.status = ?'); params.push(status); }
            const actor = String(req.query.actor || '').trim();
            if (actor && columns.has('actor')) { where.push('log.actor = ?'); params.push(actor); }
            const mode = String(req.query.import_mode || '').trim().toUpperCase();
            if (mode && columns.has('import_mode')) { where.push('log.import_mode = ?'); params.push(mode); }
            // latest=1: only the newest row per (data date, indicator, lane) -- feeds the "last import" tooltips
            // without paging through the whole history.
            const latestOnly = ['1', 'true'].includes(String(req.query.latest || '').toLowerCase());
            if (latestOnly) {
                where.push("log.id IN (SELECT MAX(id) FROM import_log GROUP BY ngay_do_kiem, COALESCE(indicator, 'F1.3'), source_lane)");
            }
            const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

            const total = Number((await get(`SELECT COUNT(*) AS n FROM import_log log ${clause}`, params))?.n || 0);
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(page, totalPages);
            const rows = await all(
                `SELECT log.id, log.file_name, log.ngay_do_kiem,
                        COALESCE(log.indicator, 'F1.3') AS indicator, log.source_lane, log.trigger_source,
                        log.status, log.created_at, log.total_records, log.error_records, log.skipped_records,
                        ${audit('actor')} AS actor, ${audit('run_id')} AS run_id, ${audit('job_id')} AS job_id,
                        ${audit('import_mode')} AS import_mode, ${audit('replaced_row_count')} AS replaced_row_count
                 FROM import_log log ${clause}
                 ORDER BY datetime(log.created_at) DESC, log.id DESC
                 LIMIT ? OFFSET ?`,
                [...params, pageSize, (safePage - 1) * pageSize]
            );
            const items = rows.map((row) => {
                const iso = normalizeSqliteUtcTimestamp(row.created_at);
                return {
                    ...row,
                    created_at: iso,
                    created_at_vn: iso ? vnTimeFormatter.format(new Date(iso)) : null,
                };
            });
            return res.status(200).json({
                success: true,
                data: {
                    items,
                    audit_columns_present: AUDIT_COLUMNS.every((name) => columns.has(name)),
                    pagination: {
                        page: safePage, pageSize, totalItems: total, totalPages,
                        hasPrevious: safePage > 1, hasNext: safePage < totalPages,
                    },
                },
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: { code: 'IMPORT_LOG_READ_FAILED', message: error.message } });
        }
    }

    async status(req, res) {
        try {
            const requested = resolvePagination(req.query);
            const totalResult = await get('SELECT COUNT(*) AS totalItems FROM import_log');
            const summary = await get(
                `SELECT
                    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successCount,
                    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failCount
                 FROM import_log`
            );

            const totalItems = Number(totalResult?.totalItems || 0);
            const totalPages = Math.max(1, Math.ceil(totalItems / requested.pageSize));
            const page = Math.min(requested.page, totalPages);
            const offset = (page - 1) * requested.pageSize;

            const lastImport = await get(
                `SELECT created_at
                 FROM import_log
                 WHERE status = 'SUCCESS'
                 ORDER BY datetime(created_at) DESC, id DESC
                 LIMIT 1`
            );

            const rows = await all(
                `SELECT
                    log.id,
                    log.file_name,
                    log.ngay_do_kiem,
                    COALESCE(log.indicator, 'F1.3') AS indicator,
                    log.source_lane,
                    log.trigger_source,
                    log.created_at,
                    log.status,
                    log.total_records,
                    log.error_records,
                    log.skipped_records,
                    COUNT(fact.id) AS hue_fact_count,
                    (
                        SELECT COUNT(*)
                        FROM fact_f13_national national
                        WHERE national.ngay_do_kiem = log.ngay_do_kiem
                    ) AS tct_national_row_count,
                    (
                        SELECT COUNT(*)
                        FROM fact_f13 fact_same_date
                        WHERE fact_same_date.ngay_do_kiem = log.ngay_do_kiem
                    ) AS same_date_fact_count,
                    (
                        SELECT COUNT(*)
                        FROM import_log peer
                        WHERE peer.ngay_do_kiem = log.ngay_do_kiem
                          AND peer.status IN ('SUCCESS', 'FILE_MOVE_FAILED')
                          AND peer.total_records = (
                              SELECT COUNT(*)
                              FROM fact_f13 fact_same_date
                              WHERE fact_same_date.ngay_do_kiem = log.ngay_do_kiem
                          )
                    ) AS matching_hue_import_count
                 FROM import_log log
                 LEFT JOIN fact_f13 fact ON fact.import_log_id = log.id
                 GROUP BY
                    log.id,
                    log.file_name,
                    log.ngay_do_kiem,
                    COALESCE(log.indicator, 'F1.3'),
                    log.source_lane,
                    log.trigger_source,
                    log.created_at,
                    log.status,
                    log.total_records,
                    log.error_records,
                    log.skipped_records
                 ORDER BY datetime(log.created_at) DESC, log.id DESC
                 LIMIT ? OFFSET ?`,
                [requested.pageSize, offset]
            );

            const rowsWithProcessedEvidence = rows.map((row) => {
                const indicatorConfig = getIndicatorConfig(row.indicator || 'F1.3');
                const hueProcessedPath = path.join(indicatorConfig.processedDir, 'HUE', row.file_name);
                const tctProcessedPath = path.join(indicatorConfig.processedDir, 'TCT', row.file_name);
                return {
                    ...row,
                    hue_processed_path: fs.existsSync(hueProcessedPath) ? hueProcessedPath : null,
                    tct_processed_path: fs.existsSync(tctProcessedPath) ? tctProcessedPath : null
                };
            });

            res.status(200).json({
                success: true,
                data: buildStatusPayload({
                    rows: rowsWithProcessedEvidence,
                    summary,
                    lastImport,
                    pagination: {
                        page,
                        pageSize: requested.pageSize,
                        totalItems,
                        totalPages,
                        hasPrevious: page > 1,
                        hasNext: page < totalPages
                    }
                })
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'STATUS_ERROR',
                    message: 'Không thể tải trạng thái import.'
                }
            });
        }
    }

    async preview(req, res) {
        return res.status(410).json({
            success: false,
            error: {
                code: 'DEPRECATED',
                message: 'Endpoint preview đã được thay thế bởi /upload.'
            }
        });
    }

    async confirm(req, res) {
        return res.status(410).json({
            success: false,
            error: {
                code: 'DEPRECATED',
                message: 'Endpoint confirm đã được thay thế bởi /upload.'
            }
        });
    }
}

module.exports = new ImportController();
