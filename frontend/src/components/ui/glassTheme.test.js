import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { URL } from 'node:url';

test('UI-GLASS-THEME-01: index.css contains required theme tokens and glass utilities', () => {
  const css = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

  // 1. Theme Tokens
  assert.ok(css.includes('--color-vnpost-blue'), 'Must define VNPost blue token');
  assert.ok(css.includes('--color-vnpost-orange'), 'Must define VNPost orange token');
  assert.ok(css.includes('--color-f11-family'), 'Must define F1.1 family green token');
  assert.ok(css.includes('--color-f13-family'), 'Must define F1.3 family blue token');
  assert.ok(css.includes('--color-f41-family'), 'Must define F4.1 family orange token');

  // 2. Glass Surfaces
  assert.ok(css.includes('.glass'), 'Must define .glass utility');
  assert.ok(css.includes('.glass-panel'), 'Must define .glass-panel utility');
  assert.ok(css.includes('.glass-card'), 'Must define .glass-card utility');
  assert.ok(css.includes('.glass-strong'), 'Must define .glass-strong utility');
  assert.ok(css.includes('.glass-solid'), 'Must define .glass-solid for opaque fallback');
  assert.ok(css.includes('.bg-glass-canvas'), 'Must define .bg-glass-canvas ambient background');

  // 3. Shared Control Classes
  assert.ok(css.includes('.btn-glass-primary'), 'Must define .btn-glass-primary');
  assert.ok(css.includes('.btn-glass-secondary'), 'Must define .btn-glass-secondary');
  assert.ok(css.includes('.btn-glass-ghost'), 'Must define .btn-glass-ghost');
  assert.ok(css.includes('.btn-glass-danger'), 'Must define .btn-glass-danger');
  assert.ok(css.includes('.input-glass'), 'Must define .input-glass');
  assert.ok(css.includes('.badge-glass'), 'Must define .badge-glass');

  // 4. Fallbacks for compatibility and accessibility
  assert.ok(css.includes('@supports not (backdrop-filter: blur(1px))'), 'Must include solid fallback for unsupported backdrop-filter');
  assert.ok(css.includes('@media (prefers-reduced-transparency: reduce)'), 'Must respect prefers-reduced-transparency');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must respect prefers-reduced-motion');
});

test('UI-GLASS-THEME-01: Shared UI components exist and define interactive states', () => {
  const buttonSource = fs.readFileSync(new URL('./Button.jsx', import.meta.url), 'utf8');
  assert.ok(buttonSource.includes('export default function Button'), 'Button must be default exported');
  assert.ok(buttonSource.includes('disabled'), 'Button must handle disabled state');
  assert.ok(buttonSource.includes('loading'), 'Button must handle loading state');
  assert.ok(buttonSource.includes('active:scale'), 'Button must have active press effect');

  const inputSource = fs.readFileSync(new URL('./Input.jsx', import.meta.url), 'utf8');
  assert.ok(inputSource.includes('export default function Input'), 'Input must be default exported');
  assert.ok(inputSource.includes('input-glass'), 'Input must use input-glass styling');

  const selectSource = fs.readFileSync(new URL('./Select.jsx', import.meta.url), 'utf8');
  assert.ok(selectSource.includes('export default function Select'), 'Select must be default exported');
  assert.ok(selectSource.includes('input-glass'), 'Select must use input-glass styling');

  const badgeSource = fs.readFileSync(new URL('./Badge.jsx', import.meta.url), 'utf8');
  assert.ok(badgeSource.includes('export default function Badge'), 'Badge must be default exported');
  assert.ok(badgeSource.includes('badge-glass'), 'Badge must use badge-glass styling');

  const cardSource = fs.readFileSync(new URL('./Card.jsx', import.meta.url), 'utf8');
  assert.ok(cardSource.includes('export default function Card'), 'Card must be default exported');
  assert.ok(cardSource.includes('glass-panel') || cardSource.includes('glass-card'), 'Card must support glass variants');

  // UI-GLASS-THEME-02 Extended Controls
  const tabsSource = fs.readFileSync(new URL('./Tabs.jsx', import.meta.url), 'utf8');
  assert.ok(tabsSource.includes('export default function Tabs'), 'Tabs must be default exported');
  assert.ok(tabsSource.includes('role="tablist"'), 'Tabs must have role tablist');

  const modalSource = fs.readFileSync(new URL('./Modal.jsx', import.meta.url), 'utf8');
  assert.ok(modalSource.includes('export default function Modal'), 'Modal must be default exported');
  assert.ok(modalSource.includes('role="dialog"'), 'Modal must have role dialog');

  const tooltipSource = fs.readFileSync(new URL('./Tooltip.jsx', import.meta.url), 'utf8');
  assert.ok(tooltipSource.includes('export default function Tooltip'), 'Tooltip must be default exported');
  assert.ok(tooltipSource.includes('role="tooltip"'), 'Tooltip must have role tooltip');

  const toggleSource = fs.readFileSync(new URL('./Toggle.jsx', import.meta.url), 'utf8');
  assert.ok(toggleSource.includes('export default function Toggle'), 'Toggle must be default exported');
  assert.ok(toggleSource.includes('role="switch"'), 'Toggle must have role switch');

  const paginationSource = fs.readFileSync(new URL('./Pagination.jsx', import.meta.url), 'utf8');
  assert.ok(paginationSource.includes('export default function Pagination'), 'Pagination must be default exported');
});

