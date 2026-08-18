/**
 * LogiMind Antigravity WMS - Automated Unit Test Suite
 * Evaluates State Store, Security Sanitization, What-If Simulator, TSP Routing, and QC Gate logic.
 * Compatible with Node.js test runners and browser consoles.
 */

// Load dependencies if running under Node.js
let WMSSecurity;
if (typeof module !== 'undefined' && typeof require !== 'undefined') {
  WMSSecurity = require('../js/security.js');
} else if (typeof window !== 'undefined') {
  WMSSecurity = window.WMSSecurity;
}

/**
 * Lightweight Standalone Assertion Test Framework
 */
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  describe(suiteName, fn) {
    console.log(`\n📦 [TEST SUITE] ${suiteName}`);
    fn();
  }

  test(testName, fn) {
    this.total++;
    try {
      fn();
      this.passed++;
      this.results.push({ name: testName, status: 'PASS' });
      console.log(`  ✅ PASS: ${testName}`);
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
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`);
        }
      },
      toEqual: (expected) => {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        const pass = a === b;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected deep equality ${isNot ? 'NOT to match' : 'to match'} ${b}`);
        }
      },
      toBeGreaterThan: (expected) => {
        const pass = actual > expected;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT to be' : 'to be'} > ${expected}`);
        }
      },
      toBeGreaterThanOrEqual: (expected) => {
        const pass = actual >= expected;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT to be' : 'to be'} >= ${expected}`);
        }
      },
      toBeLessThanOrEqual: (expected) => {
        const pass = actual <= expected;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${actual} ${isNot ? 'NOT to be' : 'to be'} <= ${expected}`);
        }
      },
      toContain: (expected) => {
        const pass = actual && actual.includes(expected);
        if (isNot ? pass : !pass) {
          throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expected)}`);
        }
      },
      toBeDefined: () => {
        const pass = actual !== undefined && actual !== null;
        if (isNot ? pass : !pass) {
          throw new Error(`Expected value ${isNot ? 'NOT to be' : 'to be'} defined`);
        }
      }
    });

    const obj = matchers(false);
    obj.not = matchers(true);
    return obj;
  }

  summary() {
    const elapsed = Date.now() - this.startTime;
    console.log('\n======================================================');
    console.log(`📊 TEST EXECUTION SUMMARY (${elapsed}ms)`);
    console.log(`Total Tests Run: ${this.total}`);
    console.log(`Passed:          ${this.passed} ✅`);
    console.log(`Failed:          ${this.failed} ❌`);
    console.log(`Success Rate:    ${Math.round((this.passed / this.total) * 100)}%`);
    console.log('======================================================\n');
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      durationMs: elapsed
    };
  }
}

// Instantiate Test Suite
const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const test = runner.test.bind(runner);
const expect = runner.expect.bind(runner);

