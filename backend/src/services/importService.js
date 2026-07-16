'use strict';

const { get } = require('../config/db');
const { parseF13Excel, extractDateFromFilename } = require('./excelParser');
const { importParsedData } = require('./importProcessor');

class ImportService {
    async processImport(fileName, fileBuffer, forceReimport = false) {
        const ngay_do_kiem = extractDateFromFilename(fileName);
        if (!forceReimport) {
            const existing = await get(
                `SELECT id FROM import_log WHERE ngay_do_kiem = ? AND status = 'SUCCESS' LIMIT 1`,
                [ngay_do_kiem]
            );
            if (existing) {
                return {
                    requiresConfirmation: true,
                    ngay_do_kiem
                };
            }
        }

        const { parsedData } = parseF13Excel(fileBuffer);

        const result = await importParsedData({
            parsedData,
            ngay_do_kiem,
            filename: fileName,
            forceReimport
        });

        return {
            ...result,
            requiresConfirmation: false
        };
    }

    async previewData(fileName, fileBuffer) {
        const ngay_do_kiem = extractDateFromFilename(fileName);
        const { parsedData } = parseF13Excel(fileBuffer);

        return {
            session_id: `preview-${Date.now()}`,
            ngay_do_kiem,
            total_records: parsedData.length,
            valid_records: parsedData.length,
            error_records: 0,
            is_duplicate_date: false
        };
    }

    async confirmImport(sessionId) {
        throw new Error('Confirm import legacy flow is no longer supported.');
    }
}

module.exports = new ImportService();
