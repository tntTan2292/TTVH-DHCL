const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const artifactsDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\2b95337b-feb1-40a9-8460-3081877a735d';

function loginAPI() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: 'admin', password: 'admin123' });
    const options = {
      hostname: '127.0.0.1', port: 5050,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body }); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Scroll main element to a specific position and screenshot
async function scrollAndCapture(page, scrollTop, filename) {
  await page.evaluate((st) => {
    const main = document.querySelector('main.overflow-y-auto, main[class*="overflow-y"]');
    if (main) main.scrollTop = st;
    else window.scrollTo(0, st);
  }, scrollTop);
  await page.waitForTimeout(500);
  await page.screenshot({ path: filename });
}

async function captureViewport(vp, sessionToken) {
  console.log('\nCapturing ' + vp.name + '...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

  if (sessionToken) {
    await context.addInitScript(function(token) {
      window.localStorage.setItem('qis_auth_session', token);
    }, sessionToken);
  }

  const page = await context.newPage();
  await page.goto('http://localhost:5178/f13/dashboard', {
    waitUntil: 'networkidle',
    timeout: 25000,
  }).catch(e => console.error('Nav err:', e.message));
  await page.waitForTimeout(4000);

  // Get actual h3 offsets
  const h3Info = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3'));
    const main = document.querySelector('main.overflow-y-auto, main[class*="overflow-y"]');
    return {
      mainScrollHeight: main ? main.scrollHeight : 0,
      mainClientHeight: main ? main.clientHeight : 0,
      h3s: h3s.map(h => ({ text: h.textContent.substring(0, 60), offsetTop: h.offsetTop })),
    };
  });
  console.log('H3 info:', JSON.stringify(h3Info));

  const h3Map = {};
  h3Info.h3s.forEach(h => { h3Map[h.text.trim().substring(0, 20)] = h.offsetTop; });

  // G1: Executive Overview — scroll to top
  await scrollAndCapture(page, 0,
    path.join(artifactsDir, 'ph4_g1_exec_overview_' + vp.name + '.png'));
  console.log('  g1 done');

  // G2: BCVH Table — scroll to BCVH table heading
  const g2Top = h3Info.h3s.find(h => h.text.includes('Bảng'))?.offsetTop || 700;
  await scrollAndCapture(page, Math.max(0, g2Top - 16),
    path.join(artifactsDir, 'ph4_g2_bcvh_table_' + vp.name + '.png'));
  console.log('  g2 done (scrollTop=' + g2Top + ')');

  // G3: Trend Workspace
  const g3Top = h3Info.h3s.find(h => h.text.includes('Xu hướng'))?.offsetTop || 1385;
  await scrollAndCapture(page, Math.max(0, g3Top - 16),
    path.join(artifactsDir, 'ph4_g3_trend_workspace_' + vp.name + '.png'));
  console.log('  g3 done (scrollTop=' + g3Top + ')');

  // G4: Operating Patterns
  const g4Top = h3Info.h3s.find(h => h.text.includes('Quy luật'))?.offsetTop || 2215;
  await scrollAndCapture(page, Math.max(0, g4Top - 16),
    path.join(artifactsDir, 'ph4_g4_operating_patterns_' + vp.name + '.png'));
  console.log('  g4 done (scrollTop=' + g4Top + ')');

  // G5: Action Center
  const g5Top = h3Info.h3s.find(h => h.text.includes('Trung tâm'))?.offsetTop || 3038;
  await scrollAndCapture(page, Math.max(0, g5Top - 16),
    path.join(artifactsDir, 'ph4_g5_action_center_' + vp.name + '.png'));
  console.log('  g5 done (scrollTop=' + g5Top + ')');

  await browser.close();
  return h3Info;
}

async function main() {
  const resp = await loginAPI();
  const sessionToken = resp?.data?.session_id || null;
  console.log('Logged in:', sessionToken ? 'yes' : 'no');

  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1366, height: 768, name: '1366x768' },
  ];

  for (var i = 0; i < viewports.length; i++) {
    await captureViewport(viewports[i], sessionToken);
  }

  console.log('\nAll captures complete!');
}

main().catch(err => { console.error(err); process.exit(1); });