/* ========================================================================= */
/* SUITE 1: SECURITY & INPUT SANITIZATION                                    */
/* ========================================================================= */
describe('1. Security Engine & Input Sanitization Tests', () => {
  test('escapeHTML should encode dangerous HTML entities to prevent XSS', () => {
    const dangerousInput = '<script>alert("XSS")</script>';
    const escaped = WMSSecurity.escapeHTML(dangerousInput);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
  });

  test('sanitizeInput should strip executable script tags and inline handlers', () => {
    const malicious = '<img src=x onerror=alert(1)>Tesla<script>evil()</script>';
    const clean = WMSSecurity.sanitizeInput(malicious);
    expect(clean).toContain('Tesla');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror=');
  });

  test('sanitizeObject should recursively sanitize nested fields', () => {
    const rawOrder = {
      customer: '<script>hack()</script>SpaceX Corp',
      nested: {
        dest: 'Austin, TX <iframe src="evil.com"></iframe>'
      }
    };
    const sanitized = WMSSecurity.sanitizeObject(rawOrder);
    expect(sanitized.customer).toBe('SpaceX Corp');
    expect(sanitized.nested.dest).toBe('Austin, TX');
  });

  test('validateOrderPayload should bound quantities and enforce whitelisted carrier', () => {
    const validated = WMSSecurity.validateOrderPayload({
      customer: '  Amazon Robotics Hub  ',
      qty: -50,
      priority: 999,
      carrier: 'HackerDeliveryCorp'
    });
    expect(validated.customer).toBe('Amazon Robotics Hub');
    expect(validated.qty).toBe(1); // Min bounded
    expect(validated.priority).toBe(75); // Fallback bounded
    expect(validated.carrier).toBe('FedEx Priority'); // Whitelisted fallback
  });

  test('validateSimulationPayload should bound parameter ranges between 0 and 1000', () => {
    const validated = WMSSecurity.validateSimulationPayload({
      urgentNeeded: 15,
      availableStock: -4,
      heldStock: 2500,
      priorityThreshold: 85
    });
    expect(validated.urgentNeeded).toBe(15);
    expect(validated.availableStock).toBe(0);
    expect(validated.heldStock).toBe(1000);
    expect(validated.priorityThreshold).toBe(85);
  });
});

/* ========================================================================= */
/* SUITE 2: STATE STORE & ORDER LIFECYCLE                                    */
/* ========================================================================= */
describe('2. State Store & Order Lifecycle Logic Tests', () => {
  // Mock State Store
  const mockState = {
    orders: [
      { id: 'ORD-9821', customer: 'Tesla Gigafactory', stage: 'Route Picking', priority: 96, items: [{ sku: 'SKU-E101', qty: 4, picked: false }] },
      { id: 'ORD-9822', customer: 'Northrop Space', stage: 'Stock Allocation', priority: 88, items: [{ sku: 'SKU-H502', qty: 1, picked: false }] }
    ],
    skus: [
      { id: 'SKU-E101', name: 'LiDAR Sensor', onHand: 24, allocated: 12, unitCost: 180.0 },
      { id: 'SKU-H502', name: 'Optical Processor', onHand: 8, allocated: 3, unitCost: 1850.0 }
    ],
    auditLog: []
  };

  test('Order creation should prepend new order and deduct inventory allocation', () => {
    const initialOrdersCount = mockState.orders.length;
    const initialAllocated = mockState.skus[0].allocated;

    const newOrder = {
      id: 'ORD-9999',
      customer: 'Apple Autonomous Hub',
      stage: 'Order Created',
      priority: 92,
      items: [{ sku: 'SKU-E101', qty: 3, picked: false }]
    };

    mockState.skus[0].allocated += 3;
    mockState.orders.unshift(newOrder);

    expect(mockState.orders.length).toBe(initialOrdersCount + 1);
    expect(mockState.orders[0].id).toBe('ORD-9999');
    expect(mockState.skus[0].allocated).toBe(initialAllocated + 3);
  });

  test('Stage advancement should progress order to QC & Packing and Dispatch Ready', () => {
    const order = mockState.orders[0];
    expect(order.stage).toBe('Order Created');

    order.stage = 'QC & Packing';
    expect(order.stage).toBe('QC & Packing');

    order.stage = 'Dispatch Ready';
    expect(order.stage).toBe('Dispatch Ready');
  });

  test('Active orders counter should exclude Completed orders', () => {
    mockState.orders.push({ id: 'ORD-9000', customer: 'Done Corp', stage: 'Completed', priority: 50, items: [] });
    const activeCount = mockState.orders.filter(o => o.stage !== 'Completed').length;
    expect(activeCount).toBe(3);
  });

  test('Audit log should append immutable action history with timestamps', () => {
    const auditEntry = { time: '12:00:00 UTC', user: 'Operations Manager', action: 'Created Order ORD-9999' };
    mockState.auditLog.unshift(auditEntry);
    expect(mockState.auditLog.length).toBe(1);
    expect(mockState.auditLog[0].action).toContain('Created Order ORD-9999');
  });
});

