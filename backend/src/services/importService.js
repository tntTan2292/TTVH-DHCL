const { run, get } = require('../config/db');
const { extractDateFromFilename, parseF13Excel } = require('./excelParser');

async function processImport(filename, fileBuffer) {
    // 1. Validation: Extract Date
    const ngay_do_kiem = extractDateFromFilename(filename);
    
    // 2. Validation & Parse: Extract Rows and Columns
    const { parsedData, dbColumns } = parseF13Excel(fileBuffer);

    // 3. Validation: Duplicate Handling (Option B) In-Memory
    const validRows = [];
    const duplicateBgs = [];
    const bgSet = new Set();

    for (const row of parsedData) {
        const ma_bg = row.ma_bg;
        if (!ma_bg) continue; // Skip invalid rows
        
        if (bgSet.has(ma_bg)) {
            duplicateBgs.push(ma_bg);
        } else {
            bgSet.add(ma_bg);
            validRows.push(row);
        }
    }

    const total_records = validRows.length;
    const error_records = duplicateBgs.length;

    // ==========================================
    // TRANSACTION BOUNDARY STARTS
    // ==========================================
    await run('BEGIN TRANSACTION');

    try {
        // 4. Reimport Workflow (SUPERSEDED logic)
        const existingLog = await get('SELECT id FROM import_log WHERE ngay_do_kiem = ? AND status = "SUCCESS"', [ngay_do_kiem]);
        
        if (existingLog) {
            // Mark old log as SUPERSEDED to preserve audit trail
            await run('UPDATE import_log SET status = "SUPERSEDED" WHERE ngay_do_kiem = ? AND status = "SUCCESS"', [ngay_do_kiem]);
            // Purge old data for this day
            await run('DELETE FROM fact_f13 WHERE ngay_do_kiem = ?', [ngay_do_kiem]);
        }

        // 5. Insert New Import Log
        const logResult = await run(
            'INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records) VALUES (?, ?, ?, ?, ?, ?)',
            [filename, ngay_do_kiem, 'SUCCESS', total_records, error_records, 0]
        );
        const import_log_id = logResult.lastID;

        // 6. Bulk Insert Valid Rows
        // We use batching to respect SQLite variable limits.
        const batchSize = 100;
        
        for (let i = 0; i < validRows.length; i += batchSize) {
            const batch = validRows.slice(i, i + batchSize);
            
            const placeholders = batch.map(() => `(${dbColumns.map(() => '?').join(', ')}, ?, ?)`).join(', ');
            let values = [];
            
            batch.forEach(row => {
                dbColumns.forEach(col => values.push(row[col]));
                values.push(ngay_do_kiem);
                values.push(import_log_id);
            });

            // STRICT RULE: No "INSERT OR IGNORE" used.
            // If the UNIQUE(ngay_do_kiem, ma_bg) constraint is violated here, it means our in-memory validation failed.
            // The constraint is the final protection layer. If it triggers, it throws an error and rolls back the entire transaction.
            const sql = `INSERT INTO fact_f13 (${dbColumns.join(', ')}, ngay_do_kiem, import_log_id) VALUES ${placeholders}`;
            await run(sql, values);
        }

        // ==========================================
        // TRANSACTION BOUNDARY ENDS
        // ==========================================
        await run('COMMIT');

        return {
            success: true,
            ngay_do_kiem,
            inserted: total_records,
            errors: duplicateBgs
        };

    } catch (error) {
        // Rollback EVERYTHING if any step fails (e.g. Unique Constraint violation)
        await run('ROLLBACK');
        
        // Log the failure in an autonomous context (outside the rolled-back transaction)
        try {
            await run(
                'INSERT INTO import_log (file_name, ngay_do_kiem, status, total_records, error_records, skipped_records) VALUES (?, ?, ?, ?, ?, ?)',
                [filename, ngay_do_kiem, 'FAILED', 0, 0, 0]
            );
        } catch (logErr) {
            console.error("Failed to write FAILED log:", logErr);
        }
        
        throw error;
    }
}

module.exports = {
    processImport
};
