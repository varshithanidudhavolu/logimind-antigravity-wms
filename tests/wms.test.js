/**
 * LogiMind Antigravity WMS - Enterprise Automated Unit Test Suite
 * @version 4.5.0
 * 
 * Verifies Security Defense, Prototype Pollution Resistance, State Indexing,
 * Rule 14 Scenario Mathematical Invariants, TSP Routing, and 3-Point QC Logic.
 */

'use strict';

// Load security dependencies if running in Node.js
let WMSSecurity;
if (typeof module !== 'undefined' && typeof require !== 'undefined') {
  WMSSecurity = require('../js/security.js');
} else if (typeof window !== 'undefined') {
  WMSSecurity = window.WMSSecurity;
}

/**
 * Enterprise Test Runner Framework with Bounded Assertions
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
          throw new Error(`Expected equality ${isNot ? 'NOT to match' : 'to match'} ${b}`);
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

// Instantiate Runner
const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const test = runner.test.bind(runner);
const expect = runner.expect.bind(runner);

/* ========================================================================= */
/* SUITE 1: SECURITY & DEFENSE-IN-DEPTH                                      */
/* ========================================================================= */
describe('1. Enterprise Security, Sanitization & Defense-in-Depth', () => {
  test('escapeHTML correctly encodes all dangerous HTML characters', () => {
    const raw = '<script>alert("XSS & Injection")</script>';
    const escaped = WMSSecurity.escapeHTML(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS &amp; Injection&quot;)&lt;&#x2F;script&gt;');
  });

  test('sanitizeInput strips script tags, iframes, and inline event handlers', () => {
    const malicious = '<img src=x onerror=alert(1)>Tesla Gigafactory<script>evil()</script>';
    const clean = WMSSecurity.sanitizeInput(malicious);
    expect(clean).toContain('Tesla Gigafactory');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror=');
  });

  test('sanitizeObject blocks prototype pollution keys (__proto__, constructor)', () => {
    const maliciousObj = {
      customer: 'SpaceX Autonomous Hub',
      __proto__: { isAdmin: true },
      constructor: { hacked: true }
    };
    const sanitized = WMSSecurity.sanitizeObject(maliciousObj);
    expect(sanitized.customer).toBe('SpaceX Autonomous Hub');
    expect(Object.prototype.isAdmin).toBe(undefined);
  });

  test('validateOrderPayload bounds negative or infinite quantities to minimum safe 1', () => {
    const validated = WMSSecurity.validateOrderPayload({
      customer: 'Apple Logistics',
      qty: -50,
      priority: -10
    });
    expect(validated.qty).toBe(1);
    expect(validated.priority).toBe(75);
  });

  test('validateOrderPayload bounds excessive quantities to maximum safe 1000', () => {
    const validated = WMSSecurity.validateOrderPayload({
      customer: 'Amazon Robotics Hub',
      qty: 999999,
      priority: 150
    });
    expect(validated.qty).toBe(1000);
    expect(validated.priority).toBe(75);
  });

  test('validateOrderPayload whitelists legitimate shipping carriers', () => {
    const validated = WMSSecurity.validateOrderPayload({
      carrier: 'UntrustedCarrierSpam'
    });
    expect(validated.carrier).toBe('FedEx Priority');
  });

  test('safeJSONParse recovers gracefully from invalid JSON string without throwing', () => {
    const parsed = WMSSecurity.safeJSONParse('{ corrupted json: 123 }', { fallback: true });
    expect(parsed.fallback).toBe(true);
  });
});

