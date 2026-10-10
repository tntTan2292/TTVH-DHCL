'use strict';

const { registerF13AutoBackfillExecutors } = require('./autoBackfillF13Executors');
const { registerF41AutoBackfillExecutors } = require('./autoBackfillF41Executors');
const { registerF11AutoBackfillExecutors } = require('./autoBackfillF11Executors');

function registerVerifiedAutoBackfillExecutors(executorRegistry, options = {}) {
    return {
        F13: registerF13AutoBackfillExecutors(executorRegistry, options),
        F41: registerF41AutoBackfillExecutors(executorRegistry, options),
        F11: registerF11AutoBackfillExecutors(executorRegistry, options),
    };
}

module.exports = { registerVerifiedAutoBackfillExecutors };
