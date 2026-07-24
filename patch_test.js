const fs = require('fs');
let code = fs.readFileSync('backend/test_tctF13BackfillService.js', 'utf8');

const newTest = \
    console.log('\\nTEST 9: SESSION_CHECK_FAILED triggers interactiveAuthenticate and returns LOGIN_IN_PROGRESS');
    const authTriggerService = new TctF13BackfillService({
        db: makeDb(),
        sessionPreflightService: {
            preflight: async () => ({ source: 'TCT', status: 'SESSION_CHECK_FAILED', error: { message: 'Không th? xác minh ti?n trình...' } }),
            recover: async () => { global.recoverCalled = true; },
            interactiveAuthenticate: async () => {
                global.interactiveAuthCalled = true;
                return { source: 'TCT', status: 'LOGIN_IN_PROGRESS' };
            }
        }
    });
    authTriggerService.checkCompleted = async () => ({ complete: false, incomplete: false });
    
    global.recoverCalled = false;
    global.interactiveAuthCalled = false;
    try {
        await authTriggerService.startQueue(['2026-07-22']);
        assert.fail('Should have thrown LOGIN_IN_PROGRESS');
    } catch (err) {
        assert.strictEqual(err.code, 'LOGIN_IN_PROGRESS');
    }
    assert.strictEqual(global.recoverCalled, true, 'recover should be called');
    assert.strictEqual(global.interactiveAuthCalled, true, 'interactiveAuthenticate should be called');
\;

code = code.replace(
  "console.log('\\nRESULT: tctF13BackfillService checks passed');",
  newTest + "\n    console.log('\\nRESULT: tctF13BackfillService checks passed');"
);

fs.writeFileSync('backend/test_tctF13BackfillService.js', code);
