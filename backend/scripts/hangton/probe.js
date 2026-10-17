'use strict';
// HANGTON-INVENTORY-01 phase 1: read-only probe of the hangton portal login + data fetch.
// Reads credentials from backend/.hangton.env (gitignored). Prints shape/counts only, never
// credentials, cookies or parcel rows. Run: node backend/scripts/hangton/probe.js
const fs = require('fs');
const path = require('path');

const BASE = 'https://hangton.aggvnp.site';
const ENV_FILE = path.join(__dirname, '..', '..', '.hangton.env');

function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(jar, res) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of list) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}

async function main() {
  const env = readEnv();
  const jar = {};
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QIS-hangton-probe';

  const r1 = await fetch(`${BASE}/login`, { headers: { 'user-agent': ua }, redirect: 'manual' });
  absorb(jar, r1);
  const html = await r1.text();
  const blocked = r1.headers.get('cf-mitigated') || /just a moment|cf-chl|challenge-platform\/h\/b\/orchestrate/i.test(html);
  const form = (html.match(/<form[\s\S]*?<\/form>/i) || [''])[0];
  const inputs = [...form.matchAll(/<input[^>]*>/gi)].map((m) => {
    const name = (m[0].match(/name=["']([^"']+)/i) || [])[1];
    const type = (m[0].match(/type=["']([^"']+)/i) || [])[1];
    return `${name || '?'}:${type || 'text'}`;
  });
  console.log('GET /login', r1.status, 'cloudflareBlocked=', Boolean(blocked));
  console.log('form action/method:', (form.match(/<form[^>]*>/i) || [''])[0].slice(0, 200));
  console.log('inputs:', inputs.join(', ') || '(none; login may be done by script)');
  if (!/<form/i.test(html)) {
    const calls = [...html.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`][^)]*\)/g)].slice(0, 5).map((m) => m[1]);
    console.log('script fetch targets:', calls.join(', '));
  }

  if (!env.HANGTON_USERNAME || !env.HANGTON_PASSWORD) {
    console.log('No credentials in backend/.hangton.env -> stopped after the form check.');
    return;
  }

  const body = JSON.stringify({ username: env.HANGTON_USERNAME, password: env.HANGTON_PASSWORD });
  const r2 = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'user-agent': ua, 'content-type': 'application/json', cookie: cookieHeader(jar) },
    body,
    redirect: 'manual'
  });
  absorb(jar, r2);
  let loginOk = '?';
  try { loginOk = String((JSON.parse(await r2.text()) || {}).success); } catch (_) { /* not json */ }
  console.log('POST /login', r2.status, 'success=', loginOk, 'location=', r2.headers.get('location') || '-', 'cookies=', Object.keys(jar).join(','));

  const r3 = await fetch(`${BASE}/api/dashboard/init`, { headers: { 'user-agent': ua, cookie: cookieHeader(jar) }, redirect: 'manual' });
  console.log('GET /api/dashboard/init', r3.status);
  if (r3.status !== 200) { console.log('Login did not give a session (wrong password, field names, or bot check).'); return; }
  const init = await r3.json();
  console.log('profile:', init.profile && init.profile.username, 'provinces=', JSON.stringify(init.provinces));

  const r4 = await fetch(`${BASE}/api/data?type=all&provinces=`, { headers: { 'user-agent': ua, cookie: cookieHeader(jar) } });
  const data = await r4.json();
  const rows = data.data || [];
  const count = (k) => rows.reduce((m, r) => ((m[r[k]] = (m[r[k]] || 0) + 1), m), {});
  console.log('GET /api/data', r4.status, 'count=', data.count, 'rows=', rows.length, 'source=', data.source, 'timestamp=', data.timestamp);
  console.log('columns:', (data.columns || []).length);
  console.log('DK1:', JSON.stringify(count('DK1')));
  console.log('Loai Ton:', JSON.stringify(count('Loại Tồn')));
  console.log('StatusName:', JSON.stringify(count('StatusName')));
}

main().catch((e) => { console.error('probe failed:', e.message); process.exit(1); });
