const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qis-cache-')), 'cache_test.sqlite');
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = tmpDb;

const { db } = require('../config/db');
const { cachedRead, clearResponseCache, expireFingerprintMemo } = require('./responseCache');

const exec = (sql) => new Promise((res, rej) => db.exec(sql, (e) => (e ? rej(e) : res())));

function makeRes() {
    const res = {
        statusCode: 200, headers: {}, body: undefined,
        set(k, v) { this.headers[k] = v; return this; },
        status(c) { this.statusCode = c; return this; },
        type() { return this; },
        send(b) { this.body = JSON.parse(b); return this; },
        json(b) { this.body = b; return this; },
    };
    return res;
}

async function call(mw, url, handler, method = 'GET') {
    const req = { method, originalUrl: url, path: url.split('?')[0] };
    const res = makeRes();
    let handled = false;
    await mw(req, res, () => { handled = true; handler(res); });
    return { res, handled };
}

test.before(async () => {
    await exec('CREATE TABLE fact_f13 (id INTEGER PRIMARY KEY, ngay_do_kiem TEXT)');
    await exec("INSERT INTO fact_f13 (ngay_do_kiem) VALUES ('2026-10-01')");
});
test.after(() => db.close());
test.beforeEach(() => clearResponseCache());

test('second identical GET is served from cache, handler not run again', async () => {
    const mw = cachedRead();
    let runs = 0;
    const handler = (res) => { runs += 1; res.json({ success: true, n: runs }); };
    const a = await call(mw, '/dashboard/kpi?from=1', handler);
    assert.equal(a.handled, true);
    assert.equal(a.res.headers['X-QIS-Cache'], 'MISS');
    const b = await call(mw, '/dashboard/kpi?from=1', handler);
    assert.equal(b.handled, false);
    assert.equal(b.res.headers['X-QIS-Cache'], 'HIT');
    assert.deepEqual(b.res.body, { success: true, n: 1 });
    assert.equal(runs, 1);
});

test('different query string is a different entry', async () => {
    const mw = cachedRead();
    let runs = 0;
    const handler = (res) => { runs += 1; res.json({ n: runs }); };
    await call(mw, '/x?a=1', handler);
    const b = await call(mw, '/x?a=2', handler);
    assert.equal(b.handled, true);
    assert.equal(runs, 2);
});

test('a new import (fact table gains a row) invalidates the cache', async () => {
    const mw = cachedRead();
    let runs = 0;
    const handler = (res) => { runs += 1; res.json({ n: runs }); };
    await call(mw, '/y', handler);
    await exec("INSERT INTO fact_f13 (ngay_do_kiem) VALUES ('2026-10-02')");
    expireFingerprintMemo(); // entry stays in the store; only the version comparison must reject it
    const b = await call(mw, '/y', handler);
    assert.equal(b.handled, true);
    assert.equal(runs, 2);
});

test('error responses and non-GET requests are never cached', async () => {
    const mw = cachedRead();
    let runs = 0;
    const failing = (res) => { runs += 1; res.status(500).json({ error: 'boom' }); };
    await call(mw, '/z', failing);
    const again = await call(mw, '/z', failing);
    assert.equal(again.handled, true);
    assert.equal(runs, 2);

    let posts = 0;
    const post = (res) => { posts += 1; res.json({ ok: true }); };
    await call(mw, '/p', post, 'POST');
    const second = await call(mw, '/p', post, 'POST');
    assert.equal(second.handled, true);
    assert.equal(posts, 2);
});

test('shouldCache can exclude paths', async () => {
    const mw = cachedRead({ shouldCache: (req) => !req.path.startsWith('/admin') });
    let runs = 0;
    const handler = (res) => { runs += 1; res.json({ n: runs }); };
    await call(mw, '/admin/x', handler);
    const b = await call(mw, '/admin/x', handler);
    assert.equal(b.handled, true);
    assert.equal(runs, 2);
});
