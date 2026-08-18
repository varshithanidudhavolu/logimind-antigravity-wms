/**
 * LogiMind Antigravity WMS - Security & Input Sanitization Engine
 * Protects against XSS, injection vectors, malicious payloads, and corrupted schemas.
 */
class WMSSecurity {
  /**
   * Escape HTML special characters to prevent Cross-Site Scripting (XSS)
   * @param {string} str - Raw input string
   * @returns {string} - Sanitized string with escaped entities
   */
  static escapeHTML(str) {
    if (typeof str !== 'string') {
      if (str === null || str === undefined) return '';
      return String(str);
    }
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
      '`': '&#x60;'
    };
    return str.replace(/[&<>"'/`]/g, m => map[m]);
  }

  /**
   * Deep sanitize an input string by removing script tags, javascript: protocols, and event handlers
   * @param {string} input - Untrusted input
   * @returns {string} - Cleaned input string
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      if (typeof input === 'number' || typeof input === 'boolean') return String(input);
      return '';
    }

    let clean = input.trim();
    // Strip script and iframe tags
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // Strip javascript: pseudo-protocol
    clean = clean.replace(/javascript\s*:/gi, '');
    // Strip onload/onerror inline event handlers
    clean = clean.replace(/on\w+\s*=/gi, '');
    // Remove unsafe angle brackets
    clean = clean.replace(/[<>]/g, '');

    return clean.trim();
  }

  /**
   * Recursively sanitize all text properties of an object
   * @param {object} obj - Object containing raw fields
   * @returns {object} - Object with sanitized string fields
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        sanitized[key] = this.sanitizeInput(val);
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Validate and enforce schema bounds on New Order creation payloads
   * @param {object} params - Raw parameters from form submission
   * @returns {object} - Validated, sanitized, and bounded order payload
   */
  static validateOrderPayload(params) {
    if (!params || typeof params !== 'object') {
      throw new TypeError('Invalid order parameters: payload must be a non-null object');
    }

    const customer = this.sanitizeInput(params.customer || 'Enterprise Account').slice(0, 100);
    const tier = this.sanitizeInput(params.tier || 'Enterprise Tier (Score: 80)').slice(0, 50);
    const skuId = this.sanitizeInput(params.skuId || 'SKU-E101').slice(0, 30);
    const dest = this.sanitizeInput(params.dest || 'Regional Distribution Hub').slice(0, 120);

    // Bound quantity between 1 and 1000
    const rawQty = parseInt(params.qty, 10);
    const qty = (!isNaN(rawQty) && rawQty > 0) ? Math.min(Math.max(1, rawQty), 1000) : 1;

    // Bound priority score between 1 and 100
    const rawPriority = parseInt(params.priority, 10);
    const priority = (!isNaN(rawPriority) && rawPriority >= 1 && rawPriority <= 100) ? rawPriority : 75;

    // Bound SLA hours between 0.5 and 72
    const rawSla = parseFloat(params.slaHours);
    const slaHours = (!isNaN(rawSla) && rawSla > 0) ? Math.min(Math.max(0.5, rawSla), 72) : 4;

    // Allowed carrier whitelisting
    const allowedCarriers = [
      'FedEx Priority',
      'DHL Express',
      'BlueDart Logistics',
      'BlueDart Express',
      'FedEx Freight',
      'FedEx Ground',
      'DHL Standard',
      'Autonomous Fleet'
    ];
    let carrier = params.carrier ? this.sanitizeInput(params.carrier) : 'FedEx Priority';
    if (!allowedCarriers.includes(carrier)) {
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
   * Validate and bound scenario simulator parameters
   * @param {object} params - Urgent needed, available, held, threshold
   * @returns {object} - Validated bounded parameters
   */
  static validateSimulationPayload(params) {
    const rawUrgent = parseInt(params.urgentNeeded, 10);
    const rawAvail = parseInt(params.availableStock, 10);
    const rawHeld = parseInt(params.heldStock, 10);
    const rawThresh = parseInt(params.priorityThreshold, 10);

    return {
      urgentNeeded: Math.max(0, Math.min(!isNaN(rawUrgent) ? rawUrgent : 10, 1000)),
      availableStock: Math.max(0, Math.min(!isNaN(rawAvail) ? rawAvail : 7, 1000)),
      heldStock: Math.max(0, Math.min(!isNaN(rawHeld) ? rawHeld : 5, 1000)),
      priorityThreshold: Math.max(1, Math.min(!isNaN(rawThresh) ? rawThresh : 75, 100))
    };
  }
}

// Export for Node.js test runners & browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WMSSecurity;
}
if (typeof window !== 'undefined') {
  window.WMSSecurity = WMSSecurity;
}
