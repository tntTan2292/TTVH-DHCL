/**
 * reimport_data.js
 *
 * M2 - Application Bootstrap - Phương Án A: Re-import dữ liệu
 * Upload toàn bộ 14 file F1.3 từ Processed directory qua API POST /api/f13/upload?force=true
 *
 * SSOT API Contract: POST /api/f13/upload (multipart/form-data, field: 'file')
 * Response: { success, total, inserted, skipped, errors }
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');

const PROCESSED_DIR = path.resolve(
    __dirname, '../Data DKCL/F1.3/Processed/2026-06'
);
const API_HOST = 'localhost';
const API_PORT = 5050;
const API_PATH = '/api/f13/upload?force=true';

// Get all xlsx files from Processed directory
const files = fs.readdirSync(PROCESSED_DIR)
    .filter(f => f.endsWith('.xlsx') && f.startsWith('F1.3-'))
    .sort();

console.log(`=== M2 Re-import Data: ${files.length} files ===`);
console.log(`Source: ${PROCESSED_DIR}`);
console.log('');

// Upload a single file via multipart/form-data (Node built-in http)
function uploadFile(filePath, filename) {
    return new Promise((resolve, reject) => {
        const fileBuffer  = fs.readFileSync(filePath);
        const boundary    = '----FormBoundary' + Date.now().toString(16);
        
        // Build multipart body
        const beforeFile = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
            `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n` +
            `\r\n`
        );
        const afterFile = Buffer.from(`\r\n--${boundary}--\r\n`);
        const body      = Buffer.concat([beforeFile, fileBuffer, afterFile]);

        const options = {
            hostname: API_HOST,
            port    : API_PORT,
            path    : API_PATH,
            method  : 'POST',
            headers : {
                'Content-Type'  : `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Sequential import of all files
async function reimportAll() {
    let totalImported = 0;
    let totalRecords  = 0;
    let failCount     = 0;

    for (const filename of files) {
        const filePath = path.join(PROCESSED_DIR, filename);
        process.stdout.write(`Importing ${filename} ... `);
        
        try {
            const result = await uploadFile(filePath, filename);
            
            if (result.status === 200 && result.body.success) {
                const { total, inserted, skipped, errors } = result.body;
                totalImported += inserted;
                totalRecords  += total;
                console.log(`OK | total=${total}, inserted=${inserted}, skipped=${skipped}, errors=${errors}`);
            } else {
                console.log(`FAIL | HTTP ${result.status} | ${JSON.stringify(result.body).substring(0, 100)}`);
                failCount++;
            }
        } catch (err) {
            console.log(`ERROR | ${err.message}`);
            failCount++;
        }
    }

    console.log('');
    console.log('=== Re-import Summary ===');
    console.log(`Files processed : ${files.length}`);
    console.log(`Files failed    : ${failCount}`);
    console.log(`Total records   : ${totalRecords.toLocaleString()}`);
    console.log(`Total inserted  : ${totalImported.toLocaleString()}`);
    console.log('');
    
    if (failCount === 0) {
        console.log('[PASS] Re-import HOÀN TẤT thành công ✓');
    } else {
        console.log(`[WARN] ${failCount} file(s) thất bại — kiểm tra logs bên trên`);
        process.exit(1);
    }
}

reimportAll().catch(err => {
    console.error('[FATAL]', err.message);
    process.exit(1);
});
