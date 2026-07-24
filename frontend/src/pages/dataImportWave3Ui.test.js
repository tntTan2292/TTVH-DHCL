import assert from 'node:assert/strict';
import fs from 'node:fs';

const pageSource = fs.readFileSync(new URL('./DataImportCenter.jsx', import.meta.url), 'utf8');

console.log('Running Wave 3 UI checks...');

assert.match(
  pageSource,
  /data-testid="hue-session-status"/,
  'HUE session status badge must be present'
);

assert.match(
  pageSource,
  /data-testid="hue-login-stuck"/,
  'HUE login stuck panel must be present'
);

assert.match(
  pageSource,
  /data-testid="lifecycle-timeline"/,
  'Lifecycle timeline component must be present'
);

assert.match(
  pageSource,
  /api\.post\('\/import\/dkcl\/session\/cancel-login',\s*\{\s*source:\s*['"]HUE['"]\s*\}\)/,
  'HUE cancel-login action must be wired to backend cancel-login route'
);

console.log('ALL Wave 3 UI checks PASSED!');
