'use strict';

class F41HueAdapter {
    constructor({ service }) {
        if (typeof service?.runOneDate !== 'function') throw new Error('F41HueAdapter requires service.runOneDate().');
        this.service = service;
    }

    runOneDate(businessDate, context = {}) {
        return this.service.runOneDate(businessDate, {
            portalClient: context.portalClient || null,
            refreshRequested: false,
        });
    }
}

module.exports = { F41HueAdapter };
