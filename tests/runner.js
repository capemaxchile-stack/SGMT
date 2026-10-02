#!/usr/bin/env node

/**
 * SGMT Master Opaque-Box E2E Test Runner
 * Executes Tiers 1-4 test suites and returns exit code 0 on complete pass.
 */

const { runSuites, resetSuites } = require('./harness');
const path = require('path');

// Parse CLI Arguments
const args = process.argv.slice(2);
let tierFilter = null;
let nameFilter = null;
let verbose = false;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    tierFilter = arg.split('=')[1];
  } else if (arg.startsWith('--filter=')) {
    nameFilter = arg.split('=')[1];
  } else if (arg === '--verbose' || arg === '-v') {
    verbose = true;
  }
}

console.log('\x1b[1m\x1b[34m============================================================\x1b[0m');
console.log('\x1b[1m\x1b[37m  SGMT Opaque-Box E2E Test Suite (Tiers 1 - 4)\x1b[0m');
console.log('\x1b[1m\x1b[34m============================================================\x1b[0m');
console.log(`Node Runtime : ${process.version}`);
console.log(`Working Dir  : ${process.cwd()}`);
console.log(`Tier Filter  : ${tierFilter ? 'Tier ' + tierFilter : 'All Tiers (1-4)'}`);
console.log(`Verbose Mode : ${verbose ? 'ON' : 'OFF'}\n`);

// Load all suites
resetSuites();

// Tier 1: Feature Coverage (>=5 test cases per feature)
require('./tier1-feature/security-features.test');
require('./tier1-feature/logic-features.test');
require('./tier1-feature/ui-sys-features.test');

// Tier 2: Boundary & Corner Cases (>=5 test cases per feature)
require('./tier2-boundary/security-boundaries.test');
require('./tier2-boundary/logic-boundaries.test');
require('./tier2-boundary/ui-sys-boundaries.test');

// Tier 3: Cross-Feature Combinations
require('./tier3-combinations/cross-feature.test');

// Tier 4: Real-World Mining Logistics Scenarios
require('./tier4-scenarios/mining-scenarios.test');

async function main() {
  const result = await runSuites({
    tier: tierFilter,
    filter: nameFilter,
    verbose,
  });

  console.log('\n\x1b[1m\x1b[34m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[37m  EXECUTION SUMMARY & VERIFICATION MATRIX\x1b[0m');
  console.log('\x1b[1m\x1b[34m============================================================\x1b[0m');

  console.log(`Total Test Cases Executed : \x1b[1m${result.total}\x1b[0m`);
  console.log(`Passed                    : \x1b[32m\x1b[1m${result.passed}\x1b[0m`);
  console.log(`Failed                    : ${result.failed > 0 ? `\x1b[31m\x1b[1m${result.failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`Execution Duration        : ${result.durationMs} ms`);

  if (result.failures.length > 0) {
    console.log('\n\x1b[31m\x1b[1mFAILURES REPORT:\x1b[0m');
    for (const fail of result.failures) {
      console.log(`\n\x1b[31m✖ [${fail.suite}] > ${fail.test}\x1b[0m`);
      console.log(`  ${fail.error}`);
    }
    console.log('\n\x1b[31mTEST SUITE RESULT: FAILED (Exit Code 1)\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m\x1b[1mALL TESTS PASSED SUCCESSFULLY! (Exit Code 0)\x1b[0m\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\x1b[31mFatal test runner exception:\x1b[0m', err);
  process.exit(1);
});
