'use strict';
const fs = require('fs');
const path = require('path');
const { parseF13Excel } = require('./src/services/excelParser');

const baseDir = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong\\backend';
const copied18 = path.join(baseDir, 'incident_evidence', 'F1.3-2026.07.18.xlsx');
const copied19 = path.join(baseDir, 'incident_evidence', 'F1.3-2026.07.19.xlsx');

function dryRunParse(filePath, dateStr) {
    console.log(`\n=== DRY RUN PARSE: ${path.basename(filePath)} ===`);
    if (!fs.existsSync(filePath)) {
        console.log('File does not exist!');
        return;
    }
    const buffer = fs.readFileSync(filePath);
    try {
        const { parsedData, totalParsed } = parseF13Excel(buffer);
        console.log(`Successfully parsed ${totalParsed} rows.`);

        // Gather statistics
        let validCount = 0;
        let rejectedCount = 0;
        const rejectedReasons = [];
        const distinctKeys = new Set();
        let duplicateKeyCount = 0;
        const bcvhCodes = new Set();
        const routeCodes = new Set();
        let minTime = null;
        let maxTime = null;

        parsedData.forEach((row, index) => {
            // Check required fields or schema validation rules
            // In fact_f13, we check if ma_bg is present
            const key = row.ma_bg;
            if (!key) {
                rejectedCount++;
                if (rejectedReasons.length < 5) rejectedReasons.push(`Row ${index}: Missing 'ma_bg'`);
                return;
            }

            validCount++;
            if (distinctKeys.has(key)) {
                duplicateKeyCount++;
            } else {
                distinctKeys.add(key);
            }

            if (row.ma_bcvh) bcvhCodes.add(row.ma_bcvh);
            if (row.ma_tuyen) routeCodes.add(row.ma_tuyen);

            // Min/max relevant timestamps - let's check thoi_gian_ptc or thoi_gian_bd10_quet_tms
            const t = row.thoi_gian_ptc || row.thoi_gian_bd10_quet_tms;
            if (t) {
                if (!minTime || t < minTime) minTime = t;
                if (!maxTime || t > maxTime) maxTime = t;
            }
        });

        console.log(`- Business Date (from filename): ${dateStr}`);
        console.log(`- Parsed rows: ${parsedData.length}`);
        console.log(`- Valid rows: ${validCount}`);
        console.log(`- Rejected rows: ${rejectedCount} (Reasons: ${rejectedReasons.join(', ') || 'None'})`);
        console.log(`- Distinct business keys (ma_bg): ${distinctKeys.size}`);
        console.log(`- Duplicate keys: ${duplicateKeyCount}`);
        console.log(`- BCVH count: ${bcvhCodes.size}`);
        console.log(`- Route/Postman count: ${routeCodes.size}`);
        console.log(`- Min Timestamp: ${minTime}`);
        console.log(`- Max Timestamp: ${maxTime}`);
        console.log(`- Expected final fact_f13 count: ${distinctKeys.size}`);

    } catch (e) {
        console.error(`Error parsing file:`, e.message);
    }
}

dryRunParse(copied18, '2026-07-18');
dryRunParse(copied19, '2026-07-19');
