'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planBackfill } = require('./backfill-user-positions');

test('backfill plan: sets missing positions, leaves matching ones, flags tier mismatches and unknown accounts', () => {
    const users = [
        { username: '1', tier: 'STAFF', position: 'GD_BCVH' },
        { username: '2', tier: 'STAFF', position: 'CHUYEN_QUAN' },
        { username: '3', tier: 'LEADER', position: 'LD_BDTP' },
        { username: '4', tier: 'LEADER', position: null },
        { username: '5', tier: 'STAFF', position: 'CHUYEN_QUAN' },
        { username: '6', tier: 'STAFF', position: 'CHUYEN_QUAN' },
    ];
    const accounts = [
        { username: '1', tier: 'STAFF', position: null },
        { username: '2', tier: 'STAFF', position: 'CHUYEN_QUAN' },
        { username: '3', tier: 'LEADER', position: 'LD_TTVH' },
        { username: '4', tier: 'LEADER', position: null },
        { username: '6', tier: 'LEADER', position: null },
    ];
    const plan = Object.fromEntries(planBackfill(users, accounts).map((step) => [step.username, step.action]));
    assert.deepEqual(plan, { 1: 'SET', 2: 'UNCHANGED', 3: 'SET', 4: 'NO_POSITION_IN_FILE', 5: 'MISSING_ACCOUNT', 6: 'TIER_MISMATCH' });
});
