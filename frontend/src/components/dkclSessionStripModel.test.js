import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describeSession, formatAgo, disconnectConfirmText } from './dkclSessionStripModel.js';

const now = Date.parse('2026-10-22T10:00:00Z');

// unknown state: nothing can be pressed yet
assert.equal(describeSession(null).canLogin, false);
assert.equal(describeSession(null).canDisconnect, false);

// signed in: Đăng nhập lại + Ngắt session, with the age of the last check
const valid = describeSession({ status: 'SESSION_VALID', last_validated_at: '2026-10-22T09:50:00Z' }, { now });
assert.equal(valid.tone, 'ok');
assert.equal(valid.canLogin, true);
assert.equal(valid.canDisconnect, true);
assert.equal(valid.loginLabel, 'Đăng nhập lại');
assert.match(valid.detail, /10 phút trước/);

// an import operation is using the session: disconnect is withheld
const inUse = describeSession({ status: 'SESSION_VALID', busy: true }, { now });
assert.equal(inUse.canDisconnect, false);
assert.match(inUse.detail, /tác vụ nhập dữ liệu/);

// a request in flight blocks every button
const working = describeSession({ status: 'SESSION_VALID' }, { busy: true, now });
assert.equal(working.canLogin, false);
assert.equal(working.canDisconnect, false);

// login in progress: cancel is offered, disconnect is not
const progress = describeSession({ status: 'LOGIN_IN_PROGRESS' }, { now });
assert.equal(progress.canCancel, true);
assert.equal(progress.canDisconnect, false);
assert.equal(progress.tone, 'progress');

// disconnected on purpose and expired: sign-in is always possible
assert.equal(describeSession({ status: 'DISCONNECTED' }).label, 'Đã ngắt');
assert.equal(describeSession({ status: 'DISCONNECTED' }).canLogin, true);
assert.equal(describeSession({ status: 'AUTHENTICATION_REQUIRED' }).tone, 'bad');
assert.equal(describeSession({ status: 'NOT_CHECKED' }).canLogin, true);
assert.equal(describeSession({ status: 'NOT_CHECKED' }).canDisconnect, true, 'a saved session may exist: ending it stays possible');

assert.equal(formatAgo('2026-10-22T09:59:50Z', now), 'vừa xong');
assert.equal(formatAgo('2026-10-22T07:30:00Z', now), '2 giờ 30 phút trước');
assert.equal(formatAgo(null, now), null);
assert.match(disconnectConfirmText('Huế'), /Ngắt phiên Huế/);

// wiring: the strip uses the new endpoints and the page mounts it
const strip = fs.readFileSync(new URL('./DkclSessionStrip.jsx', import.meta.url), 'utf8');
assert.match(strip, /api\.get\('\/import\/dkcl\/session\/status'\)/);
assert.match(strip, /api\.post\('\/import\/dkcl\/session\/disconnect'/);
assert.match(strip, /api\.post\('\/import\/dkcl\/session\/interactive-auth'/);
const page = fs.readFileSync(new URL('../pages/DataImportCenter.jsx', import.meta.url), 'utf8');
assert.match(page, /<DkclSessionStrip\b/, 'the page must mount the always-visible session strip');

console.log('dkclSessionStripModel tests passed');
