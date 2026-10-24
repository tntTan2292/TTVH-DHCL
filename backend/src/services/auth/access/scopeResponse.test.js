'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { restrictToBcvh, dropPaths, sanitizeForBcvhScope, scopeBcvhResponse } = require('./scopeResponse');

test('restrictToBcvh keeps only allowed rows by code, by name, and by map key; total rows without a code are dropped', () => {
    const payload = {
        data: [
            { ma_bcvh: '537015', ten_bcvh: 'BCVH Thuận An', v: 1 },
            { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', v: 2 },
        ],
        rows: [{ ten_bcvh: 'BCVH Thuận An' }, { ten_bcvh: 'BCVH Phú Lộc' }, { ten_bcvh: 'TỔNG CỘNG' }],
        units: { 537015: { volume: 1 }, 533140: { volume: 2 } },
        nested: { list: [{ ma_bcvh: '533140' }, { ma_bcvh: '537015' }] },
        note: 'plain text is untouched',
    };
    const out = restrictToBcvh(payload, ['537015']);
    assert.deepEqual(out.data.map((row) => row.v), [1]);
    assert.deepEqual(out.rows, [{ ten_bcvh: 'BCVH Thuận An' }]);
    assert.deepEqual(Object.keys(out.units), ['537015']);
    assert.deepEqual(out.nested.list, [{ ma_bcvh: '537015' }]);
    assert.equal(out.note, payload.note);
    assert.equal(payload.data.length, 2, 'input must not be mutated');
});

test('restrictToBcvh keeps several allowed BCVH side by side (never merged)', () => {
    const out = restrictToBcvh({ data: [{ ma_bcvh: '535790' }, { ma_bcvh: '537220' }, { ma_bcvh: '533140' }] }, ['535790', '537220']);
    assert.deepEqual(out.data.map((row) => row.ma_bcvh), ['535790', '537220']);
});

test('dropPaths removes plain, array-element and nested array-element paths and leaves the input intact', () => {
    const payload = {
        meta: { total_row: { a: 1 }, keep: 1 },
        data: [{ rank: 1, ma_bcvh: 'x' }, { rank: 2, ma_bcvh: 'y' }],
        deep: { weeks: [{ total: 1, national_rank: 2, units: {} }] },
    };
    const out = dropPaths(payload, ['meta.total_row', 'data[].rank', 'deep.weeks[].total', 'deep.weeks[].national_rank', 'missing.path[].x']);
    assert.deepEqual(out, { meta: { keep: 1 }, data: [{ ma_bcvh: 'x' }, { ma_bcvh: 'y' }], deep: { weeks: [{ units: {} }] } });
    assert.equal('total_row' in payload.meta, true);
});

test('scopeBcvhResponse only rewrites 200 bodies of BCVH-mode requests', () => {
    const make = (scope, statusCode = 200) => {
        const sent = [];
        const res = { statusCode, json(body) { sent.push(body); return this; } };
        let nexted = false;
        scopeBcvhResponse({ drop: ['meta.total_row'] })({ scope }, res, () => { nexted = true; });
        assert.equal(nexted, true);
        return { res, sent };
    };
    const body = { data: [{ ma_bcvh: '537015' }, { ma_bcvh: '533140' }], meta: { total_row: { v: 1 } } };

    const scoped = make({ mode: 'bcvh', bcvh: ['537015'] });
    scoped.res.json(body);
    assert.deepEqual(scoped.sent[0], { data: [{ ma_bcvh: '537015' }], meta: {} });

    const all = make({ mode: 'all', bcvh: [] });
    all.res.json(body);
    assert.deepEqual(all.sent[0], body);

    const failing = make({ mode: 'bcvh', bcvh: ['537015'] }, 403);
    failing.res.json({ error: { code: 'OUT_OF_SCOPE' } });
    assert.deepEqual(failing.sent[0], { error: { code: 'OUT_OF_SCOPE' } });

    assert.deepEqual(sanitizeForBcvhScope({ x: [{ ma_bcvh: '533140' }] }, ['537015']), { x: [] });
});
