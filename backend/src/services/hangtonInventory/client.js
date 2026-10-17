'use strict';

// HANGTON-INVENTORY-01: login + fetch against the hangton portal (JSON login, cookie "session").
// Credentials come from the environment or the gitignored backend/.hangton.env; never logged.
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://hangton.aggvnp.site';
const ENV_FILE = path.resolve(__dirname, '..', '..', '..', '.hangton.env');

function readCredentials(env = process.env, envFile = ENV_FILE) {
    const out = { username: env.HANGTON_USERNAME || '', password: env.HANGTON_PASSWORD || '' };
    if ((!out.username || !out.password) && fs.existsSync(envFile)) {
        for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
            const m = line.match(/^\s*(HANGTON_USERNAME|HANGTON_PASSWORD)\s*=\s*(.*?)\s*$/);
            if (!m) continue;
            if (m[1] === 'HANGTON_USERNAME' && !out.username) out.username = m[2];
            if (m[1] === 'HANGTON_PASSWORD' && !out.password) out.password = m[2];
        }
    }
    return out;
}

async function fetchStockData({ credentials = readCredentials(), fetchImpl = fetch, baseUrl = BASE_URL, timeoutMs = 90000 } = {}) {
    if (!credentials.username || !credentials.password) throw new Error('HANGTON_CREDENTIALS_MISSING');
    const signal = () => AbortSignal.timeout(timeoutMs);
    const login = await fetchImpl(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: credentials.username, password: credentials.password }),
        signal: signal(),
    });
    const loginBody = await login.json().catch(() => ({}));
    if (!login.ok || loginBody.success !== true) throw new Error(`HANGTON_LOGIN_FAILED_${login.status}`);
    const cookies = typeof login.headers.getSetCookie === 'function' ? login.headers.getSetCookie() : [];
    const cookie = cookies.map((c) => c.split(';')[0]).join('; ');
    if (!cookie) throw new Error('HANGTON_NO_SESSION_COOKIE');
    const res = await fetchImpl(`${baseUrl}/api/data?type=all&provinces=`, { headers: { cookie }, signal: signal() });
    if (!res.ok) throw new Error(`HANGTON_DATA_FAILED_${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body.data)) throw new Error('HANGTON_DATA_SHAPE');
    return { rows: body.data, portalTimestamp: body.timestamp || null, count: body.count ?? body.data.length };
}

module.exports = { fetchStockData, readCredentials, BASE_URL };
