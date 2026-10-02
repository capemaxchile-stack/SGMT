/**
 * SGMT Opaque-Box Test Harness
 * Minimalist, robust, zero-dependency test runner & assertion engine
 * Supports hierarchical suites, ancestor beforeEach/afterEach hooks, and BigInt serialization
 */

const state = {
  currentSuite: null,
  suites: [],
};

function safeStringify(val) {
  if (typeof val === 'bigint') {
    return val.toString() + 'n';
  }
  try {
    return JSON.stringify(val);
  } catch (e) {
    return String(val);
  }
}

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _evaluate(condition, message) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      throw new Error(message);
    }
  }

  toBe(expected) {
    this._evaluate(
      this.actual === expected,
      `Expected ${safeStringify(this.actual)} ${this.isNot ? 'not to be' : 'to be'} ${safeStringify(expected)}`
    );
  }

  toEqual(expected) {
    const actualStr = safeStringify(this.actual);
    const expectedStr = safeStringify(expected);
    this._evaluate(
      actualStr === expectedStr,
      `Expected ${actualStr} ${this.isNot ? 'not to equal' : 'to equal'} ${expectedStr}`
    );
  }

  toBeDefined() {
    this._evaluate(
      this.actual !== undefined,
      `Expected value ${this.isNot ? 'to be undefined' : 'to be defined'}, but received undefined`
    );
  }

  toBeUndefined() {
    this._evaluate(
      this.actual === undefined,
      `Expected value ${this.isNot ? 'not to be undefined' : 'to be undefined'}, but received ${safeStringify(this.actual)}`
    );
  }

  toBeNull() {
    this._evaluate(
      this.actual === null,
      `Expected value ${this.isNot ? 'not to be null' : 'to be null'}, but received ${safeStringify(this.actual)}`
    );
  }

  toBeTruthy() {
    this._evaluate(
      Boolean(this.actual),
      `Expected ${safeStringify(this.actual)} ${this.isNot ? 'to be falsy' : 'to be truthy'}`
    );
  }

  toBeFalsy() {
    this._evaluate(
      !this.actual,
      `Expected ${safeStringify(this.actual)} ${this.isNot ? 'to be truthy' : 'to be falsy'}`
    );
  }

  toBeGreaterThan(expected) {
    this._evaluate(
      Number(this.actual) > Number(expected),
      `Expected ${this.actual} ${this.isNot ? 'not to be greater than' : 'to be greater than'} ${expected}`
    );
  }

  toBeGreaterThanOrEqual(expected) {
    this._evaluate(
      Number(this.actual) >= Number(expected),
      `Expected ${this.actual} ${this.isNot ? 'not to be >= ' : 'to be >= '} ${expected}`
    );
  }

  toBeLessThan(expected) {
    this._evaluate(
      Number(this.actual) < Number(expected),
      `Expected ${this.actual} ${this.isNot ? 'not to be less than' : 'to be less than'} ${expected}`
    );
  }

  toBeLessThanOrEqual(expected) {
    this._evaluate(
      Number(this.actual) <= Number(expected),
      `Expected ${this.actual} ${this.isNot ? 'not to be <= ' : 'to be <= '} ${expected}`
    );
  }

  toBeCloseTo(expected, numDigits = 2) {
    const diff = Math.abs(Number(this.actual) - Number(expected));
    const tolerance = Math.pow(10, -numDigits) / 2;
    this._evaluate(
      diff < tolerance,
      `Expected ${this.actual} ${this.isNot ? 'not to be close to' : 'to be close to'} ${expected} within ${numDigits} digits`
    );
  }

  toContain(item) {
    let contains = false;
    if (typeof this.actual === 'string') {
      contains = this.actual.includes(item);
    } else if (Array.isArray(this.actual)) {
      contains = this.actual.includes(item) || this.actual.some(x => safeStringify(x) === safeStringify(item));
    } else if (this.actual && typeof this.actual === 'object') {
      contains = item in this.actual;
    }
    this._evaluate(
      contains,
      `Expected collection ${this.isNot ? 'not to contain' : 'to contain'} ${safeStringify(item)}`
    );
  }

  toMatch(regex) {
    const r = typeof regex === 'string' ? new RegExp(regex) : regex;
    this._evaluate(
      r.test(String(this.actual)),
      `Expected ${safeStringify(this.actual)} ${this.isNot ? 'not to match' : 'to match'} ${regex}`
    );
  }

  toThrow(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error(`toThrow requires a function, received ${typeof this.actual}`);
    }
    let threw = false;
    let actualError = null;
    try {
      this.actual();
    } catch (err) {
      threw = true;
      actualError = err;
    }

    if (!threw) {
      this._evaluate(false, `Expected function ${this.isNot ? 'not to throw' : 'to throw'}, but it did not throw`);
      return;
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        const matches = actualError.message.includes(expectedError);
        this._evaluate(
          matches,
          `Expected thrown error message ${this.isNot ? 'not to include' : 'to include'} "${expectedError}", but got "${actualError.message}"`
        );
      } else if (expectedError instanceof RegExp) {
        const matches = expectedError.test(actualError.message);
        this._evaluate(
          matches,
          `Expected thrown error message ${this.isNot ? 'not to match' : 'to match'} ${expectedError}, but got "${actualError.message}"`
        );
      }
    } else {
      this._evaluate(true, '');
    }
  }

  async toThrowAsync(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error(`toThrowAsync requires a function, received ${typeof this.actual}`);
    }
    let threw = false;
    let actualError = null;
    try {
      await this.actual();
    } catch (err) {
      threw = true;
      actualError = err;
    }

    if (!threw) {
      this._evaluate(false, `Expected async function ${this.isNot ? 'not to throw' : 'to throw'}, but it did not throw`);
      return;
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        const matches = actualError.message.includes(expectedError);
        this._evaluate(
          matches,
          `Expected thrown error message ${this.isNot ? 'not to include' : 'to include'} "${expectedError}", but got "${actualError.message}"`
        );
      } else if (expectedError instanceof RegExp) {
        const matches = expectedError.test(actualError.message);
        this._evaluate(
          matches,
          `Expected thrown error message ${this.isNot ? 'not to match' : 'to match'} ${expectedError}, but got "${actualError.message}"`
        );
      }
    } else {
      this._evaluate(true, '');
    }
  }
}

