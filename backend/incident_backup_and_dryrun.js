'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

// 1. Define paths
const baseDir = 'D:\\Antigravity - Project\\TTVH - He thong dieu hanh chat luong';
const dbPath = path.join(baseDir, 'backend', 'src', 'db', 'database.sqlite');
const processedHue18 = path.join(baseDir, 'Data DKCL', 'F1.3', 'Processed', 'HUE', 'F1.3-2026.07.18.xlsx');
const processedHue19 = path.join(baseDir, 'Data DKCL', 'F1.3', 'Processed', 'HUE', 'F1.3-2026.07.19.xlsx');
const raw18 = path.join(baseDir, 'portal-downloads', 'dkcl', 'hue', 'f13', 'raw', '24-07-2026_17-18-56_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx');
const raw19 = path.join(baseDir, 'portal-downloads', 'dkcl', 'hue', 'f13', 'raw', '19-07-2026_23-08-07_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx');

const evidenceDir = path.join(baseDir, 'backend', 'incident_evidence');

function sha256File(filePath) {
    if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyFile(src, destName) {
    if (!fs.existsSync(src)) {
        console.log(`Source not found: ${src}`);
        return null;
    }
    const dest = path.join(evidenceDir, destName);
    fs.copyFileSync(src, dest);
    const stats = fs.statSync(dest);
    const sha = sha256File(dest);
    console.log(`Copied ${path.basename(src)} to ${destName}`);
    console.log(`  - Size: ${stats.size} bytes`);
    console.log(`  - Created: ${stats.birthtime.toISOString()}`);
    console.log(`  - Modified: ${stats.mtime.toISOString()}`);
    console.log(`  - SHA-256: ${sha}`);
    return {
        path: dest,
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        sha
    };
}

console.log('=== PHASE 1: COPYING EVIDENCE & CALCULATING METADATA ===');
const dbMeta = copyFile(dbPath, 'database.sqlite');
const p18Meta = copyFile(processedHue18, 'F1.3-2026.07.18.xlsx');
const p19Meta = copyFile(processedHue19, 'F1.3-2026.07.19.xlsx');
const r18Meta = copyFile(raw18, '24-07-2026_17-18-56_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx');
const r19Meta = copyFile(raw19, '19-07-2026_23-08-07_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx');

// Check WAL / SHM
console.log('\n=== WAL / SHM check in backend/src/db/ ===');
['database.sqlite-wal', 'database.sqlite-shm'].forEach(f => {
    const p = path.join(baseDir, 'backend', 'src', 'db', f);
    if (fs.existsSync(p)) {
        console.log(`${f} exists!`);
        copyFile(p, f);
    } else {
        console.log(`${f} does not exist.`);
    }
});

// Check historical deletion evidence by inspecting sqlite_sequence and older schema
console.log('\n=== Checking SQLite internal table metadata ===');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
db.all("SELECT * FROM sqlite_sequence", [], (err, rows) => {
    if (err) console.error(err);
    else console.log('sqlite_sequence values:', JSON.stringify(rows, null, 2));
    
    // Check if there are any gaps in auto-increment IDs in fact_f13 or if any row IDs exist that are missing
    db.all("SELECT MAX(id) as max_id, COUNT(*) as count FROM fact_f13", [], (err, info) => {
        if (err) console.error(err);
        else console.log('fact_f13 max_id and count:', JSON.stringify(info, null, 2));
        db.close();
    });
});

// Check system configs/profile info
console.log('\n=== Running process list ===');
const { execSync } = require('child_process');
try {
    const procList = execSync('powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, StartTime, CommandLine | ConvertTo-Json"').toString();
    console.log(procList);
} catch (e) {
    console.log('Failed to get process list:', e.message);
}
