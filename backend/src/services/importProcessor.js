const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { run, get } = require('../config/db');

// Map headers strictly
const mapping = {
    'Số hiệu bưu gửi': 'ma_bg',
    'Mã BC phát': 'ma_bcvh',
    'Tên BC phát': 'ten_bcvh',
    'Mã tuyến phát': 'ma_tuyen',
    'Tên tuyến phát': 'ten_tuyen',
    'Thời gian PTC': 'thoi_gian_ptc',
    'Thời gian nộp tiền': 'thoi_gian_nop_tien',
    'Đánh giá (Đạt/Không đạt)': 'ket_qua_f13',
    // add more if needed
};

async function processImportFile(filePath, INCOMING_DIR, PROCESSED_DIR, ERROR_DIR) {
    const filename = path.basename(filePath);
    let status = 'PROCESSING';
    let errorReason = null;
    let totalRecords = 0;
    let measurementDate = null;
    
    // Log init to DB
    const insertLog = async (st, reason, count, errCount) => {
        try {
            await run(
                'INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records) VALUES (?, ?, ?, ?, ?, ?)',
                [filename, measurementDate || 'N/A', st, count || 0, errCount || 0, 0]
            );
        } catch (err) {
            console.error("Error inserting import_log", err);
        }
    };

    try {
        // Validation 1: Prefix & Regex
        if (!filename.startsWith('F1.3-')) {
            errorReason = "Invalid KPI File Type\nExpected:\nF1.3-YYYY.MM.DD.xlsx\nActual:\n" + filename;
            throw new Error(errorReason);
        }

        const dateMatch = filename.match(/F1\.3-(\d{4})\.(\d{2})\.(\d{2})\.xlsx/i);
        if (!dateMatch) {
            errorReason = "Invalid Filename Format. Cannot extract Measurement Date.";
            throw new Error(errorReason);
        }

        measurementDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

        // Read file
        let workbook;
        try {
            const buffer = fs.readFileSync(filePath);
            workbook = xlsx.read(buffer, { type: 'buffer' });
        } catch (e) {
            errorReason = "Corrupted File or File is locked by another process.";
            throw new Error(errorReason);
        }

        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        // Find header row
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
            if (rawData[i] && rawData[i].includes('Số hiệu bưu gửi')) {
                headerRowIdx = i;
                break;
            }
        }

        if (headerRowIdx === -1) {
            errorReason = "Missing required columns: Số hiệu bưu gửi";
            throw new Error(errorReason);
        }

        const headers = rawData[headerRowIdx];
        
        // Validation 2: Missing required columns
        if (!headers.includes('Mã BC phát') || !headers.includes('Đánh giá (Đạt/Không đạt)')) {
            errorReason = "Missing required columns:\n- Mã BCVH\n- Kết quả F1.3";
            throw new Error(errorReason);
        }

        const rows = rawData.slice(headerRowIdx + 1);
        const validRows = [];
        
        for (const row of rows) {
            if (!row || row.length === 0 || !row[headers.indexOf('Số hiệu bưu gửi')]) continue;
            
            const item = {};
            headers.forEach((header, index) => {
                if (mapping[header]) {
                    item[mapping[header]] = row[index] !== undefined ? row[index] : null;
                }
            });
            validRows.push(item);
        }

        totalRecords = validRows.length;

        // DB Transaction
        await run('BEGIN TRANSACTION');

        try {
            // Option B: Delete existing data for the same date
            await run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [measurementDate]);

            const dbColumns = Object.values(mapping).filter(col => validRows.length > 0 && validRows[0].hasOwnProperty(col));

            // Chunk insert
            const batchSize = 500;
            for (let i = 0; i < validRows.length; i += batchSize) {
                const batch = validRows.slice(i, i + batchSize);
                const placeholders = batch.map(() => `(${dbColumns.map(() => '?').join(', ')}, ?)`).join(', ');
                let values = [];
                batch.forEach(row => {
                    dbColumns.forEach(col => values.push(row[col]));
                    values.push(measurementDate);
                });

                const sql = `INSERT INTO fact_f13 (${dbColumns.join(', ')}, ngay_do_kiem) VALUES ${placeholders}`;
                await run(sql, values);
            }

            // Commit
            await run('COMMIT');
            
            // Move to processed
            const yearMonth = measurementDate.substring(0, 7);
            const targetDir = path.join(PROCESSED_DIR, yearMonth);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            
            fs.renameSync(filePath, path.join(targetDir, filename));
            
            await insertLog('SUCCESS', null, totalRecords, 0);

        } catch (dbErr) {
            await run('ROLLBACK');
            errorReason = dbErr.message;
            throw new Error(dbErr);
        }

    } catch (error) {
        // Move to error
        const yyyymm = measurementDate ? measurementDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
        const targetDir = path.join(ERROR_DIR, yyyymm);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        try {
            fs.renameSync(filePath, path.join(targetDir, filename));
        } catch (e) {
            console.error("Could not move file to Error dir", e);
        }

        await insertLog('FAILED', errorReason, 0, 0);
    }
}

module.exports = {
    processImportFile
};
