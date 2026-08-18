import assert from 'node:assert/strict';
import fs from 'node:fs';

const panelSource = fs.readFileSync(new URL('./AutoBackfillOperatorPanel.jsx', import.meta.url), 'utf8');
const pageSource = fs.readFileSync(new URL('../pages/DataImportCenter.jsx', import.meta.url), 'utf8');

console.log('Running AUTO-BACKFILL-UI component and integration checks...');

// 1. DataImportCenter mounts AutoBackfillOperatorPanel
assert.match(
  pageSource,
  /import AutoBackfillOperatorPanel from '\.\.\/components\/AutoBackfillOperatorPanel';/,
  'DataImportCenter must import AutoBackfillOperatorPanel'
);

assert.match(
  pageSource,
  /<AutoBackfillOperatorPanel \/>/,
  'DataImportCenter must render AutoBackfillOperatorPanel in PLATFORM mode'
);

// 2. Panel component structure & data test IDs
assert.match(
  panelSource,
  /data-testid="auto-backfill-operator-panel"/,
  'AutoBackfillOperatorPanel must have data-testid="auto-backfill-operator-panel"'
);

// 3. API Route Wiring
assert.match(
  panelSource,
  /api\.get\('\/import\/auto-backfill\/coverage'/,
  'Coverage scan must call GET /import/auto-backfill/coverage'
);

assert.match(
  panelSource,
  /api\.post\('\/import\/auto-backfill\/runs'/,
  'Create Run action must call POST /import/auto-backfill/runs'
);

assert.match(
  panelSource,
  /api\.post\(`\/import\/auto-backfill\/runs\/\${activeRunId}\/pause`\)/,
  'Pause Run action must call POST /import/auto-backfill/runs/:id/pause'
);

assert.match(
  panelSource,
  /api\.post\(`\/import\/auto-backfill\/runs\/\${activeRunId}\/resume`\)/,
  'Resume Run action must call POST /import/auto-backfill/runs/:id/resume'
);

assert.match(
  panelSource,
  /api\.post\(`\/import\/auto-backfill\/runs\/\${activeRunId}\/circuit\/reset`\)/,
  'Circuit Reset action must call POST /import/auto-backfill/runs/:id/circuit/reset'
);

assert.match(
  panelSource,
  /api\.get\(`\/import\/auto-backfill\/runs\/\${runId}\/events`\)/,
  'Events Audit must call GET /import/auto-backfill/runs/:id/events'
);

assert.match(
  panelSource,
  /api\.get\(`\/import\/auto-backfill\/runs\/\${runId}\/report`\)/,
  'PO Report must call GET /import/auto-backfill/runs/:id/report'
);

// 4. Guidance Banners for Special States
assert.match(
  panelSource,
  /data-testid="waiting-auth-banner"/,
  'WAITING_AUTH guidance banner must be present'
);

assert.match(
  panelSource,
  /data-testid="circuit-open-banner"/,
  'CIRCUIT_OPEN guidance banner must be present'
);

assert.match(
  panelSource,
  /data-testid="blocked-integrity-banner"/,
  'BLOCKED_INTEGRITY guidance banner must be present'
);

// 5. Indicators & Source Lanes distinction
assert.match(
  panelSource,
  /F1\.3/,
  'F1.3 indicator must be surfaced'
);

assert.match(
  panelSource,
  /F4\.1/,
  'F4.1 indicator must be surfaced'
);

assert.match(
  panelSource,
  /HUE/,
  'HUE source lane must be surfaced'
);

assert.match(
  panelSource,
  /TCT/,
  'TCT source lane must be surfaced'
);

console.log('ALL AUTO-BACKFILL-UI component checks PASSED!');
