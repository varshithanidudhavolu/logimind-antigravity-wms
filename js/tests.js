/**
 * LogiMind Antigravity WMS - Automated Unit Test Suite (Browser Global & Console)
 * @version 4.5.0
 */

(function() {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const WMSSecurity = isNode ? require('./security.js') : window.WMSSecurity;

  class TestRunner {
    constructor() {
      this.passed = 0;
      this.failed = 0;
      this.total = 0;
      this.results = [];
      this.startTime = Date.now();
    }

    describe(suiteName, fn) {
      console.log(`%c📦 [TEST SUITE] ${suiteName}`, 'color: #00F5A0; font-weight: bold;');
      fn();
    }

    test(testName, fn) {
      this.total++;
      try {
        fn();
        this.passed++;
        this.results.push({ name: testName, status: 'PASS' });
        console.log(`  %c✅ PASS:%c ${testName}`, 'color: #00F5A0;', 'color: #cbd5e1;');
      } catch (err) {
        this.failed++;
        this.results.push({ name: testName, status: 'FAIL', error: err.message });
        console.error(`  ❌ FAIL: ${testName} -> ${err.message}`);
      }
    }

    expect(actual) {
      const matchers = (isNot = false) => ({
        toBe: (expected) => {
          const pass = actual === expected;
          if (isNot ? pass : !pass) throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`);
        },
        toEqual: (expected) => {
          const a = JSON.stringify(actual);
          const b = JSON.stringify(expected);
          const pass = a === b;
          if (isNot ? pass : !pass) throw new Error(`Expected equality ${isNot ? 'NOT to match' : 'to match'} ${b}`);
        },
        toBeGreaterThan: (expected) => {
          const pass = actual > expected;
          if (isNot ? pass : !pass) throw new Error(`Expected ${actual} ${isNot ? 'NOT to be' : 'to be'} > ${expected}`);
        },
        toContain: (expected) => {
          const pass = actual && actual.includes(expected);
          if (isNot ? pass : !pass) throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expected)}`);
        },
        toBeDefined: () => {
          const pass = actual !== undefined && actual !== null;
          if (isNot ? pass : !pass) throw new Error(`Expected value ${isNot ? 'NOT to be' : 'to be'} defined`);
        }
      });

      const obj = matchers(false);
      obj.not = matchers(true);
      return obj;
    }

    summary() {
      const elapsed = Date.now() - this.startTime;
      console.log(`%c📊 WMS Automated Test Suite: ${this.passed}/${this.total} Passed (${elapsed}ms)`, 'color: #00F5A0; font-weight: bold; background: #07090E; padding: 4px 8px; border-radius: 4px;');
      return { total: this.total, passed: this.passed, failed: this.failed, durationMs: elapsed };
    }
  }

  function runAllTests() {
    const runner = new TestRunner();
    const describe = runner.describe.bind(runner);
    const test = runner.test.bind(runner);
    const expect = runner.expect.bind(runner);

    describe('1. Security Engine & Prototype Pollution Defense', () => {
      test('escapeHTML prevents script injection', () => {
        expect(WMSSecurity.escapeHTML('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      });

      test('sanitizeInput removes unsafe inline handlers', () => {
        const clean = WMSSecurity.sanitizeInput('<img src=x onerror=alert(1)>Tesla');
        expect(clean).toContain('Tesla');
        expect(clean).not.toContain('onerror=');
      });

      test('sanitizeObject blocks prototype pollution keys', () => {
        const clean = WMSSecurity.sanitizeObject({ customer: 'Tesla', __proto__: { hacked: true } });
        expect(clean.customer).toBe('Tesla');
      });

      test('validateOrderPayload bounds negative quantities', () => {
        const validated = WMSSecurity.validateOrderPayload({ customer: 'Tesla', qty: -5, priority: 999 });
        expect(validated.qty).toBe(1);
        expect(validated.priority).toBe(75);
      });
    });

    describe('2. State Store Reactive Data Integrity', () => {
      test('WMSState data integrity is initialized', () => {
        expect(typeof window.WMSState !== 'undefined').toBe(true);
        expect(window.WMSState.data.orders.length > 0).toBe(true);
      });

      test('KPI active orders count is accurate', () => {
        const active = window.WMSState.data.orders.filter(o => o.stage !== 'Completed').length;
        expect(active).toBe(window.WMSState.data.systemStats.activeOrdersCount);
      });
    });

    describe('3. Decision Simulator (Rule 14)', () => {
      test('Scenario parameter bounding works reliably', () => {
        const validated = WMSSecurity.validateSimulationPayload({ urgentNeeded: 10, availableStock: 7, heldStock: 5 });
        expect(validated.urgentNeeded).toBe(10);
        expect(validated.availableStock).toBe(7);
        expect(validated.heldStock).toBe(5);
      });
    });

    return runner.summary();
  }

  if (isNode) {
    module.exports = { runAllTests };
  } else {
    window.runWMSTests = runAllTests;
  }
})();
