'use strict';

class AutoBackfillExecutorRegistry {
    constructor({ allowTestExecutors = false } = {}) {
        this.allowTestExecutors = allowTestExecutors;
        this.executors = new Map();
    }

    register(id, executor, { verified = false, testOnly = false } = {}) {
        if (!id || typeof executor?.execute !== 'function') throw new Error('A queue executor id and execute function are required.');
        if (!verified) throw new Error(`Executor '${id}' is not verified.`);
        if (testOnly && !this.allowTestExecutors) throw new Error(`Test executor '${id}' is disabled in this runtime.`);
        this.executors.set(id, Object.freeze({ id, executor, verified: true, testOnly }));
        return this;
    }

    getVerified(id) {
        const registration = this.executors.get(id);
        if (!registration?.verified) return null;
        if (registration.testOnly && !this.allowTestExecutors) return null;
        return registration.executor;
    }
}

module.exports = { AutoBackfillExecutorRegistry };
