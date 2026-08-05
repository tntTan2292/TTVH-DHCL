'use strict';

/**
 * importTestSandbox.js — AUTO-IMPORT-012
 *
 * Shared helper for Import test suites that need a real database and a real
 * file system (not just in-memory data), so they can never read or write the
 * production `Data DKCL/F1.3` tree or the production `database.sqlite`.
 *
 * Usage (must run before requiring `./src/config/db` or
 * `./src/services/importPipeline` — both modules resolve their paths once,
 * at require-time, from `process.env`):
 *
 *   const { sandbox } = require('./test/importTestSandbox');
 *   process.env.NODE_ENV = 'test';
 *   process.env.QIS_TEST_DB_PATH = sandbox.dbPath;
 *   process.env.QIS_TEST_DATA_ROOT = sandbox.dataRoot;
 *   process.env.QIS_ALLOW_TEST_FUTURE_DATE = 'true';
 *
 *   const { db } = require('../src/config/db');
 *   const { initSchema, destroySandbox } = require('./test/importTestSandbox');
 *   await initSchema(db); // inside an async setup step, before any query
 *   // ... run tests ...
 *   await destroySandbox(sandbox); // in cleanup/teardown
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const SOURCES = ['HUE', 'TCT'];
const SUBFOLDERS = ['Incoming', 'Processing', 'Processed', 'Error', 'Quarantine'];
const SCHEMA_PATH = path.resolve(__dirname, '../src/db/schema.sql');

function createSandbox(prefix = 'qis-import-test-') {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const dataRoot = path.join(root, 'Data-DKCL-F1.3');
    for (const sub of SUBFOLDERS) {
        for (const source of SOURCES) {
            fs.mkdirSync(path.join(dataRoot, sub, source), { recursive: true });
        }
    }
    const dbPath = path.join(root, `database-${process.pid}-${Date.now()}.sqlite`);
    return { root, dataRoot, dbPath };
}

function initSchema(db) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    return new Promise((resolve, reject) => {
        db.exec(schema, (error) => (error ? reject(error) : resolve()));
    });
}

function destroySandbox(sandbox) {
    if (sandbox?.root && fs.existsSync(sandbox.root)) {
        fs.rmSync(sandbox.root, { recursive: true, force: true });
    }
}

module.exports = { createSandbox, initSchema, destroySandbox };
