'use strict';

const fs = require('fs');
const path = require('path');
const { all, get } = require('../config/db');
const { executeImport, BASE_INCOMING } = require('../services/importPipeline');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const ALLOWED_PAGE_SIZES = [20, 50, 100];

function resolveIncomingDir(source) {
    const normalized = String(source || 'HUE').toUpperCase();
    const subDir = normalized === 'TCT' ? 'TCT' : 'HUE';
    const incomingDir = path.join(BASE_INCOMING, subDir);
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

        const sourceDir = resolveIncomingDir(req.body?.source);
        const tmpPath = path.join(sourceDir, file.originalname);
        fs.writeFileSync(tmpPath, file.buffer);

        try {
            const result = await executeImport({
                filePath: tmpPath,
                forceReimport: req.query.force === 'true',
                source: 'MANUAL'
            });

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
                `SELECT id, file_name, ngay_do_kiem, created_at, status, total_records, error_records, skipped_records
                 FROM import_log
                 ORDER BY datetime(created_at) DESC, id DESC
                 LIMIT ? OFFSET ?`,
                [requested.pageSize, offset]
            );

            res.status(200).json({
                success: true,
                data: buildStatusPayload({
                    rows,
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
