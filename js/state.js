/**
 * LogiMind Antigravity WMS - High-Performance Reactive State Store
 * @version 4.5.0
 * @author LogiMind Core Engineering
 * 
 * Implements a reactive Pub/Sub state store with O(1) indexed lookup tables,
 * microtask-batched subscriber dispatching, dynamic SKU allocation tracking,
 * and immutable audit logging.
 */

'use strict';

class StateStore {
  constructor() {
    /**
     * Set of active subscriber callback functions
     * @private
     * @type {Set<Function>}
     */
    this.subscribers = new Set();

    /**
     * Active warehouse operator role
     * @type {string}
     */
    this.activeRole = 'Operations Manager';

    /**
     * Active tab viewpane identifier
     * @type {string}
     */
    this.activeView = 'dashboard';

    /**
     * Active pipeline stage filter
     * @type {string}
     */
    this.activeFilter = 'ALL';

    /**
     * Active search query string
     * @type {string}
     */
    this.searchQuery = '';

    /**
     * Pending notification queue for microtask batching
     * @private
     * @type {Array<{event: string, payload: any}>}
     */
    this._notificationQueue = [];
    this._isFlushingNotifications = false;

    /**
     * Fast O(1) Map indices for hot path data access
     * @private
     */
    this._skuIndex = new Map();
    this._orderIndex = new Map();
    this._dockIndex = new Map();

    /**
     * Primary warehouse state data model
     */
    this.data = {
      systemStats: {
        activeOrdersCount: 6,
        slaCompliancePct: 99.4,
        spaceUtilizationPct: 84.2,
        bottlenecksCount: 1,
        todayPicksCount: 1420,
        totalSkus: 6
      },
      orders: [
        {
          id: 'ORD-9821',
          customer: 'Tesla Gigafactory Texas',
          tier: 'VIP Priority',
          priority: 96,
          stage: 'Route Picking',
          carrier: 'FedEx Priority',
          dest: 'Austin, TX 78725',
          slaTimer: '01h 42m',
          slaUrgent: true,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 1240.00,
          items: [
            { sku: 'SKU-E101', name: 'LiDAR Distance Sensor Array', qty: 4, bin: 'Aisle 1 - Rack A-03', zone: 'Zone A', picked: true, weightKg: 0.85 },
            { sku: 'SKU-E104', name: 'High-Torque AGV Stepper Motor', qty: 2, bin: 'Aisle 2 - Rack B-01', zone: 'Zone B', picked: false, weightKg: 1.20 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9822',
          customer: 'Northrop Grumman Space Systems',
          tier: 'VIP Priority',
          priority: 88,
          stage: 'Stock Allocation',
          carrier: 'DHL Express',
          dest: 'Houston Spaceport Hub 4',
          slaTimer: '03h 15m',
          slaUrgent: false,
          boxSize: 'Box L3 (40x30x25cm)',
          value: 3850.00,
          items: [
            { sku: 'SKU-H502', name: 'Optical Multi-Core Processor', qty: 1, bin: 'Aisle 3 - Rack C-04', zone: 'Zone C', picked: false, weightKg: 0.40 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9823',
          customer: 'Siemens Energy Logistics',
          tier: 'Standard',
          priority: 74,
          stage: 'Priority Scoring',
          carrier: 'BlueDart Logistics',
          dest: 'Dallas Intermodal Gateway',
          slaTimer: '05h 30m',
          slaUrgent: false,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 940.00,
          items: [
            { sku: 'SKU-S301', name: 'Industrial Servo Controller v4', qty: 3, bin: 'Aisle 1 - Rack A-01', zone: 'Zone A', picked: false, weightKg: 1.10 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9824',
          customer: 'Amazon Robotics Hub',
          tier: 'VIP Priority',
          priority: 92,
          stage: 'Dispatch Ready',
          carrier: 'FedEx Priority',
          dest: 'San Antonio Bay 12',
          slaTimer: '00h 45m',
          slaUrgent: true,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 2150.00,
          items: [
            { sku: 'SKU-R202', name: 'Ultra-Capacitor Power Pack', qty: 2, bin: 'Aisle 2 - Rack B-05', zone: 'Zone B', picked: true, weightKg: 1.75 }
          ],
          qc: { visual: true, weight: true, cushion: true, approved: true, sealId: 'SEAL-9824-912' }
        },
        {
          id: 'ORD-9825',
          customer: 'Lockheed Martin Defense Core',
          tier: 'Enterprise',
          priority: 81,
          stage: 'QC & Packing',
          carrier: 'DHL Express',
          dest: 'Fort Worth Secure Depot',
          slaTimer: '02h 10m',
          slaUrgent: false,
          boxSize: 'Box L3 (40x30x25cm)',
          value: 4600.00,
          items: [
            { sku: 'SKU-H502', name: 'Optical Multi-Core Processor', qty: 2, bin: 'Aisle 3 - Rack C-04', zone: 'Zone C', picked: true, weightKg: 0.40 }
          ],
          qc: { visual: true, weight: false, cushion: true, approved: false, sealId: null }
        },
        {
          id: 'ORD-9826',
          customer: 'Texas Medical Center',
          tier: 'Enterprise',
          priority: 68,
          stage: 'Order Created',
          carrier: 'BlueDart Logistics',
          dest: 'Houston Medical Complex',
          slaTimer: '07h 00m',
          slaUrgent: false,
          boxSize: 'Box S1 (20x15x10cm)',
          value: 320.00,
          items: [
            { sku: 'SKU-M405', name: 'Cryogenic Coolant Cartridge', qty: 4, bin: 'Aisle 4 - Rack D-02', zone: 'Zone D', picked: false, weightKg: 0.30 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        }
      ],
      skus: [
        { id: 'SKU-E101', name: 'LiDAR Distance Sensor Array', zone: 'Zone A', aisle: 'Aisle 1 - Rack A-03', onHand: 48, allocated: 14, safetyBuffer: 10, unitCost: 180.00, weightKg: 0.85, velocity: 'High' },
        { id: 'SKU-E104', name: 'High-Torque AGV Stepper Motor', zone: 'Zone B', aisle: 'Aisle 2 - Rack B-01', onHand: 32, allocated: 8, safetyBuffer: 6, unitCost: 310.00, weightKg: 1.20, velocity: 'Medium' },
        { id: 'SKU-S301', name: 'Industrial Servo Controller v4', zone: 'Zone A', aisle: 'Aisle 1 - Rack A-01', onHand: 24, allocated: 9, safetyBuffer: 8, unitCost: 220.00, weightKg: 1.10, velocity: 'Medium' },
        { id: 'SKU-H502', name: 'Optical Multi-Core Processor', zone: 'Zone C', aisle: 'Aisle 3 - Rack C-04', onHand: 16, allocated: 6, safetyBuffer: 5, unitCost: 1850.00, weightKg: 0.40, velocity: 'High (Cryo)' },
        { id: 'SKU-R202', name: 'Ultra-Capacitor Power Pack', zone: 'Zone B', aisle: 'Aisle 2 - Rack B-05', onHand: 40, allocated: 12, safetyBuffer: 10, unitCost: 450.00, weightKg: 1.75, velocity: 'High' },
        { id: 'SKU-M405', name: 'Cryogenic Coolant Cartridge', zone: 'Zone D', aisle: 'Aisle 4 - Rack D-02', onHand: 60, allocated: 16, safetyBuffer: 15, unitCost: 80.00, weightKg: 0.30, velocity: 'Low' }
      ],
      docks: [
        { id: 1, name: 'Dock 1 - Heavy Freight', status: 'Loading', carrier: 'FedEx Freight', vehicle: 'TRK-4491', capacityPct: 82, destination: 'DFW Airport Cargo Hub', eta: '18 mins' },
        { id: 2, name: 'Dock 2 - Express Parcel', status: 'Available', carrier: 'DHL Express', vehicle: 'VAN-8892', capacityPct: 0, destination: 'Standby - West Coast Loop', eta: 'Standby' },
        { id: 3, name: 'Dock 3 - Cross-Dock Bay', status: 'Loading', carrier: 'BlueDart Logistics', vehicle: 'TRK-9921', capacityPct: 45, destination: 'Chicago O\'Hare Intermodal', eta: '35 mins' },
        { id: 4, name: 'Dock 4 - Autonomous Fleet', status: 'Maintenance', carrier: 'Internal AGV Swarm', vehicle: 'AGV-M1', capacityPct: 0, destination: 'Sensor Recalibration Bay', eta: 'Under Service' }
      ],
      bottlenecks: [
        {
          id: 'BN-104',
          title: 'Intersection Contention (Zone A / Aisle 2)',
          desc: 'Swarm AGV-03 and AGV-07 detected cross-path proximity lock. Automatic bypass routing engaged via aisle C-3.',
          delay: '+3.4 mins',
          zone: 'Zone A',
          resolved: false
        }
      ],
      auditLog: [
        { time: '10:14:22', user: 'Operations Manager', action: 'Initialized Autonomous Warehouse Engine (Antigravity-v4.5)' },
        { time: '10:15:01', user: 'System Telemetry', action: 'Auto-balanced AGV Swarm velocity across Zones A, B, C' },
        { time: '10:16:30', user: 'Dispatch Supervisor', action: 'Airbill #TRK-99824 generated for ORD-9824 (FedEx Priority)' }
      ],
      activeSelectedOrder: 'ORD-9821'
    };

    // Build initial fast Map indexes
    this._rebuildIndexes();
  }

  /**
   * Rebuild O(1) fast lookup indices
   * @private
   */
  _rebuildIndexes() {
    this._skuIndex.clear();
    for (let i = 0; i < this.data.skus.length; i++) {
      this._skuIndex.set(this.data.skus[i].id, this.data.skus[i]);
    }

    this._orderIndex.clear();
    for (let i = 0; i < this.data.orders.length; i++) {
      this._orderIndex.set(this.data.orders[i].id, this.data.orders[i]);
    }

    this._dockIndex.clear();
    for (let i = 0; i < this.data.docks.length; i++) {
      this._dockIndex.set(this.data.docks[i].id, this.data.docks[i]);
    }
  }

  /**
   * Fast O(1) SKU lookup by ID
   * @param {string} skuId
   * @returns {object|undefined}
   */
  getSku(skuId) {
    return this._skuIndex.get(skuId);
  }

  /**
   * Fast O(1) Order lookup by ID
   * @param {string} orderId
   * @returns {object|undefined}
   */
  getOrder(orderId) {
    return this._orderIndex.get(orderId);
  }

  /**
   * Fast O(1) Dock lookup by ID
   * @param {number} dockId
   * @returns {object|undefined}
   */
  getDock(dockId) {
    return this._dockIndex.get(dockId);
  }

  /**
   * Subscribe to state change notifications
   * @param {Function} listener - Callback function (event, payload, state)
   * @returns {Function} - Unsubscribe disposal function
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.subscribers.add(listener);
    }
    return () => this.subscribers.delete(listener);
  }

  /**
   * Queue and dispatch batched notifications via microtasks to prevent layout thrashing
   * @param {string} event - Event name identifier
   * @param {any} payload - Associated event payload data
   */
  notify(event, payload = null) {
    this._notificationQueue.push({ event, payload });
    if (!this._isFlushingNotifications) {
      this._isFlushingNotifications = true;
      queueMicrotask(() => {
        const queue = this._notificationQueue;
        this._notificationQueue = [];
        this._isFlushingNotifications = false;

        for (let i = 0; i < queue.length; i++) {
          const { event: ev, payload: pl } = queue[i];
          for (const listener of this.subscribers) {
            try {
              listener(ev, pl, this.data);
            } catch (err) {
              console.error(`[StateStore] Error in subscriber for event "${ev}":`, err);
            }
          }
        }
      });
    }
  }

  /**
   * Set active warehouse user role
   * @param {string} role
   */
  setRole(role) {
    const safeRole = (typeof WMSSecurity !== 'undefined')
      ? WMSSecurity.sanitizeInput(role)
      : role;
    this.activeRole = safeRole;
    this.notify('ROLE_CHANGED', safeRole);
  }

  /**
   * Set active viewpane
   * @param {string} view
   */
  setView(view) {
    this.activeView = view;
    this.notify('VIEW_CHANGED', view);
  }

  /**
   * Set pipeline stage filter
   * @param {string} filter
   */
  setFilter(filter) {
    this.activeFilter = filter;
    this.notify('FILTER_CHANGED', filter);
  }

  /**
   * Set global search query
   * @param {string} query
   */
  setSearch(query) {
    this.searchQuery = (typeof query === 'string') ? query.toLowerCase().trim() : '';
    this.notify('SEARCH_CHANGED', this.searchQuery);
  }

  /**
   * Select active order for inspection
   * @param {string} orderId
   */
  selectOrder(orderId) {
    this.data.activeSelectedOrder = orderId;
    this.notify('ORDER_SELECTED', orderId);
  }

  /**
   * Advance lifecycle stage of an order
   * @param {string} orderId
   * @param {string} nextStage
   */
  advanceOrderStage(orderId, nextStage) {
    const order = this.getOrder(orderId);
    if (order) {
      const prev = order.stage;
      order.stage = nextStage;
      this.addAudit(`Advanced ${orderId} from [${prev}] to [${nextStage}]`);
      this.notify('ORDER_UPDATED', order);
      this.recalculateStats();
    }
  }

  /**
   * Create a new order with strict security sanitization and inventory allocation
   * @param {object} orderParams
   * @returns {object} - Created order object
   */
  createOrder(orderParams) {
    let sanitized = orderParams || {};
    if (typeof WMSSecurity !== 'undefined') {
      try {
        sanitized = WMSSecurity.validateOrderPayload(orderParams);
      } catch (err) {
        console.warn('[StateStore] Security validation warning:', err);
      }
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const { customer, tier, skuId, qty, priority = 80, slaHours = 4, carrier, dest } = sanitized;
    const targetSku = this.getSku(skuId) || this.data.skus[0];
    const orderQty = Math.max(1, parseInt(qty, 10) || 1);

    // Update allocated inventory
    if (targetSku) {
      targetSku.allocated += orderQty;
    }

    const calculatedWeight = ((targetSku ? targetSku.weightKg : 0.5) * orderQty).toFixed(2);
    let boxSize = 'Box M2 (30x20x15cm)';
    if (calculatedWeight < 1.0) {
      boxSize = 'Box S1 (20x15x10cm)';
    } else if (calculatedWeight > 4.0) {
      boxSize = 'Box L3 (40x30x25cm)';
    }

    const assignedCarrier = carrier || (
      tier.includes('VIP') ? 'FedEx Priority' :
      tier.includes('Enterprise') ? 'DHL Express' : 'BlueDart Logistics'
    );

    const newOrder = {
      id: orderId,
      customer: customer || 'Enterprise Client Corp',
      tier: tier || 'Standard',
      priority: parseInt(priority, 10) || 75,
      stage: 'Order Created',
      carrier: assignedCarrier,
      dest: dest || 'Regional Cargo Hub',
      slaTimer: `${String(Math.floor(slaHours)).padStart(2, '0')}h 00m`,
      slaUrgent: parseInt(priority, 10) >= 85,
      boxSize: boxSize,
      value: (targetSku ? targetSku.unitCost * orderQty : 450.00),
      items: [
        {
          sku: targetSku.id,
          name: targetSku.name,
          qty: orderQty,
          bin: targetSku.aisle,
          zone: targetSku.zone,
          picked: false,
          weightKg: targetSku.weightKg
        }
      ],
      qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
    };

    // Prepend to orders and update index
    this.data.orders.unshift(newOrder);
    this._orderIndex.set(orderId, newOrder);

    this.addAudit(`Manual Order ${orderId} created by ${this.activeRole}`);
    this.notify('ORDER_CREATED', newOrder);
    this.notify('ORDER_UPDATED', newOrder);
    this.notify('INVENTORY_UPDATED', { sku: targetSku });
    this.recalculateStats();

    return newOrder;
  }

  /**
   * Mark SKU item as picked within an order
   * @param {string} orderId
   * @param {string} skuId
   */
  pickItem(orderId, skuId) {
    const order = this.getOrder(orderId);
    if (!order) return;

    const item = order.items.find(i => i.sku === skuId);
    if (item) {
      item.picked = true;
      this.addAudit(`Picker scanned & verified ${item.name} (${skuId}) for ${orderId}`);

      const allPicked = order.items.every(i => i.picked);
      if (allPicked && order.stage === 'Route Picking') {
        order.stage = 'QC & Packing';
        this.addAudit(`All items picked for ${orderId} -> Staged at 3-Point QC Gate`);
      }

      this.notify('ITEM_PICKED', { orderId, skuId });
      this.notify('ORDER_UPDATED', order);
      this.recalculateStats();
    }
  }

  /**
   * Resolve active radar traffic bottleneck
   * @param {string} bottleneckId
   */
  resolveBottleneck(bottleneckId) {
    const bn = this.data.bottlenecks.find(b => b.id === bottleneckId);
    if (bn) {
      bn.resolved = true;
      this.addAudit(`Autonomous Swarm Rerouting deployed: Bottleneck [${bottleneckId}] cleared.`);
      this.notify('BOTTLENECK_RESOLVED', bn);
      this.recalculateStats();
    }
  }

  /**
   * Report damaged stock and write-off units safely
   * @param {string} skuId
   * @param {number} qty
   * @param {string} reason
   */
  reportDamage(skuId, qty, reason) {
    const sku = this.getSku(skuId);
    if (sku) {
      const damageQty = Math.min(sku.onHand, Math.max(1, parseInt(qty, 10) || 1));
      sku.onHand -= damageQty;
      const safeReason = (typeof WMSSecurity !== 'undefined') ? WMSSecurity.sanitizeInput(reason) : reason;
      this.addAudit(`Damaged Stock Write-off: -${damageQty}x ${sku.id} (${safeReason})`);
      this.notify('INVENTORY_UPDATED', { sku, damaged: damageQty });
      this.recalculateStats();
    }
  }

  /**
   * Replenish on-hand stock for a SKU
   * @param {string} skuId
   * @param {number} qty
   * @param {string} supplier
   */
  replenishSku(skuId, qty, supplier) {
    const sku = this.getSku(skuId);
    if (sku) {
      const addQty = Math.max(1, parseInt(qty, 10) || 10);
      sku.onHand += addQty;
      const safeSupplier = (typeof WMSSecurity !== 'undefined') ? WMSSecurity.sanitizeInput(supplier) : supplier;
      this.addAudit(`Stock Inbound Replenishment: +${addQty}x ${sku.id} from ${safeSupplier}`);
      this.notify('INVENTORY_UPDATED', { sku, added: addQty });
      this.recalculateStats();
    }
  }

  /**
   * Assign vehicle and destination route to a dock door
   * @param {number} dockId
   * @param {string} vehicle
   * @param {string} carrier
   * @param {string} dest
   */
  assignDock(dockId, vehicle, carrier, dest) {
    const dock = this.getDock(dockId);
    if (dock) {
      dock.vehicle = (typeof WMSSecurity !== 'undefined') ? WMSSecurity.sanitizeInput(vehicle) : vehicle;
      dock.carrier = (typeof WMSSecurity !== 'undefined') ? WMSSecurity.sanitizeInput(carrier) : carrier;
      dock.destination = (typeof WMSSecurity !== 'undefined') ? WMSSecurity.sanitizeInput(dest) : dest;
      dock.status = 'Loading';
      dock.capacityPct = 15;
      dock.eta = '25 mins';

      this.addAudit(`Assigned ${dock.carrier} (${dock.vehicle}) to Bay ${dockId} for ${dock.destination}`);
      this.notify('DOCK_UPDATED', dock);
    }
  }

  /**
   * Record immutable audit log entry
   * @param {string} action - Description of operation
   */
  addAudit(action) {
    const time = new Date().toLocaleTimeString();
    const safeAction = (typeof WMSSecurity !== 'undefined')
      ? WMSSecurity.sanitizeInput(action)
      : action;

    this.data.auditLog.unshift({
      time,
      user: this.activeRole,
      action: safeAction
    });

    // Prune audit log to 60 entries for memory efficiency
    if (this.data.auditLog.length > 60) {
      this.data.auditLog.length = 60;
    }

    this.notify('AUDIT_LOGGED', safeAction);
  }

  /**
   * Recalculate global warehouse KPI metrics
   */
  recalculateStats() {
    let activeOrders = 0;
    for (let i = 0; i < this.data.orders.length; i++) {
      if (this.data.orders[i].stage !== 'Completed') {
        activeOrders++;
      }
    }

    let activeBottlenecks = 0;
    for (let i = 0; i < this.data.bottlenecks.length; i++) {
      if (!this.data.bottlenecks[i].resolved) {
        activeBottlenecks++;
      }
    }

    this.data.systemStats.activeOrdersCount = activeOrders;
    this.data.systemStats.bottlenecksCount = activeBottlenecks;
    this.notify('STATS_UPDATED', this.data.systemStats);
  }
}

// Instantiate global singleton store
window.WMSState = new StateStore();
