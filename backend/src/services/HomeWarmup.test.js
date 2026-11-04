'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { HomeWarmup, buildSteps } = require('./HomeWarmup');

const silent = { log() {} };

function fakeService({ failOn = null } = {}) {
    const calls = [];
    return {
        calls,
        async getExecutive(args) {
            calls.push(['executive', args.period, args.offset]);
            if (failOn === 'executive') throw new Error('boom');
            return {};
        },
        async getNationalRanking(args) {
            calls.push(['ranking', args.indicator, args.period, args.offset]);
            if (failOn === 'ranking') throw new Error('boom');
            return {};
        },
    };
}

test('the views kept ready: latest day / week / month first, the last 7 days, the previous week and month, every indicator for the latest period', () => {
    const steps = buildSteps();
    assert.deepEqual(steps.slice(0, 2), [
        { kind: 'executive', period: 'day', offset: 0 },
        { kind: 'ranking', indicator: 'f11', period: 'day', offset: 0 },
    ]);
    const executive = steps.filter((s) => s.kind === 'executive').map((s) => `${s.period}:${s.offset}`);
    assert.deepEqual(executive.slice(0, 3), ['day:0', 'week:0', 'month:0']);
    assert.equal(executive.filter((v) => v.startsWith('day:')).length, 7);
    assert.ok(executive.includes('week:-1') && executive.includes('month:-1'));
    const latestRankings = steps.filter((s) => s.kind === 'ranking' && s.offset === 0 && s.period === 'month').map((s) => s.indicator);
    assert.deepEqual(latestRankings.sort(), ['f11', 'f12', 'f13', 'f41', 'f42']);
    assert.equal(steps.filter((s) => s.kind === 'ranking' && s.indicator === 'f13' && s.offset !== 0).length, 0);
});

test('warms only after the data changed and stood still for two checks', async () => {
    let version = 'v1';
    const service = fakeService();
    const warmup = new HomeWarmup({ service, getVersion: async () => version, log: silent });
    assert.equal(await warmup.tick(), false); // first look: not seen before
    assert.equal(service.calls.length, 0);
    assert.equal(await warmup.tick(), true); // same version twice: it stood still
    assert.ok(service.calls.length > 10);
    const first = service.calls.length;
    assert.equal(await warmup.tick(), false); // nothing changed since the warm-up
    version = 'v2'; // a load changed the data
    assert.equal(await warmup.tick(), false); // still moving or just moved
    version = 'v3';
    assert.equal(await warmup.tick(), false); // moved again: wait
    assert.equal(service.calls.length, first);
    assert.equal(await warmup.tick(), true);
    assert.equal(service.calls.length, first * 2);
});

test('a failing view is skipped and the rest are still computed', async () => {
    const service = fakeService({ failOn: 'ranking' });
    const warmup = new HomeWarmup({ service, getVersion: async () => 'v1', log: silent });
    const result = await warmup.warm('test');
    assert.equal(result.done, buildSteps().filter((s) => s.kind === 'executive').length);
    assert.equal(result.failed, buildSteps().filter((s) => s.kind === 'ranking').length);
});

test('a failing version check never throws and does not warm', async () => {
    const warmup = new HomeWarmup({ service: fakeService(), getVersion: async () => { throw new Error('db busy'); }, log: silent });
    assert.equal(await warmup.tick(), false);
});

test('one warm-up at a time', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const service = fakeService();
    const slow = { ...service, getExecutive: async (args) => { await gate; return service.getExecutive(args); } };
    const warmup = new HomeWarmup({ service: slow, getVersion: async () => 'v1', log: silent });
    const first = warmup.warm('a');
    assert.equal(await warmup.warm('b'), null);
    release();
    await first;
    assert.equal(warmup.running, false);
});
