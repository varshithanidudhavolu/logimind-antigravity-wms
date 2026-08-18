/**
 * LogiMind Antigravity WMS - Reactive Global State Store
 */
class StateStore {
  constructor() {
    this.listeners = [];
    this.activeRole = 'Operations Manager';
    this.activeView = 'dashboard';
    this.activeFilter = 'ALL';
    this.searchQuery = '';
    this.soundMuted = false;

    // Seed Data
    this.data = {
      systemStats: {
        activeRules: 14,
        latencyMs: 12,
        engineVersion: 'Antigravity-v4.2',
        spaceUtilizationPct: 84.2,
        slaCompliancePct: 98.4,
        todayPicksCount: 1428,
        activeOrdersCount: 26,
        bottlenecksCount: 2
      },

      skus: [
        { id: 'SKU-E101', name: 'Quantum LiDAR Sensor V2', category: 'Electronics', zone: 'Zone A', aisle: 'A-03', bin: 'BIN-03', onHand: 24, allocated: 12, safetyBuffer: 10, batch: 'B26-A1', expiry: '2027-12', unitCost: 180.00, weightKg: 0.4 },
        { id: 'SKU-E102', name: 'Edge AI Vision Module', category: 'Electronics', zone: 'Zone A', aisle: 'A-07', bin: 'BIN-07', onHand: 18, allocated: 6, safetyBuffer: 8, batch: 'B26-A2', expiry: '2028-04', unitCost: 320.00, weightKg: 0.3 },
        { id: 'SKU-F204', name: 'Titanium Hex Bolts M8', category: 'Fasteners', zone: 'Zone B', aisle: 'B-02', bin: 'BIN-02', onHand: 450, allocated: 120, safetyBuffer: 100, batch: 'B26-B1', expiry: 'N/A', unitCost: 2.50, weightKg: 0.03 },
        { id: 'SKU-F205', name: 'Carbon Fiber Brackets', category: 'Fasteners', zone: 'Zone B', aisle: 'B-06', bin: 'BIN-06', onHand: 85, allocated: 30, safetyBuffer: 25, batch: 'B26-B2', expiry: 'N/A', unitCost: 45.00, weightKg: 0.15 },
        { id: 'SKU-H501', name: 'Solid State Battery Pack', category: 'High-Value', zone: 'Zone C', aisle: 'C-01', bin: 'BIN-01', onHand: 12, allocated: 7, safetyBuffer: 6, batch: 'B26-C1', expiry: '2029-01', unitCost: 750.00, weightKg: 0.8 },
        { id: 'SKU-H502', name: 'Cryo-Cooled Optical Processor', category: 'High-Value', zone: 'Zone C', aisle: 'C-04', bin: 'BIN-04', onHand: 8, allocated: 3, safetyBuffer: 4, batch: 'B26-C2', expiry: '2028-09', unitCost: 1850.00, weightKg: 1.2 },
        { id: 'SKU-A309', name: 'Smart Kevlar ESD Gloves', category: 'Apparel', zone: 'Zone D', aisle: 'D-03', bin: 'BIN-03', onHand: 140, allocated: 40, safetyBuffer: 30, batch: 'B26-D1', expiry: '2026-11', unitCost: 28.00, weightKg: 0.09 },
        { id: 'SKU-A310', name: 'RFID Thermal Sensor Badges', category: 'Apparel', zone: 'Zone D', aisle: 'D-08', bin: 'BIN-08', onHand: 220, allocated: 60, safetyBuffer: 50, batch: 'B26-D2', expiry: '2027-06', unitCost: 15.00, weightKg: 0.02 }
      ],

      orders: [
        {
          id: 'ORD-9821',
          customer: 'Tesla Gigafactory Texas',
          priority: 96,
          stage: 'Route Picking',
          carrier: 'FedEx Priority',
          dest: 'Austin, TX 78725',
          slaTimer: '00h 42m',
          slaUrgent: true,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 2220.00,
          items: [
            { sku: 'SKU-E101', name: 'Quantum LiDAR Sensor V2', qty: 4, bin: 'A-03', zone: 'Zone A', picked: false, weightKg: 0.4 },
            { sku: 'SKU-H501', name: 'Solid State Battery Pack', qty: 2, bin: 'C-01', zone: 'Zone C', picked: false, weightKg: 0.8 }
          ],
          qc: { visual: true, weight: true, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9822',
          customer: 'Northrop Space Systems',
          priority: 88,
          stage: 'Stock Allocation',
          carrier: 'DHL Express',
          dest: 'Redondo Beach, CA 90278',
          slaTimer: '01h 15m',
          slaUrgent: false,
          boxSize: 'Box S1 (20x15x10cm)',
          value: 1850.00,
          items: [
            { sku: 'SKU-H502', name: 'Cryo-Cooled Optical Processor', qty: 1, bin: 'C-04', zone: 'Zone C', picked: false, weightKg: 1.2 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9823',
          customer: 'Boston Dynamics R&D',
          priority: 62,
          stage: 'QC & Packing',
          carrier: 'FedEx Ground',
          dest: 'Waltham, MA 02451',
          slaTimer: '02h 50m',
          slaUrgent: false,
          boxSize: 'Box L3 (40x30x25cm)',
          value: 650.00,
          items: [
            { sku: 'SKU-F204', name: 'Titanium Hex Bolts M8', qty: 80, bin: 'B-02', zone: 'Zone B', picked: true, weightKg: 0.03 },
            { sku: 'SKU-F205', name: 'Carbon Fiber Brackets', qty: 10, bin: 'B-06', zone: 'Zone B', picked: true, weightKg: 0.15 }
          ],
          qc: { visual: true, weight: true, cushion: true, approved: false, sealId: null }
        },
        {
          id: 'ORD-9824',
          customer: 'Amazon Robotics Hub',
          priority: 94,
          stage: 'Dispatch Ready',
          carrier: 'BlueDart Express',
          dest: 'Seattle, WA 98109',
          slaTimer: '00h 25m',
          slaUrgent: true,
          boxSize: 'Box S1 (20x15x10cm)',
          value: 960.00,
          tracking: 'BLU-8829104-US',
          items: [
            { sku: 'SKU-E102', name: 'Edge AI Vision Module', qty: 3, bin: 'A-07', zone: 'Zone A', picked: true, weightKg: 0.3 }
          ],
          qc: { visual: true, weight: true, cushion: true, approved: true, sealId: 'SEAL-9824-SEC' }
        },
        {
          id: 'ORD-9825',
          customer: 'Apex Robotics Lab',
          priority: 35,
          stage: 'Priority Scoring',
          carrier: 'DHL Standard',
          dest: 'Denver, CO 80202',
          slaTimer: '05h 10m',
          slaUrgent: false,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 560.00,
          items: [
            { sku: 'SKU-A309', name: 'Smart Kevlar ESD Gloves', qty: 20, bin: 'D-03', zone: 'Zone D', picked: false, weightKg: 0.09 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        },
        {
          id: 'ORD-9826',
          customer: 'Lucid Motors HQ',
          priority: 58,
          stage: 'Order Created',
          carrier: 'FedEx Freight',
          dest: 'Newark, CA 94560',
          slaTimer: '04h 00m',
          slaUrgent: false,
          boxSize: 'Box M2 (30x20x15cm)',
          value: 675.00,
          items: [
            { sku: 'SKU-F205', name: 'Carbon Fiber Brackets', qty: 15, bin: 'B-06', zone: 'Zone B', picked: false, weightKg: 0.15 }
          ],
          qc: { visual: false, weight: false, cushion: false, approved: false, sealId: null }
        }
      ],

      docks: [
        { id: 1, name: 'Dock 1 - Heavy Freight', status: 'Loading', carrier: 'FedEx Freight', vehicle: 'TRK-4491', capacityPct: 82, destination: 'DFW Airport Cargo Hub', eta: '18 mins' },
        { id: 2, name: 'Dock 2 - Express Parcel', status: 'Available', carrier: 'DHL Express', vehicle: 'VAN-0892', capacityPct: 0, destination: 'Ready for loading', eta: 'Standby' },
        { id: 3, name: 'Dock 3 - Cross-Dock Bay', status: 'Reserved', carrier: 'BlueDart Logistics', vehicle: 'TRK-9921', capacityPct: 45, destination: 'Austin Regional Hub', eta: '35 mins' },
        { id: 4, name: 'Dock 4 - Automated Bay', status: 'Maintenance', carrier: 'Autonomous Fleet', vehicle: 'AGV-M1', capacityPct: 0, destination: 'Sensor Recalibration', eta: 'Under Service' }
      ],

      bottlenecks: [
        { id: 'BN-01', title: 'Zone B Aisle 4 Congestion', desc: 'AGV-03 & AGV-07 traffic lock at intersection. Rerouting via Bypass C-3 available.', delay: '+14m', severity: 'High', resolved: false },
        { id: 'BN-02', title: 'Station 2 Scale Drift', desc: 'Smart Scale Delta +0.08kg exceeds tare tolerance. Recalibration recommended.', delay: '+6m', severity: 'Medium', resolved: false }
      ],

      purchaseOrders: [
        { id: 'PO-701', sku: 'SKU-F204', name: 'Titanium Hex Bolts M8', qty: 250, supplier: 'TitanForge Industrial', status: 'Auto-Approved', date: '2026-08-18', reason: 'Buffer replenishment' },
        { id: 'PO-702', sku: 'SKU-E101', name: 'Quantum LiDAR Sensor V2', qty: 20, supplier: 'Photonix Labs USA', status: 'In Transit', date: '2026-08-17', reason: 'Anticipated surge' }
      ],

      auditLog: [
        { time: '10:14:22', user: 'System AI Engine', action: 'Auto-Scored Priority for ORD-9821: Score 96 (Urgent SLA)' },
        { time: '10:08:15', user: 'LogiBot AI', action: 'Resolved Stock Conflict: Reallocated 3 units SKU-E101 to ORD-9821' },
        { time: '09:55:00', user: 'Dispatcher John', action: 'Assigned Dock 1 to FedEx Freight TRK-4491' }
      ],

      activeSelectedOrder: 'ORD-9821'
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, payload) {
    this.listeners.forEach(listener => {
      try {
        listener(event, payload, this.data);
      } catch (e) {
        console.error("State listener error:", e);
      }
    });
  }

  // Set active role
  setRole(role) {
    this.activeRole = role;
    this.notify('ROLE_CHANGED', role);
  }

  // Set active view
  setView(view) {
    this.activeView = view;
    this.notify('VIEW_CHANGED', view);
  }

  // Set pipeline filter
  setFilter(filter) {
    this.activeFilter = filter;
    this.notify('FILTER_CHANGED', filter);
  }

  // Search
  setSearch(query) {
    this.searchQuery = query.toLowerCase();
    this.notify('SEARCH_CHANGED', query);
  }

  // Select active order
  selectOrder(orderId) {
    this.data.activeSelectedOrder = orderId;
    this.notify('ORDER_SELECTED', orderId);
  }

  // Update order stage
  advanceOrderStage(orderId, nextStage) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (order) {
      const prev = order.stage;
      order.stage = nextStage;
      this.addAudit(`Advanced ${orderId} from [${prev}] to [${nextStage}]`);
      this.notify('ORDER_UPDATED', order);
      this.recalculateStats();
    }
  }

  // Mark item picked
  pickItem(orderId, skuId) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (order) {
      const item = order.items.find(i => i.sku === skuId);
      if (item) {
        item.picked = true;
        this.addAudit(`Picker scanned & verified ${item.name} (${skuId}) for ${orderId}`);
        
        // check if all items picked
        const allPicked = order.items.every(i => i.picked);
        if (allPicked && order.stage === 'Route Picking') {
          order.stage = 'QC & Packing';
          this.addAudit(`Order ${orderId} picking complete -> Transitioned to QC & Packing`);
        }

        this.notify('ITEM_PICKED', { orderId, skuId });
        this.recalculateStats();
      }
    }
  }

  // Report damaged stock
  reportDamaged(skuId, qty, reason) {
    const sku = this.data.skus.find(s => s.id === skuId);
    if (!sku) return { success: false, msg: 'SKU not found' };

    qty = parseInt(qty, 10) || 1;
    sku.onHand = Math.max(0, sku.onHand - qty);

    let reorderTriggered = false;
    let newPo = null;

    if (sku.onHand < sku.safetyBuffer) {
      reorderTriggered = true;
      const reorderQty = Math.max(50, sku.safetyBuffer * 2);
      newPo = {
        id: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        sku: sku.id,
        name: sku.name,
        qty: reorderQty,
        supplier: 'Auto-Triggered Emergency Vendor',
        status: 'Draft Pending Approval',
        date: new Date().toISOString().split('T')[0],
        reason: `Damaged Stock Exception (${reason}). On-hand (${sku.onHand}) dropped below Safety Buffer (${sku.safetyBuffer}).`
      };
      this.data.purchaseOrders.unshift(newPo);
    }

    this.addAudit(`Damaged Stock Exception: -${qty} units of ${sku.name} (${sku.id}) reported due to [${reason}].`);
    this.notify('INVENTORY_UPDATED', { sku, reorderTriggered, newPo });
    this.recalculateStats();

    return { success: true, sku, reorderTriggered, newPo };
  }

  // Resolve Bottleneck
  resolveBottleneck(bnId) {
    const bn = this.data.bottlenecks.find(b => b.id === bnId);
    if (bn) {
      bn.resolved = true;
      this.addAudit(`Auto-Rerouted AGVs & Cleared Bottleneck [${bn.title}]`);
      this.notify('BOTTLENECK_RESOLVED', bn);
      this.recalculateStats();
    }
  }

  // Assign Dock
  assignDock(dockId, vehicle, carrier, dest) {
    const dock = this.data.docks.find(d => d.id === dockId);
    if (dock) {
      dock.vehicle = vehicle;
      dock.carrier = carrier;
      dock.destination = dest;
      dock.status = 'Loading';
      dock.capacityPct = 15;
      dock.eta = '25 mins';
      this.addAudit(`Assigned ${carrier} (${vehicle}) to Dock ${dockId} for ${dest}`);
      this.notify('DOCK_UPDATED', dock);
    }
  }

  // Dispatch Order with Signature POD
  dispatchOrder(orderId, carrier, trackingCode, signatureDataUrl) {
    const order = this.data.orders.find(o => o.id === orderId);
    if (order) {
      order.stage = 'Completed';
      order.carrier = carrier;
      order.tracking = trackingCode;
      order.podSignature = signatureDataUrl;
      order.dispatchTime = new Date().toLocaleTimeString();

      this.addAudit(`Order ${orderId} DISPATCHED via ${carrier} with Tracking #${trackingCode} (Signed POD captured)`);
      this.notify('ORDER_DISPATCHED', order);
      this.recalculateStats();
    }
  }

  // Add audit log entry
  addAudit(action) {
    const time = new Date().toLocaleTimeString();
    this.data.auditLog.unshift({
      time,
      user: this.activeRole,
      action
    });
    if (this.data.auditLog.length > 50) this.data.auditLog.pop();
    this.notify('AUDIT_LOGGED', action);
  }

  recalculateStats() {
    const activeOrders = this.data.orders.filter(o => o.stage !== 'Completed').length;
    const activeBottlenecks = this.data.bottlenecks.filter(b => !b.resolved).length;
    this.data.systemStats.activeOrdersCount = activeOrders;
    this.data.systemStats.bottlenecksCount = activeBottlenecks;
    this.notify('STATS_UPDATED', this.data.systemStats);
  }
}

window.WMSState = new StateStore();
