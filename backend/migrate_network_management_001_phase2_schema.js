/**
 * migrate_network_management_001_phase2_schema.js
 *
 * NETWORK-MANAGEMENT-001 Phase 2 — Ba bản đồ.
 * Additive-only migration: adds `route_po_code` to network_delivery_point
 * so the Excel source column ROUTE_PO_CODE can be preserved alongside the
 * literal POSTMAN_CODE column (they are not the same value — see checkpoint
 * Section 13 for the documented mapping decision).
 *
 * Safe to run against the live operational database: uses ALTER TABLE ADD
 * COLUMN guarded by a column-existence check, so it is idempotent and never
 * touches existing rows/columns.
 *
 * Usage: node migrate_network_management_001_phase2_schema.js [--db <path>]
 */

'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function columnExists(db, tableName, columnName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows.some((row) => row.name === columnName));
        });
    });
}

function applyNetworkManagement001Phase2Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, async (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }

            try {
                const hasColumn = await columnExists(db, 'network_delivery_point', 'route_po_code');
                if (!hasColumn) {
                    await new Promise((res, rej) => {
                        db.run('ALTER TABLE network_delivery_point ADD COLUMN route_po_code TEXT', (err) => {
                            if (err) rej(err);
                            else res();
                        });
                    });
                }
                db.close((closeErr) => {
                    if (closeErr) reject(closeErr);
                    else resolve({ route_po_code_added: !hasColumn });
                });
            } catch (error) {
                db.close(() => reject(error));
            }
        });
    });
}

if (require.main === module) {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== NETWORK-MANAGEMENT-001 Phase 2 — Schema Migration ===');
    console.log(`DB Path: ${dbPath}`);

    applyNetworkManagement001Phase2Schema(dbPath)
        .then((result) => {
            console.log(`[OK] network_delivery_point.route_po_code present (added just now: ${result.route_po_code_added}).`);
        })
        .catch((error) => {
            console.error('[FAIL] Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyNetworkManagement001Phase2Schema };