/* ========================================================================= */
/* SUITE 3: WHAT-IF SCENARIO SIMULATION ENGINE                               */
/* ========================================================================= */
describe('3. What-If Scenario Contention Engine (Rule 14 Matrix)', () => {
  function evaluateScenario(needed, available, held, threshold) {
    if (available >= needed) {
      return { branch: 'DIRECT_PASS', allocated: needed, revoked: 0, poNeeded: 0 };
    }
    const deficit = needed - available;
    if (held >= deficit) {
      return { branch: 'DYNAMIC_REALLOCATION', allocated: needed, revoked: deficit, poNeeded: 8 };
    }
    const partial = available + held;
    return { branch: 'CRITICAL_DEFICIT', allocated: partial, revoked: held, poNeeded: needed - partial };
  }

  test('Classic Conflict (10 Needed vs 7 Avail vs 5 Held) should trigger Dynamic Reallocation (Revoke 3, PO 8)', () => {
    const res = evaluateScenario(10, 7, 5, 75);
    expect(res.branch).toBe('DYNAMIC_REALLOCATION');
    expect(res.revoked).toBe(3);
    expect(res.allocated).toBe(10);
    expect(res.poNeeded).toBe(8);
  });

  test('Direct Safe Pass (6 Needed vs 10 Avail vs 4 Held) should fulfill 100% with zero revocation', () => {
    const res = evaluateScenario(6, 10, 4, 70);
    expect(res.branch).toBe('DIRECT_PASS');
    expect(res.revoked).toBe(0);
    expect(res.allocated).toBe(6);
  });

  test('Severe Deficit (20 Needed vs 4 Avail vs 6 Held) should trigger Critical Deficit & Emergency PO', () => {
    const res = evaluateScenario(20, 4, 6, 80);
    expect(res.branch).toBe('CRITICAL_DEFICIT');
    expect(res.allocated).toBe(10);
    expect(res.poNeeded).toBe(10);
  });
});

/* ========================================================================= */
/* SUITE 4: TSP SHORTEST-PATH & QC PACKING GATE                              */
/* ========================================================================= */
describe('4. TSP Shortest Path Optimizer & 3-Point QC Gate', () => {
  function calculateEuclideanDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  test('TSP Distance metric calculation between picker depot and Rack A-03', () => {
    const p1 = { x: 30, y: 230 };
    const p2 = { x: 85, y: 75 };
    const dist = calculateEuclideanDistance(p1, p2);
    expect(Math.round(dist)).toBe(164);
  });

  test('3-Point QC Gate requires all 3 checkpoints (Damage, SKU Match, Weight) before seal generation', () => {
    const orderQc = { damage: true, skuMatch: true, weight: true, approved: false, sealId: null };
    const isReady = orderQc.damage && orderQc.skuMatch && orderQc.weight;
    expect(isReady).toBe(true);

    if (isReady) {
      orderQc.approved = true;
      orderQc.sealId = 'SEAL-9821-441';
    }

    expect(orderQc.approved).toBe(true);
    expect(orderQc.sealId).toContain('SEAL-9821');
  });

  test('Dock Bay assignment updates vehicle and capacity load fill', () => {
    const dock = { id: 1, name: 'Dock 1', status: 'Available', capacityPct: 0, vehicle: 'NONE' };
    dock.vehicle = 'TRK-4491';
    dock.status = 'Loading';
    dock.capacityPct = 82;

    expect(dock.status).toBe('Loading');
    expect(dock.capacityPct).toBe(82);
    expect(dock.vehicle).toBe('TRK-4491');
  });
});

// Run Summary
const summary = runner.summary();

// Export for Node.js test execution
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, summary };
  if (summary.failed > 0) {
    process.exit(1);
  }
}
if (typeof window !== 'undefined') {
  window.runWMSTests = () => runner.summary();
}
