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
    const pm = new processManager.BrowserProcessManager();
    
    // Test getDescendantProcessIds
    const descendants = await pm.getDescendantProcessIds([pid]);
    console.log('Tree PIDs:', descendants);
    
    // Mock profile dir for testing setBrowserWindowsVisibleByProfile
    // Actually, setBrowserWindowsVisibleByProfile uses findBrowserProcessByProfile
    // Since we didn't specify --user-data-dir, findBrowserProcessByProfile will return empty.
    // Let's just test native.setWindowsVisibleForProcessIds
    setTimeout(async () => {
        console.log('Hiding...');
        const res = native.setWindowsVisibleForProcessIds(descendants, false);
        console.log('Hide result:', JSON.stringify(res, null, 2));
        
        setTimeout(() => {
            console.log('Closing browser...');
            browser.close();
        }, 2000);
    }, 2000);
})();
