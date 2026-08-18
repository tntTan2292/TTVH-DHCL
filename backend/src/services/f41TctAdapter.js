'use strict';

class F41TctAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F41TctAdapter requires service.runOneDate().');
        this.service = service;
    }

    runOneDate(businessDate, context = {}) {
        return this.service.runOneDate(businessDate, {
            portalClient: context.portalClient || null,
            refreshRequested: false,
        });
    }
}

module.exports = { F41TctAdapter };
