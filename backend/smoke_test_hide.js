const { BrowserProcessManager } = require('./src/services/browserProcessManager');
const native = require('./src/services/nativeWindowManager');
const path = require('path');
const fs = require('fs');

(async () => {
    let pw;
    try { 
        const localPath = path.resolve(__dirname, '../frontend/node_modules/playwright');
        if (fs.existsSync(localPath)) pw = require(localPath);
        else {
            const alternatePath = path.resolve(__dirname, '../../playwright');
            if (fs.existsSync(alternatePath)) pw = require(alternatePath);
            else pw = require('playwright');
        }
    } catch (e) { 
        console.error('Playwright not found, skipping UI tests', e.message);
        process.exit(0);
    }
    
    async function runCycle(profileName) {
        console.log(`\nStarting 5 cycles for ${profileName}`);
        const profileDir = path.resolve(path.join(process.cwd(), 'tmp', profileName));
        fs.mkdirSync(profileDir, { recursive: true });
        
        console.log('Launching browser for profile:', profileDir);
        const browser = await pw.chromium.launchPersistentContext(profileDir, {
            headless: false
        });
        
        const page = await browser.newPage();
        await page.goto('about:blank');
        
        const pm = new BrowserProcessManager();
        let successCount = 0;
        
        for (let i = 1; i <= 5; i++) {
            console.log(` Cycle ${i} Hide`);
            const hideRes = await pm.hideBrowserWindowsByProfile(profileDir);
            console.log(`  Status: ${hideRes.status}, Success: ${hideRes.success}`);
            console.log(`  Profile Path: ${hideRes.profileDir}`);
            console.log(`  PID Tree: ${JSON.stringify(hideRes.processIds)}`);
            for (const win of hideRes.windows || []) {
                console.log(`  HWND: ${win.hwnd}, Pid: ${win.pid}, wasVisible: ${win.wasVisible}, isVisible: ${win.isVisible}, alreadyInTargetState: ${win.alreadyInTargetState}`);
            }

            const anyVisible = (hideRes.windows || []).some(win => win.isVisible);
            if (!anyVisible && hideRes.success && (hideRes.windows || []).length > 0) {
                successCount++;
                console.log(`  -> Cycle ${i} Hide PASS`);
            } else {
                console.log(`  -> Cycle ${i} Hide FAIL: anyVisible=${anyVisible}, success=${hideRes.success}, count=${(hideRes.windows || []).length}`);
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            console.log(` Cycle ${i} Show`);
            const showRes = await pm.showBrowserWindowsByProfile(profileDir);
            console.log(`  Status: ${showRes.status}, Success: ${showRes.success}`);
            for (const win of showRes.windows || []) {
                console.log(`  HWND: ${win.hwnd}, Pid: ${win.pid}, wasVisible: ${win.wasVisible}, isVisible: ${win.isVisible}, alreadyInTargetState: ${win.alreadyInTargetState}`);
            }
            const allVisible = (showRes.windows || []).length > 0 && (showRes.windows || []).every(win => win.isVisible);
            if (allVisible && showRes.success) {
                console.log(`  -> Cycle ${i} Show PASS`);
            } else {
                console.log(`  -> Cycle ${i} Show FAIL: allVisible=${allVisible}, success=${showRes.success}`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        
        console.log(`Closing ${profileName} browser...`);
        await browser.close();
        return successCount === 5;
    }
    
    const hueOk = await runCycle('HUE');
    const tctOk = await runCycle('TCT');
    
    if (hueOk && tctOk) {
        console.log('\nAll smoke tests passed 5/5 cycles for HUE and TCT.');
        process.exit(0);
    } else {
        console.error('\nSmoke tests failed.');
        process.exit(1);
    }
})();
