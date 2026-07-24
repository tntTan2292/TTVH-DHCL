const cp = require('child_process');
const processManager = require('./src/services/browserProcessManager');

(async () => {
    let pw;
    try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }
    console.log('Launching browser...');
    const browser = await pw.chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('about:blank');
    
    const pid = browser.process().pid;
    console.log('Browser PID:', pid);
    
    const native = require('./src/services/nativeWindowManager');
    
    // Test hiding
    setTimeout(async () => {
        console.log('Hiding all process windows...');
        const pm = new processManager.BrowserProcessManager();
        const roots = [pid];
        const descendantPids = await pm.getDescendantProcessIds(roots);
        console.log('Tree PIDs:', descendantPids);
        
        const res = native.setWindowsVisibleForProcessIds(descendantPids, false);
        console.log('Hide result:', JSON.stringify(res, null, 2));
        
        setTimeout(() => {
            console.log('Closing browser...');
            browser.close();
        }, 3000);
    }, 2000);
})();