function expect(actual) {
  return new Expectation(actual);
}

function describe(suiteName, fn) {
  const parent = state.currentSuite;
  const suite = {
    name: suiteName,
    fullName: parent ? `${parent.fullName} > ${suiteName}` : suiteName,
    parent,
    tests: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    beforeAllHooks: [],
    afterAllHooks: [],
  };

  const prevSuite = state.currentSuite;
  state.currentSuite = suite;
  state.suites.push(suite);
  fn();
  state.currentSuite = prevSuite;
}

function it(testName, fn) {
  if (!state.currentSuite) {
    describe('Default Suite', () => {});
  }
  state.currentSuite.tests.push({
    name: testName,
    fn,
  });
}

function beforeEach(fn) {
  if (state.currentSuite) {
    state.currentSuite.beforeEachHooks.push(fn);
  }
}

function afterEach(fn) {
  if (state.currentSuite) {
    state.currentSuite.afterEachHooks.push(fn);
  }
}

function beforeAll(fn) {
  if (state.currentSuite) {
    state.currentSuite.beforeAllHooks.push(fn);
  }
}

function afterAll(fn) {
  if (state.currentSuite) {
    state.currentSuite.afterAllHooks.push(fn);
  }
}

function getAncestors(suite) {
  const list = [];
  let curr = suite;
  while (curr) {
    list.unshift(curr);
    curr = curr.parent;
  }
  return list;
}

async function runSuites(options = {}) {
  const { verbose = false, tier = null, filter = null } = options;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures = [];
  const startTime = Date.now();

  for (const suite of state.suites) {
    if (suite.tests.length === 0) continue;

    const suiteHierarchyName = suite.fullName;
    if (tier && !suiteHierarchyName.toLowerCase().includes(`tier ${tier}`) && !suiteHierarchyName.toLowerCase().includes(`tier${tier}`)) {
      continue;
    }
    if (filter && !suiteHierarchyName.toLowerCase().includes(filter.toLowerCase())) {
      continue;
    }

    if (verbose) {
      console.log(`\n\x1b[36m▶ Suite: ${suiteHierarchyName}\x1b[0m`);
    }

    const ancestors = getAncestors(suite);

    for (const test of suite.tests) {
      totalTests++;
      let passed = true;
      let error = null;

      try {
        for (const s of ancestors) {
          for (const hook of s.beforeEachHooks) {
            const res = hook();
            if (res && typeof res.then === 'function') await res;
          }
        }

        const res = test.fn();
        if (res && typeof res.then === 'function') {
          await res;
        }

        for (const s of ancestors.slice().reverse()) {
          for (const hook of s.afterEachHooks) {
            const res = hook();
            if (res && typeof res.then === 'function') await res;
          }
        }
      } catch (err) {
        passed = false;
        error = err;
      }

      if (passed) {
        passedTests++;
        if (verbose) {
          console.log(`  \x1b[32m✔\x1b[0m ${test.name}`);
        }
      } else {
        failedTests++;
        failures.push({
          suite: suiteHierarchyName,
          test: test.name,
          error: error ? (error.stack || error.message) : 'Unknown error',
        });
        if (verbose) {
          console.log(`  \x1b[31m✖\x1b[0m ${test.name}`);
          console.log(`    \x1b[31m${error.message}\x1b[0m`);
        }
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    durationMs,
    failures,
  };
}

function resetSuites() {
  state.suites = [];
  state.currentSuite = null;
}

module.exports = {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  runSuites,
  resetSuites,
};
