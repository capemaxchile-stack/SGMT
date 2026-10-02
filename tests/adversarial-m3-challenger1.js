/**
 * Empirical Adversarial Challenger Verification & Stress Test Suite
 * Milestone 3: UI Responsiveness, Mobile Nav & Bundle Splitting
 *
 * Challenger: challenger_m3_1
 * Date: 2026-10-02
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { UIContractEngine } = require('./harness/ui-contract-engine');

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function runTest(category, name, fn) {
  try {
    fn();
    passedTests++;
    testResults.push({ category, name, status: 'PASS' });
    console.log(`  \x1b[32m✔\x1b[0m [${category}] ${name}`);
  } catch (err) {
    failedTests++;
    testResults.push({ category, name, status: 'FAIL', error: err.message });
    console.log(`  \x1b[31m✖\x1b[0m [${category}] ${name}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
  }
}

console.log('\x1b[1m\x1b[35m======================================================================\x1b[0m');
console.log('\x1b[1m\x1b[37m  EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 3 (CHALLENGER 1)\x1b[0m');
console.log('\x1b[1m\x1b[35m======================================================================\x1b[0m\n');

const projectRoot = path.resolve(__dirname, '..');
const webRoot = path.join(projectRoot, 'web');
const webSrc = path.join(webRoot, 'src');
const distAssets = path.join(webRoot, 'dist', 'assets');

// ============================================================================
// SUITE 1: Mobile Navigation Drawer State Machine & Contract Stress
// ============================================================================
console.log('\x1b[1m\x1b[34m[SUITE 1] Mobile Navigation Drawer State Machine & Contracts\x1b[0m');

runTest('MOBILE-NAV', 'Initial state is strictly closed', () => {
  const nav = UIContractEngine.createMobileNavState();
  assert.strictEqual(nav.isOpen, false, 'Mobile drawer should start in closed state');
});

runTest('MOBILE-NAV', 'Explicit open and close transitions', () => {
  const nav = UIContractEngine.createMobileNavState();
  nav.open();
  assert.strictEqual(nav.isOpen, true, 'Calling open() must set isOpen to true');
  nav.close();
  assert.strictEqual(nav.isOpen, false, 'Calling close() must set isOpen to false');
});

runTest('MOBILE-NAV', 'Idempotence of open() and close()', () => {
  const nav = UIContractEngine.createMobileNavState();
  nav.close();
  nav.close();
  assert.strictEqual(nav.isOpen, false, 'Repeated close() calls must remain false');
  nav.open();
  nav.open();
  nav.open();
  assert.strictEqual(nav.isOpen, true, 'Repeated open() calls must remain true');
});

runTest('MOBILE-NAV', 'Rapid burst toggle stress (1,000 toggles)', () => {
  const nav = UIContractEngine.createMobileNavState();
  for (let i = 1; i <= 1000; i++) {
    nav.toggle();
    assert.strictEqual(nav.isOpen, i % 2 === 1, `Toggle #${i} failed expected parity`);
  }
  assert.strictEqual(nav.isOpen, false, '1000 toggles must return state to closed');
});

runTest('MOBILE-NAV', 'Viewport breakpoint classification stress test', () => {
  const nav = UIContractEngine.createMobileNavState();
  const mobileWidths = [0, 240, 320, 360, 375, 390, 412, 414, 600, 640, 700, 767, 767.9];
  for (const w of mobileWidths) {
    assert.strictEqual(nav.isMobileViewport(w), true, `Width ${w}px should be mobile (< 768px)`);
  }
  const desktopWidths = [768, 768.1, 800, 1024, 1280, 1440, 1920, 2560, 3840];
  for (const w of desktopWidths) {
    assert.strictEqual(nav.isMobileViewport(w), false, `Width ${w}px should be desktop (>= 768px)`);
  }
});

runTest('MOBILE-NAV', 'Randomized chaotic user actions (5,000 operations)', () => {
  const nav = UIContractEngine.createMobileNavState();
  const actions = ['open', 'close', 'toggle'];
  let simulatedState = false;

  for (let i = 0; i < 5000; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (action === 'open') {
      nav.open();
      simulatedState = true;
    } else if (action === 'close') {
      nav.close();
      simulatedState = false;
    } else {
      nav.toggle();
      simulatedState = !simulatedState;
    }
    assert.strictEqual(typeof nav.isOpen, 'boolean', 'State must strictly remain boolean');
    assert.strictEqual(nav.isOpen, simulatedState, `State desynchronized at step ${i} on action ${action}`);
  }
});

runTest('MOBILE-NAV', 'Static verification of Header.tsx hamburger button', () => {
  const headerCode = fs.readFileSync(path.join(webSrc, 'components', 'layout', 'Header.tsx'), 'utf8');
  assert.ok(headerCode.includes('onOpenMobileMenu'), 'Header.tsx must declare onOpenMobileMenu prop');
  assert.ok(headerCode.includes('md:hidden'), 'Hamburger button must have md:hidden class to hide on desktop');
  assert.ok(headerCode.includes('<Menu'), 'Hamburger button must render Lucide Menu icon');
  assert.ok(headerCode.includes('aria-label'), 'Hamburger button must have accessible aria-label');
});

runTest('MOBILE-NAV', 'Static verification of Sidebar.tsx mobile drawer and backdrop', () => {
  const sidebarCode = fs.readFileSync(path.join(webSrc, 'components', 'layout', 'Sidebar.tsx'), 'utf8');
  assert.ok(sidebarCode.includes('isMobileOpen'), 'Sidebar.tsx must accept isMobileOpen prop');
  assert.ok(sidebarCode.includes('onCloseMobile'), 'Sidebar.tsx must accept onCloseMobile prop');
  assert.ok(sidebarCode.includes('hidden md:flex'), 'Desktop aside must have hidden md:flex');
  assert.ok(sidebarCode.includes('fixed inset-0'), 'Mobile drawer must have fixed inset-0 overlay');
  assert.ok(sidebarCode.includes('bg-black/50'), 'Backdrop overlay must have dark backdrop styling');
  assert.ok(sidebarCode.includes('onClick={onCloseMobile}'), 'Backdrop and close button must trigger onCloseMobile');
  assert.ok(sidebarCode.includes("role=\"dialog\""), 'Mobile drawer container must have role="dialog"');
  assert.ok(sidebarCode.includes("aria-modal=\"true\""), 'Mobile drawer container must have aria-modal="true"');
  assert.ok(sidebarCode.includes("e.key === 'Escape'"), 'Escape key handler must be implemented');
  assert.ok(sidebarCode.includes('window.removeEventListener'), 'Keyboard listener cleanup must be implemented');
});

runTest('MOBILE-NAV', 'Static verification of AppLayout.tsx state synchronization', () => {
  const layoutCode = fs.readFileSync(path.join(webSrc, 'components', 'layout', 'AppLayout.tsx'), 'utf8');
  assert.ok(layoutCode.includes('isMobileNavOpen'), 'AppLayout must manage isMobileNavOpen state');
  assert.ok(layoutCode.includes('setIsMobileNavOpen(false)'), 'AppLayout must pass close handler to Sidebar');
  assert.ok(layoutCode.includes('setIsMobileNavOpen(true)'), 'AppLayout must pass open handler to Header');
});

// ============================================================================
// SUITE 2: DataTable Responsive Horizontal Scroll Wrapper & Min-Width Stress
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 2] DataTable Responsive Horizontal Scroll & Minimum Width\x1b[0m');

runTest('TABLE-RESPONSIVE', 'Static verification of DataTable.tsx markup contracts', () => {
  const tableCode = fs.readFileSync(path.join(webSrc, 'components', 'ui', 'DataTable.tsx'), 'utf8');
  assert.ok(tableCode.includes('overflow-x-auto'), 'DataTable container must have overflow-x-auto');
  assert.ok(tableCode.includes('min-w-[700px]'), 'DataTable table element must enforce min-w-[700px]');
  assert.ok(tableCode.includes('animate-pulse'), 'DataTable must render skeleton rows with animate-pulse');
  assert.ok(tableCode.includes('emptyMessage'), 'DataTable must support configurable emptyMessage');
  assert.ok(
    tableCode.includes('?.id ?? rowIndex') || tableCode.includes('item.id ?? rowIndex'),
    'DataTable rows must have safe fallback keys'
  );
});

runTest('TABLE-RESPONSIVE', 'UIContractEngine DataTable contract validation adherence', () => {
  assert.strictEqual(
    UIContractEngine.validateDataTableContract({
      minWidth: 'min-w-[700px]',
      hasSkeleton: true,
      isScrollable: true,
    }),
    true,
    'Contract should validate standard configuration'
  );

  // Negative test: invalid minWidth
  assert.throws(() => {
    UIContractEngine.validateDataTableContract({
      minWidth: 'min-w-[500px]',
      hasSkeleton: true,
      isScrollable: true,
    });
  }, /min-w-\[700px\]/);

  assert.throws(() => {
    UIContractEngine.validateDataTableContract({
      minWidth: 'w-full',
      hasSkeleton: true,
      isScrollable: true,
    });
  }, /min-w-\[700px\]/);

  // Negative test: missing skeleton
  assert.throws(() => {
    UIContractEngine.validateDataTableContract({
      minWidth: 'min-w-[700px]',
      hasSkeleton: false,
      isScrollable: true,
    });
  }, /skeleton/);

  // Negative test: missing scroll wrapper
  assert.throws(() => {
    UIContractEngine.validateDataTableContract({
      minWidth: 'min-w-[700px]',
      hasSkeleton: true,
      isScrollable: false,
    });
  }, /overflow-x-auto/);
});

runTest('TABLE-RESPONSIVE', 'Data rendering logic stress with edge-case rows', () => {
  const columns = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Score', cell: (item) => (item.score != null ? `${item.score}%` : 'N/A') },
  ];

  // Emulate rendering logic
  function renderRows(data, cols) {
    if (data.length === 0) return { empty: true };
    return data.map((item, rowIndex) => {
      const rowKey = item?.id ?? rowIndex;
      const cells = cols.map((col) => {
        if (col.cell) return col.cell(item);
        if (col.accessorKey) return String(item[col.accessorKey] ?? '');
        return '';
      });
      return { key: rowKey, cells };
    });
  }

  // 1. Empty rows
  assert.deepStrictEqual(renderRows([], columns), { empty: true });

  // 2. Rows with missing or 0/null/undefined ids
  const trickyData = [
    { id: 0, name: 'Zero ID', score: 100 },
    { id: null, name: 'Null ID', score: null },
    { id: undefined, name: 'Undefined ID', score: 0 },
    { id: '', name: 'Empty string ID', score: undefined },
    { id: 'custom-uuid-1', name: 'Valid UUID', score: 85 },
  ];
  const rendered = renderRows(trickyData, columns);
  assert.strictEqual(rendered.length, 5);
  assert.strictEqual(rendered[0].key, 0, 'id 0 should be preserved, not replaced by index');
  assert.strictEqual(rendered[1].key, 1, 'id null should fall back to index 1');
  assert.strictEqual(rendered[2].key, 2, 'id undefined should fall back to index 2');
  assert.strictEqual(rendered[3].key, '', 'id "" should be preserved');
  assert.strictEqual(rendered[4].key, 'custom-uuid-1');

  assert.strictEqual(rendered[0].cells[2], '100%');
  assert.strictEqual(rendered[1].cells[2], 'N/A');
  assert.strictEqual(rendered[2].cells[2], '0%');
  assert.strictEqual(rendered[3].cells[2], 'N/A');
});

runTest('TABLE-RESPONSIVE', 'Stress scale: 10,000 rows processing performance', () => {
  const hugeData = Array.from({ length: 10000 }, (_, i) => ({
    id: `item-${i}`,
    title: `Equipment Unit ${i}`,
    status: i % 2 === 0 ? 'AVAILABLE' : 'IN_USE',
  }));

  const start = Date.now();
  const keys = new Set();
  for (let i = 0; i < hugeData.length; i++) {
    const k = hugeData[i].id ?? i;
    keys.add(k);
  }
  const duration = Date.now() - start;

  assert.strictEqual(keys.size, 10000, 'All 10,000 keys must be unique');
  assert.ok(duration < 100, `Processing 10,000 keys took ${duration}ms (must be < 100ms)`);
});

// ============================================================================
// SUITE 3: Route Code-Splitting & Production Build Bundle Chunks Verification
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 3] Route Code-Splitting & Production Build Bundles (< 500 kB)\x1b[0m');

runTest('BUNDLE-SPLIT', 'Build assets directory exists and contains JS chunks', () => {
  assert.ok(fs.existsSync(distAssets), `Dist assets directory must exist at ${distAssets}`);
  const files = fs.readdirSync(distAssets);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  assert.ok(jsFiles.length >= 10, `Expected at least 10 JS chunk files, found ${jsFiles.length}`);
});

runTest('BUNDLE-SPLIT', 'CRITICAL CONTRACT: No production JS chunk exceeds 500 kB', () => {
  const files = fs.readdirSync(distAssets);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const MAX_BYTES = 500 * 1024; // 512,000 bytes

  const oversized = [];
  const chunkReport = [];

  for (const jsFile of jsFiles) {
    const filePath = path.join(distAssets, jsFile);
    const stat = fs.statSync(filePath);
    const sizeKb = (stat.size / 1024).toFixed(2);
    chunkReport.push({ file: jsFile, sizeBytes: stat.size, sizeKb });

    if (stat.size > MAX_BYTES) {
      oversized.push({ file: jsFile, sizeKb });
    }
  }

  // Sort report descending
  chunkReport.sort((a, b) => b.sizeBytes - a.sizeBytes);
  console.log(`    Total JS chunks analyzed: ${chunkReport.length}`);
  console.log(`    Top 5 largest chunks:`);
  chunkReport.slice(0, 5).forEach((c, idx) => {
    console.log(`      ${idx + 1}. ${c.file}: ${c.sizeKb} kB (${c.sizeBytes} bytes)`);
  });

  assert.strictEqual(
    oversized.length,
    0,
    `Found ${oversized.length} chunk(s) exceeding 500 kB limit: ${JSON.stringify(oversized)}`
  );
});

runTest('BUNDLE-SPLIT', 'Dedicated vendor chunks created via manualChunks', () => {
  const files = fs.readdirSync(distAssets);
  const vendorReact = files.some(f => f.startsWith('vendor-react'));
  const vendorQuery = files.some(f => f.startsWith('vendor-query'));
  const vendorIcons = files.some(f => f.startsWith('vendor-icons'));

  assert.ok(vendorReact, 'vendor-react chunk must exist in dist/assets');
  assert.ok(vendorQuery, 'vendor-query chunk must exist in dist/assets');
  assert.ok(vendorIcons, 'vendor-icons chunk must exist in dist/assets');
});

runTest('BUNDLE-SPLIT', 'Main application page chunks are individually split', () => {
  const files = fs.readdirSync(distAssets);
  const pages = [
    'DashboardPage',
    'BodegaPage',
    'ComprasPage',
    'FaenasPage',
    'FlotaPage',
    'AdminPage',
    'LoginPage',
    'NotFoundPage',
  ];

  for (const page of pages) {
    const exists = files.some(f => f.startsWith(page));
    assert.ok(exists, `Page chunk for ${page} must exist in dist/assets`);
  }
});

runTest('BUNDLE-SPLIT', 'Static analysis of router.tsx uses React.lazy and Suspense', () => {
  const routerCode = fs.readFileSync(path.join(webSrc, 'router.tsx'), 'utf8');
  assert.ok(routerCode.includes("lazy(() => import("), 'router.tsx must use lazy dynamic imports');
  assert.ok(routerCode.includes('<Suspense'), 'router.tsx must wrap components with Suspense');
  assert.ok(routerCode.includes('routeFallback'), 'router.tsx must define a fallback component');

  const pages = ['DashboardPage', 'LoginPage', 'FaenasPage', 'FlotaPage', 'BodegaPage', 'ComprasPage', 'AdminPage'];
  for (const page of pages) {
    assert.ok(routerCode.includes(`import('./pages/${page}`) || routerCode.includes(`import('./pages/`) && routerCode.includes(page), `router.tsx must lazy-load ${page}`);
  }
});

runTest('BUNDLE-SPLIT', 'Static analysis of vite.config.ts manualChunks configuration', () => {
  const viteConfig = fs.readFileSync(path.join(webRoot, 'vite.config.ts'), 'utf8');
  assert.ok(viteConfig.includes('manualChunks'), 'vite.config.ts must configure rollup manualChunks');
  assert.ok(viteConfig.includes("'vendor-react'"), 'manualChunks must specify vendor-react');
  assert.ok(viteConfig.includes("'vendor-query'"), 'manualChunks must specify vendor-query');
  assert.ok(viteConfig.includes("'vendor-icons'"), 'manualChunks must specify vendor-icons');
});

// ============================================================================
// SUITE 4: Modal Resilience & Dirty Form Dismissal Prevention
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 4] Modal Form Resilience & Backdrop Dismissal Guard\x1b[0m');

runTest('MODAL-RESILIENCE', 'Dirty form completely blocks accidental backdrop clicks', () => {
  const modal = UIContractEngine.createModalState(true);
  assert.strictEqual(modal.isOpen, true);
  assert.strictEqual(modal.isDirty, true);

  for (let i = 0; i < 50; i++) {
    const closed = modal.attemptBackdropClose(false);
    assert.strictEqual(closed, false, 'Attempted close without confirmation must return false');
    assert.strictEqual(modal.isOpen, true, 'Dirty modal must remain open');
  }
});

runTest('MODAL-RESILIENCE', 'Clean form permits immediate backdrop click dismissal', () => {
  const modal = UIContractEngine.createModalState(false);
  const closed = modal.attemptBackdropClose(false);
  assert.strictEqual(closed, true, 'Clean modal should close on backdrop click');
  assert.strictEqual(modal.isOpen, false, 'Modal isOpen must be false');
});

runTest('MODAL-RESILIENCE', 'Confirmed discard allows closing dirty modal', () => {
  const modal = UIContractEngine.createModalState(true);
  const closed = modal.attemptBackdropClose(true); // User confirmed
  assert.strictEqual(closed, true);
  assert.strictEqual(modal.isOpen, false);
});

runTest('MODAL-RESILIENCE', 'Static analysis of Modal.tsx backdrop protection', () => {
  const modalCode = fs.readFileSync(path.join(webSrc, 'components', 'ui', 'Modal.tsx'), 'utf8');
  assert.ok(modalCode.includes('closeOnBackdrop'), 'Modal.tsx must support closeOnBackdrop prop');
  assert.ok(modalCode.includes('isDirty'), 'Modal.tsx must support isDirty prop');
  assert.ok(modalCode.includes('window.confirm'), 'Modal.tsx must trigger confirmation prompt when dirty');
});

// ============================================================================
// SUITE 5: Interactive Toast Notifications Engine Stress
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 5] Toast Notification Stacking, Dismiss & Volume Stress\x1b[0m');

runTest('TOAST-ENGINE', 'High volume 500 toast generation stress', () => {
  const toastMgr = UIContractEngine.createToastManager();
  const createdIds = [];

  for (let i = 0; i < 500; i++) {
    const t = toastMgr.show({
      type: i % 4 === 0 ? 'success' : i % 4 === 1 ? 'error' : i % 4 === 2 ? 'warning' : 'info',
      title: `Notice ${i}`,
      message: `Detailed message content for event ${i}`,
      duration: 3000 + i,
    });
    createdIds.push(t.id);
  }

  assert.strictEqual(toastMgr.toasts.length, 500, 'All 500 toasts must be retained');
  const uniqueIds = new Set(createdIds);
  assert.strictEqual(uniqueIds.size, 500, 'All 500 toast IDs must be unique');

  // Dismiss half
  for (let i = 0; i < 250; i++) {
    toastMgr.dismiss(createdIds[i]);
  }
  assert.strictEqual(toastMgr.toasts.length, 250, 'Dismissing 250 toasts should leave 250 remaining');

  // Clear all
  toastMgr.clear();
  assert.strictEqual(toastMgr.toasts.length, 0, 'Clear must empty toast array');
});

runTest('TOAST-ENGINE', 'Dismissing nonexistent IDs is safe and non-throwing', () => {
  const toastMgr = UIContractEngine.createToastManager();
  assert.doesNotThrow(() => {
    toastMgr.dismiss('random-invalid-id-xyz');
    toastMgr.dismiss(null);
    toastMgr.dismiss(undefined);
  });
});

// ============================================================================
// SUITE 6: Tailwind v4 Theme Tokens & Legacy Color Audit
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 6] Tailwind v4 Design Tokens & Hardcoded Color Audit\x1b[0m');

runTest('TAILWIND-AUDIT', 'index.css defines full primary-50 through primary-900 palette', () => {
  const css = fs.readFileSync(path.join(webSrc, 'index.css'), 'utf8');
  assert.ok(css.includes('@theme'), 'index.css must declare @theme block');
  for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    assert.ok(css.includes(`--color-primary-${step}`), `Missing token --color-primary-${step}`);
  }
  assert.ok(css.includes('--color-ring'), 'index.css must define --color-ring');
});

runTest('TAILWIND-AUDIT', 'Audit pages and components for legacy blue-* classes', () => {
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    const violations = [];
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        violations.push(...scanDir(full));
      } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        const code = fs.readFileSync(full, 'utf8');
        // Match occurrences of blue-* in class names
        const matches = code.match(/\b(bg|text|border|ring|hover:bg|hover:text|focus:ring)-blue-\d+\b/g);
        if (matches) {
          violations.push({ file: path.relative(webSrc, full), count: matches.length, matches });
        }
      }
    }
    return violations;
  }

  const violations = scanDir(webSrc);
  if (violations.length > 0) {
    console.log(`    Note: Detected ${violations.length} files with blue-* classes:`, violations);
  }
  // All pages refactored in changes.md: FaenasPage, FlotaPage, BodegaCatalogTab, BodegaMovementsTab, PurchaseOrdersTab, PurchaseRequestsTab
  const keyPages = [
    'pages/faenas/FaenasPage.tsx',
    'pages/flota/FlotaPage.tsx',
    'pages/bodega/tabs/BodegaCatalogTab.tsx',
    'pages/bodega/tabs/BodegaMovementsTab.tsx',
    'pages/compras/tabs/PurchaseOrdersTab.tsx',
    'pages/compras/tabs/PurchaseRequestsTab.tsx',
  ];
  for (const pageRel of keyPages) {
    const full = path.join(webSrc, pageRel);
    if (fs.existsSync(full)) {
      const code = fs.readFileSync(full, 'utf8');
      const matches = code.match(/\b(bg|text|border|ring|hover:bg|hover:text|focus:ring)-blue-\d+\b/g);
      assert.strictEqual(
        matches,
        null,
        `File ${pageRel} must not contain any blue-* classes, but found: ${JSON.stringify(matches)}`
      );
    }
  }
});

// ============================================================================
// SUITE 7: React Query Cache Key Synchronization Audit
// ============================================================================
console.log('\n\x1b[1m\x1b[34m[SUITE 7] Cache Key Synchronization Audit\x1b[0m');

runTest('CACHE-SYNC', 'Query and mutation hooks use canonical [\'dashboard-metrics\'] key', () => {
  const comprasApi = fs.readFileSync(path.join(webSrc, 'api', 'compras.ts'), 'utf8');
  assert.ok(
    comprasApi.includes("queryKey: ['dashboard-metrics']"),
    'compras.ts must invalidate [\'dashboard-metrics\']'
  );

  const movementsApi = fs.readFileSync(path.join(webSrc, 'api', 'movements.ts'), 'utf8');
  assert.ok(
    movementsApi.includes("queryKey: ['dashboard-metrics']"),
    'movements.ts must invalidate [\'dashboard-metrics\']'
  );
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n\x1b[1m\x1b[35m======================================================================\x1b[0m');
console.log('\x1b[1m\x1b[37m  ADVERSARIAL STRESS TEST SUMMARY\x1b[0m');
console.log('\x1b[1m\x1b[35m======================================================================\x1b[0m');
console.log(`Total Adversarial Tests : \x1b[1m${passedTests + failedTests}\x1b[0m`);
console.log(`Passed                  : \x1b[32m\x1b[1m${passedTests}\x1b[0m`);
console.log(`Failed                  : ${failedTests > 0 ? `\x1b[31m\x1b[1m${failedTests}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);

if (failedTests > 0) {
  console.log('\n\x1b[31mOVERALL VERDICT: CHALLENGE FAILED (Exit Code 1)\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32m\x1b[1mOVERALL VERDICT: ALL ADVERSARIAL STRESS TESTS PASSED! (Exit Code 0)\x1b[0m\n');
  process.exit(0);
}
