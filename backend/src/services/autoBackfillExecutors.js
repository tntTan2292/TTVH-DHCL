'use strict';

const { registerF13AutoBackfillExecutors } = require('./autoBackfillF13Executors');
const { registerF41AutoBackfillExecutors } = require('./autoBackfillF41Executors');

function registerVerifiedAutoBackfillExecutors(executorRegistry, options = {}) {
    return {
        F13: registerF13AutoBackfillExecutors(executorRegistry, options),
        F41: registerF41AutoBackfillExecutors(executorRegistry, options),
    };
}

module.exports = { registerVerifiedAutoBackfillExecutors };