test('UI-GLASS-THEME-01: Shell components use glass theme classes', () => {
  const sharedLayout = fs.readFileSync(new URL('../shared/SharedLayout.jsx', import.meta.url), 'utf8');
  assert.ok(sharedLayout.includes('glass-sidebar'), 'SharedLayout must use glass-sidebar');
  assert.ok(sharedLayout.includes('bg-glass-canvas'), 'SharedLayout must use bg-glass-canvas');

  const topbar = fs.readFileSync(new URL('../Topbar.jsx', import.meta.url), 'utf8');
  assert.ok(topbar.includes('glass-header'), 'Topbar must use glass-header');

  const loginPage = fs.readFileSync(new URL('../../pages/LoginPage.jsx', import.meta.url), 'utf8');
  assert.ok(loginPage.includes('glass-card'), 'LoginPage must showcase glass-card');
  assert.ok(loginPage.includes('bg-glass-canvas'), 'LoginPage must use bg-glass-canvas');
});

test('UI-GLASS-THEME-01 review fixes: reduced-motion never touches transform; component classes sit in a layer below Tailwind utilities', () => {
  const css = fs.readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

  // B1: Leaflet tiles/markers and Recharts SVG groups are positioned with transform.
  const motionBlock = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  const motionRule = motionBlock.slice(0, motionBlock.indexOf('\n}\n') + 3);
  assert.ok(!/transform\s*:/.test(motionRule), 'reduced-motion rule must not set transform on every element');

  // S1: unlayered classes beat Tailwind utilities (pl-10, py-3, rounded-*), so they must be in @layer components.
  const layerStart = css.indexOf('@layer components {');
  assert.ok(layerStart > 0, 'glass component classes must be wrapped in @layer components');
  const layerBody = css.slice(layerStart, css.indexOf('FALLBACKS FOR NO BACKDROP-FILTER'));
  for (const cls of ['.glass-panel', '.btn-glass', '.input-glass', '.badge-glass', '.glass-sidebar']) {
    assert.ok(layerBody.includes(`${cls} {`) || layerBody.includes(`${cls},`), `${cls} must be inside @layer components`);
  }

  // Fallbacks cover every blurred surface.
  const supports = css.slice(css.indexOf('@supports not (backdrop-filter'), css.indexOf('@media (prefers-reduced-transparency'));
  for (const cls of ['.glass-strong', '.glass-subtle', '.input-glass']) {
    assert.ok(supports.includes(cls), `${cls} needs the no-backdrop-filter fallback`);
  }
});
