// RBAC-01: the login throttle keys on req.ip, so the proxy hop must be trusted (and only that hop).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

test('server.js trusts only the loopback proxy hop and the Vite proxy forwards the client IP', () => {
    const server = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    assert.match(server, /app\.set\('trust proxy', 'loopback'\);/);
    const vite = fs.readFileSync(path.join(__dirname, '../../../frontend/vite.config.js'), 'utf8');
    assert.match(vite, /xfwd: true/);
});

test("with trust proxy 'loopback', req.ip is the address the proxy appended; forged left-hand entries are ignored", async () => {
    const app = express();
    app.set('trust proxy', 'loopback');
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/ip`;
    try {
        const honest = await (await fetch(url, { headers: { 'x-forwarded-for': '10.0.0.7' } })).json();
        assert.equal(honest.ip, '10.0.0.7');
        const forged = await (await fetch(url, { headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.7' } })).json();
        assert.equal(forged.ip, '10.0.0.7', 'what the client wrote on the left is ignored');
        const direct = await (await fetch(url)).json();
        assert.match(direct.ip, /127\.0\.0\.1/);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
