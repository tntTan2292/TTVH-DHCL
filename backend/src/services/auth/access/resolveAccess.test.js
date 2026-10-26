'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAccess } = require('./resolveAccess');

const modes = (access) => Object.fromEntries(Object.entries(access.modules).map(([key, value]) => [key, value.mode]));

test('ADMIN sees everything including the admin module', () => {
    const access = resolveAccess({ tier: 'ADMIN' });
    assert.deepEqual(modes(access), { f11: 'all', f12: 'all', f13: 'all', f41: 'all', f42: 'all' });
    assert.equal(access.admin, true);
    assert.equal(access.network, true);
    assert.equal(access.hangton.offices, 'all');
});

test('LEADER (lãnh đạo BĐTP/TTVH, IT BĐTP) sees every module city-wide but not the admin module', () => {
    const access = resolveAccess({ tier: 'LEADER' });
    assert.deepEqual(modes(access), { f11: 'all', f12: 'all', f13: 'all', f41: 'all', f42: 'all' });
    assert.equal(access.admin, false);
    assert.equal(access.network, true);
    assert.deepEqual(access.hangton.screens, ['overview', 'office', 'compare', 'items']);
    assert.equal(access.hangton.offices, 'all');
    assert.equal(access.home, true);
});

test('BCVH director / specialist sees F1.1, F1.3, F4.1 for own BCVH only, never F1.2 or the network', () => {
    const access = resolveAccess({ tier: 'STAFF', bcvh: ['533140'] });
    assert.deepEqual(modes(access), { f11: 'bcvh', f12: 'none', f13: 'bcvh', f41: 'bcvh', f42: 'bcvh' });
    assert.deepEqual(access.modules.f13.bcvh, ['533140']);
    assert.equal(access.network, false);
    assert.equal(access.admin, false);
    assert.equal(access.home, true);
    assert.deepEqual(access.hangton.screens, ['office', 'compare']);
    assert.deepEqual(access.hangton.offices, ['533140']);
});

test('multi-BCVH specialist (Phú Lộc + A Lưới) keeps both codes, A Lưới also owns office 535710', () => {
    const access = resolveAccess({ tier: 'STAFF', bcvh: ['537220', '535790'] });
    assert.deepEqual(access.modules.f41.bcvh, ['535790', '537220']);
    assert.deepEqual(access.hangton.offices, ['535710', '535790', '537220']);
});

test('BCVH specialist who also specialises in F1.1: F1.1 city-wide, F1.3 and F4.1 own BCVH, no F1.2', () => {
    const access = resolveAccess({ tier: 'STAFF', bcvh: ['535470'], indicators: ['F1.1'] });
    assert.deepEqual(modes(access), { f11: 'all', f12: 'none', f13: 'bcvh', f41: 'bcvh', f42: 'bcvh' });
    assert.deepEqual(access.modules.f13.bcvh, ['535470']);
});

test('F1.2 specialist without BCVH sees only F1.2 (plus home and KTC1 hàng tồn)', () => {
    const access = resolveAccess({ tier: 'STAFF', indicators: ['F1.2'] });
    assert.deepEqual(modes(access), { f11: 'none', f12: 'all', f13: 'none', f41: 'none', f42: 'none' });
    assert.equal(access.network, false);
    assert.equal(access.home, true);
    assert.deepEqual(access.hangton.screens, ['office', 'compare']);
    assert.deepEqual(access.hangton.offices, ['530100']);
});

test('unknown tier gets nothing', () => {
    const access = resolveAccess({ tier: 'GUEST' });
    assert.deepEqual(modes(access), { f11: 'none', f12: 'none', f13: 'none', f41: 'none', f42: 'none' });
    assert.equal(access.home, false);
});

test('STAFF with no BCVH and no indicator sees only home', () => {
    const access = resolveAccess({ tier: 'STAFF' });
    assert.deepEqual(modes(access), { f11: 'none', f12: 'none', f13: 'none', f41: 'none', f42: 'none' });
    assert.deepEqual(access.hangton.screens, []);
    assert.equal(access.home, true);
});

test('HANGTON specialist (PO 2026-10-25) sees all four Hang ton screens for every office, nothing else extra', () => {
    const access = resolveAccess({ tier: 'STAFF', indicators: ['HANGTON'] });
    assert.deepEqual(access.hangton.screens, ['overview', 'office', 'compare', 'items']);
    assert.equal(access.hangton.offices, 'all');
    assert.deepEqual(modes(access), { f11: 'none', f12: 'none', f13: 'none', f41: 'none', f42: 'none' });
    assert.equal(access.network, false);

    const withBcvh = resolveAccess({ tier: 'STAFF', bcvh: ['537015'], indicators: ['HANGTON'] });
    assert.equal(withBcvh.hangton.offices, 'all');
    assert.equal(withBcvh.modules.f13.mode, 'bcvh');
});
