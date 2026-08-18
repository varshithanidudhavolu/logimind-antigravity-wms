/**
 * LogiMind Antigravity WMS - Enterprise Security & Sanitization Engine
 * @version 4.5.0
 * @author LogiMind Security Architecture Team
 * 
 * Provides defense-in-depth security safeguards:
 * - HTML Entity Escaping (XSS Prevention)
 * - Script & Inline Event Handler Stripping
 * - Prototype Pollution & Object Key Tampering Protection
 * - Safe Schema Validation & Numerical Range Bounding
 * - Payload Whitelisting for Logistics Operations
 */

'use strict';

class WMSSecurity {
  /**
   * Dangerous prototype mutation keys to block against prototype pollution attacks
   * @private
   * @readonly
   */
  static FORBIDDEN_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);

  /**
   * Entity map for HTML character encoding
   * @private
   * @readonly
   */
  static HTML_ENTITY_MAP = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;'
  });

  /**
   * Allowed carrier services whitelist
   * @readonly
   */
  static ALLOWED_CARRIERS = Object.freeze([
    'FedEx Priority',
    'DHL Express',
    'BlueDart Logistics',
    'BlueDart Express',
    'FedEx Freight',
    'FedEx Ground',
    'DHL Standard',
    'Internal AGV Swarm',
    'Autonomous Fleet'
  ]);

  /**
   * Allowed user roles whitelist
   * @readonly
   */
  static ALLOWED_ROLES = Object.freeze([
    'Operations Manager',
    'Floor Picker Operator',
    'Dispatch Supervisor'
  ]);

  /**
   * Encode dangerous characters in text to prevent Cross-Site Scripting (XSS)
   * @param {string|number|null|undefined} str - Untrusted string or value
   * @returns {string} - Safely escaped HTML entity string
   */
  static escapeHTML(str) {
    if (typeof str !== 'string') {
      if (str === null || str === undefined) return '';
      return String(str);
    }
    return str.replace(/[&<>"'/`]/g, char => this.HTML_ENTITY_MAP[char] || char);
  }

  /**
   * Deeply sanitize an input string by removing script tags, iframe embeds,
   * inline event handlers (onerror, onload), and javascript: pseudo-protocols.
   * @param {string|any} input - Raw untrusted input
   * @returns {string} - Clean, sanitized string
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      if (typeof input === 'number' || typeof input === 'boolean') return String(input);
      return '';
    }

    let clean = input.trim();
    // 1. Strip script tags and content
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // 2. Strip iframe tags and content
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // 3. Strip dangerous pseudo-protocols
    clean = clean.replace(/(?:javascript|data|vbscript)\s*:/gi, '');
    // 4. Strip inline event handlers
    clean = clean.replace(/\bon\w+\s*=/gi, '');
    // 5. Remove angle brackets entirely
    clean = clean.replace(/[<>]/g, '');

    return clean.trim();
  }

  /**
   * Safely sanitize all keys and string values in an object against prototype pollution
   * @param {object|Array} obj - Source object to sanitize
   * @returns {object|Array} - Deeply sanitized clone
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const clean = Object.create(null);
    for (const [key, val] of Object.entries(obj)) {
      // Guard against prototype pollution keys
      if (this.FORBIDDEN_KEYS.includes(key)) {
        continue;
      }
      const safeKey = this.sanitizeInput(key);
      if (typeof val === 'string') {
        clean[safeKey] = this.sanitizeInput(val);
      } else if (typeof val === 'object' && val !== null) {
        clean[safeKey] = this.sanitizeObject(val);
      } else {
        clean[safeKey] = val;
      }
    }
    return clean;
  }

  /**
   * Validate and enforce schema invariants on New Order creation requests
   * @param {object} params - Raw parameters from order modal
   * @returns {object} - Validated, sanitized order schema
   * @throws {TypeError} if params is not an object
   */
  static validateOrderPayload(params) {
    if (!params || typeof params !== 'object') {
      throw new TypeError('Order parameters must be a non-null object');
    }

    const customer = this.sanitizeInput(params.customer || 'Enterprise Client Corp').slice(0, 100);
    const tier = this.sanitizeInput(params.tier || 'Enterprise Tier (Score: 80)').slice(0, 60);
    const skuId = this.sanitizeInput(params.skuId || 'SKU-E101').slice(0, 30);
    const dest = this.sanitizeInput(params.dest || 'Regional Intermodal Cargo Terminal').slice(0, 120);

    // Quantity constraint: 1 <= qty <= 1000
    const rawQty = parseInt(params.qty, 10);
    const qty = (!isNaN(rawQty) && Number.isFinite(rawQty) && rawQty > 0)
      ? Math.min(Math.max(1, rawQty), 1000)
      : 1;

    // Priority constraint: 1 <= priority <= 100
    const rawPriority = parseInt(params.priority, 10);
    const priority = (!isNaN(rawPriority) && Number.isFinite(rawPriority) && rawPriority >= 1 && rawPriority <= 100)
      ? rawPriority
      : 75;

    // SLA hours constraint: 0.5 <= slaHours <= 72
    const rawSla = parseFloat(params.slaHours);
    const slaHours = (!isNaN(rawSla) && Number.isFinite(rawSla) && rawSla > 0)
      ? Math.min(Math.max(0.5, rawSla), 72)
      : 4;

    // Carrier whitelist matching
    let carrier = params.carrier ? this.sanitizeInput(params.carrier) : 'FedEx Priority';
    if (!this.ALLOWED_CARRIERS.includes(carrier)) {
      carrier = 'FedEx Priority';
    }

    return {
      customer,
      tier,
      skuId,
      qty,
      priority,
      slaHours,
      carrier,
      dest
    };
  }

  /**
   * Validate and bound scenario simulator parameters to safe execution ranges
   * @param {object} params - Urgent needed, available stock, held stock, threshold
   * @returns {object} - Validated numeric parameters
   */
  static validateSimulationPayload(params) {
    if (!params || typeof params !== 'object') {
      return { urgentNeeded: 10, availableStock: 7, heldStock: 5, priorityThreshold: 75 };
    }

    const parseBoundedInt = (val, fallback, min, max) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || !Number.isFinite(parsed)) return fallback;
      return Math.max(min, Math.min(parsed, max));
    };

    return {
      urgentNeeded: parseBoundedInt(params.urgentNeeded, 10, 0, 1000),
      availableStock: parseBoundedInt(params.availableStock, 7, 0, 1000),
      heldStock: parseBoundedInt(params.heldStock, 5, 0, 1000),
      priorityThreshold: parseBoundedInt(params.priorityThreshold, 75, 1, 100)
    };
  }

  /**
   * Safe JSON parse with fallback to prevent unhandled parse exceptions
   * @param {string} jsonStr - JSON string to parse
   * @param {any} fallback - Fallback value on parse failure
   * @returns {any} - Parsed JSON object or fallback
   */
  static safeJSONParse(jsonStr, fallback = null) {
    if (typeof jsonStr !== 'string') return fallback;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return fallback;
    }
  }
}

// Module export for Node.js and Browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WMSSecurity;
}
if (typeof window !== 'undefined') {
  window.WMSSecurity = WMSSecurity;
}
