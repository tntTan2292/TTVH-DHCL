/**
 * RBAC-01 - personal accounts, BCVH / indicator scope, persistent sessions, auth audit.
 *
 * Additive-only migration: creates qis_user, qis_user_bcvh, qis_user_indicator, qis_session and
 * qis_auth_event if absent. Safe to run repeatedly; inserts no data and touches no other table.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const RBAC_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS qis_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL CHECK (tier IN ('ADMIN', 'LEADER', 'STAFF')),
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    last_login_at INTEGER,
    password_changed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS qis_user_bcvh (
    user_id INTEGER NOT NULL REFERENCES qis_user(id) ON DELETE CASCADE,
    ma_bcvh TEXT NOT NULL,
    PRIMARY KEY (user_id, ma_bcvh)
);

CREATE TABLE IF NOT EXISTS qis_user_indicator (
    user_id INTEGER NOT NULL REFERENCES qis_user(id) ON DELETE CASCADE,
    indicator TEXT NOT NULL CHECK (indicator IN ('F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON')),
    PRIMARY KEY (user_id, indicator)
);

CREATE TABLE IF NOT EXISTS qis_session (
    session_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES qis_user(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_qis_session_user ON qis_session(user_id);
CREATE INDEX IF NOT EXISTS idx_qis_session_expires ON qis_session(expires_at);

CREATE TABLE IF NOT EXISTS qis_auth_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    event TEXT NOT NULL,
    detail TEXT,
    ip TEXT,
    at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_qis_auth_event_user ON qis_auth_event(user_id, at);
`;

const RBAC_TABLES = ['qis_user', 'qis_user_bcvh', 'qis_user_indicator', 'qis_session', 'qis_auth_event'];

function applyRbac01Schema(dbPath) {
    const target = dbPath || path.resolve(__dirname, 'src/db/database.sqlite');
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(target, (openError) => {
            if (openError) return reject(openError);
            db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 30000;', (pragmaError) => {
                if (pragmaError) {
                    db.close();
                    return reject(pragmaError);
                }
                db.exec(RBAC_SCHEMA_SQL, (schemaError) => {
                    db.close((closeError) => {
                        if (schemaError) return reject(schemaError);
                        if (closeError) return reject(closeError);
                        return resolve({ tables: RBAC_TABLES });
                    });
                });
            });
        });
    });
}

module.exports = { applyRbac01Schema, RBAC_SCHEMA_SQL, RBAC_TABLES };

if (require.main === module) {
    applyRbac01Schema(process.argv[2])
        .then((result) => console.log('RBAC-01 schema applied:', result.tables.join(', ')))
        .catch((error) => {
            console.error('RBAC-01 schema failed:', error.message);
            process.exit(1);
        });
}
