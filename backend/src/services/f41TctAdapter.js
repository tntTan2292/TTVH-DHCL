'use strict';

class F41TctAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F41TctAdapter requires service.runOneDate().');
        this.service = service;
    }

    runOneDate(businessDate, context = {}) {
        return this.service.runOneDate(businessDate, {
            portalClient: context.portalClient || null,
            // IMPORT-BULK-REIMPORT-ALL-01 Part A (Design of Record v2 §7.4 gate
            // 4): this used to silently drop context.refreshRequested and
            // always send false, which would have made the executor-level fix
            // (autoBackfillF41Executors.js) a no-op for F4.1/TCT.
            refreshRequested: Boolean(context.refreshRequested),
        });
    }
}

module.exports = { F41TctAdapter };
