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

  // Find the scrollable container
  const scrollInfo = await page.evaluate(() => {
    // Find all elements that have overflow and are scrollable
    const allEls = Array.from(document.querySelectorAll('*'));
    const scrollable = allEls.filter(el => {
      const style = getComputedStyle(el);
      const overflow = style.overflow + style.overflowY;
      return (overflow.includes('auto') || overflow.includes('scroll')) && el.scrollHeight > el.clientHeight;
    });
    return scrollable.map(el => ({
      tag: el.tagName,
      className: el.className.substring(0, 80),
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      id: el.id,
    }));
  });

  console.log('Scrollable elements:', JSON.stringify(scrollInfo, null, 2));

  // Also find all h3 positions
  const h3Info = await page.evaluate(() => {
    const h3s = Array.from(document.querySelectorAll('h3'));
    return h3s.map(h => ({
      text: h.textContent.substring(0, 60),
      offsetTop: h.offsetTop,
      scrollTop: h.getBoundingClientRect().top,
    }));
  });
  console.log('H3 positions:', JSON.stringify(h3Info, null, 2));

  await browser.close();
}

async function main() {
  const resp = await loginAPI();
  const sessionToken = resp?.data?.session_id || null;
  await captureViewport({ width: 1440, height: 900, name: '1440x900' }, sessionToken);
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