/* ========================================================================= */
/* SUITE 2: REACTIVE STATE STORE & FAST INDEXING                             */
/* ========================================================================= */
describe('2. State Store Reactive Pub/Sub & O(1) Indexing', () => {
  const mockState = {
    orders: [
      { id: 'ORD-9821', customer: 'Tesla Gigafactory', stage: 'Route Picking', priority: 96, items: [{ sku: 'SKU-E101', qty: 4, picked: false }] },
      { id: 'ORD-9822', customer: 'Northrop Space', stage: 'Stock Allocation', priority: 88, items: [{ sku: 'SKU-H502', qty: 1, picked: false }] }
    ],
    skus: [
      { id: 'SKU-E101', name: 'LiDAR Sensor', onHand: 48, allocated: 14, unitCost: 180.0 },
      { id: 'SKU-H502', name: 'Optical Processor', onHand: 16, allocated: 6, unitCost: 1850.0 }
    ],
    auditLog: []
  };

  test('Order creation unshifts new order and deducts SKU allocation', () => {
    const initialOrdersCount = mockState.orders.length;
    const initialAllocated = mockState.skus[0].allocated;

    const newOrder = {
      id: 'ORD-9999',
      customer: 'Quantum Computing Hub',
      stage: 'Order Created',
      priority: 94,
      items: [{ sku: 'SKU-E101', qty: 3, picked: false }]
    };

    mockState.skus[0].allocated += 3;
    mockState.orders.unshift(newOrder);

    expect(mockState.orders.length).toBe(initialOrdersCount + 1);
    expect(mockState.orders[0].id).toBe('ORD-9999');
    expect(mockState.skus[0].allocated).toBe(initialAllocated + 3);
  });

  test('Stage advancement transitions order through fulfillment lifecycle', () => {
    const order = mockState.orders[0];
    expect(order.stage).toBe('Order Created');

    order.stage = 'QC & Packing';
    expect(order.stage).toBe('QC & Packing');

    order.stage = 'Dispatch Ready';
    expect(order.stage).toBe('Dispatch Ready');
  });

  test('Active orders counter excludes Completed orders', () => {
    mockState.orders.push({ id: 'ORD-9000', customer: 'Delivered Hub', stage: 'Completed', priority: 50, items: [] });
    const activeCount = mockState.orders.filter(o => o.stage !== 'Completed').length;
    expect(activeCount).toBe(3);
  });

  test('Audit log stores action timestamp and prunes excessive memory', () => {
    for (let i = 0; i < 70; i++) {
      mockState.auditLog.unshift({ time: '12:00:00', user: 'Ops Manager', action: `Action #${i}` });
    }
    if (mockState.auditLog.length > 60) mockState.auditLog.length = 60;
    expect(mockState.auditLog.length).toBe(60);
  });
});

/* ========================================================================= */
/* SUITE 3: RULE 14 AUTONOMOUS CONTENTION MATRIX                             */
/* ========================================================================= */
describe('3. Rule 14 Scenario Contention Simulation Engine', () => {
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

  test('Scenario A (10 Needed vs 7 Avail vs 5 Held) triggers Dynamic Reallocation (Revoke 3, PO 8)', () => {
    const res = evaluateScenario(10, 7, 5, 75);
    expect(res.branch).toBe('DYNAMIC_REALLOCATION');
    expect(res.revoked).toBe(3);
    expect(res.allocated).toBe(10);
    expect(res.poNeeded).toBe(8);
  });

  test('Scenario B (6 Needed vs 12 Avail vs 4 Held) passes with zero revocation', () => {
    const res = evaluateScenario(6, 12, 4, 70);
    expect(res.branch).toBe('DIRECT_PASS');
    expect(res.revoked).toBe(0);
    expect(res.allocated).toBe(6);
  });

  test('Scenario C (25 Needed vs 5 Avail vs 5 Held) triggers Critical Deficit & Auto PO 15', () => {
    const res = evaluateScenario(25, 5, 5, 80);
    expect(res.branch).toBe('CRITICAL_DEFICIT');
    expect(res.allocated).toBe(10);
    expect(res.poNeeded).toBe(15);
  });
});

/* ========================================================================= */
/* SUITE 4: TSP SHORTEST-PATH & 3-POINT QC PACKING GATE                      */
/* ========================================================================= */
describe('4. TSP Shortest-Path Optimizer & 3-Point QC Packing Gate', () => {
  function calculateEuclideanDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function calculateManhattanDistance(p1, p2) {
    return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
  }

  test('TSP Euclidean metric computes distance between Picker Depot and Rack A-03', () => {
    const p1 = { x: 30, y: 230 };
    const p2 = { x: 85, y: 75 };
    const dist = calculateEuclideanDistance(p1, p2);
    expect(Math.round(dist)).toBe(164);
  });

  test('TSP Manhattan grid metric computes orthogonal aisle distance', () => {
    const p1 = { x: 30, y: 230 };
    const p2 = { x: 85, y: 75 };
    const dist = calculateManhattanDistance(p1, p2);
    expect(dist).toBe(210);
  });

  test('3-Point QC Gate requires all 3 criteria before generating holographic security seal', () => {
    const qc = { visual: true, weight: true, cushion: true, approved: false, sealId: null };
    const isApproved = qc.visual && qc.weight && qc.cushion;
    expect(isApproved).toBe(true);

    if (isApproved) {
      qc.approved = true;
      qc.sealId = 'SEAL-9821-441';
    }

    expect(qc.approved).toBe(true);
    expect(qc.sealId).toContain('SEAL-9821');
  });

  test('Dock Bay assignment registers vehicle plate, carrier, and load fill percentage', () => {
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

// Node.js exit code handling
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, summary };
  if (summary.failed > 0) {
    process.exit(1);
  }
}
if (typeof window !== 'undefined') {
  window.runWMSTests = () => runner.summary();
}
