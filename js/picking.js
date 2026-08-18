/**
 * LogiMind Antigravity WMS - Digital Pick, Pack & Quality Control Workflow
 */
class PickingModule {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animFrame = null;
    this.routeProgress = 0;
  }

  init() {
    this.bindEvents();
    this.initCanvas();
    this.render();

    // Subscribe to state
    window.WMSState.subscribe((event, payload, state) => {
      if (['ORDER_SELECTED', 'ORDER_UPDATED', 'ITEM_PICKED', 'VIEW_CHANGED', 'ORDER_CREATED'].includes(event)) {
        this.render();
      }
    });

    window.addEventListener('resize', () => {
      this.initCanvas();
      this.drawRoute();
    });
  }

  bindEvents() {
    // Select order dropdown for picking
    const orderSelectors = [
      document.getElementById('pickingOrderSelector'),
      document.getElementById('pickingOrderSelect')
    ].filter(Boolean);

    orderSelectors.forEach(sel => {
      sel.addEventListener('change', (e) => {
        window.WMSState.selectOrder(e.target.value);
      });
    });

    // Re-Optimize button
    const btnRecalculate = document.getElementById('btnRecalculateTsp');
    if (btnRecalculate) {
      btnRecalculate.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playCompute();
        this.drawRoute();
        if (typeof window.showToast === 'function') {
          window.showToast('TSP Path Optimized', 'Shortest-path Traveling Salesperson routing recalculated.', 'cyan');
        }
      });
    }

    // Manual Barcode Scanner Input
    const btnScanItem = document.getElementById('btnScanItem');
    const scannerInput = document.getElementById('scannerManualInput');
    if (btnScanItem) {
      btnScanItem.addEventListener('click', () => {
        const sku = scannerInput ? scannerInput.value.trim().toUpperCase() : '';
        this.handleManualScan(sku);
      });
    }

    if (scannerInput) {
      scannerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleManualScan(scannerInput.value.trim().toUpperCase());
        }
      });
    }

    // Laser Quick Auto-Scan Button
    const btnSimulateLaser = document.getElementById('btnSimulateLaser');
    if (btnSimulateLaser) {
      btnSimulateLaser.addEventListener('click', () => {
        this.simulateScanAction();
      });
    }

    // QC Checkbox toggles
    const qcCheckboxes = [
      document.getElementById('qcCheckDamage'),
      document.getElementById('qcCheckSkuMatch'),
      document.getElementById('qcCheckWeight'),
      document.getElementById('qcCheckVisual'),
      document.getElementById('qcCheckCushion')
    ].filter(Boolean);

    qcCheckboxes.forEach(el => {
      el.addEventListener('change', () => {
        this.updateQcStatus();
      });
    });

    // Seal Box & Advance to Dispatch Buttons
    const sealBtns = [
      document.getElementById('btnCompleteQCAndPack'),
      document.getElementById('btnApproveSeal')
    ].filter(Boolean);

    sealBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleApproveAndSeal();
      });
    });

    // Global click delegation for picking actions
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnCompleteQCAndPack, #btnApproveSeal')) {
        this.handleApproveAndSeal();
      }
    });
  }

  initCanvas() {
    this.canvas = document.getElementById('tspCanvas') || document.getElementById('routeOptimizerCanvas');
    if (!this.canvas) return;

    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 600;
      this.canvas.height = 320;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  render() {
    this.renderOrderSelector();
    this.renderPickList();
    this.renderSmartBox();
    this.renderQcPanel();
    this.drawRoute();
  }

  renderOrderSelector() {
    const selectors = [
      document.getElementById('pickingOrderSelector'),
      document.getElementById('pickingOrderSelect')
    ].filter(Boolean);

    if (selectors.length === 0) return;

    const orders = window.WMSState.data.orders;
    const currentId = window.WMSState.data.activeSelectedOrder;

    const optionsHtml = orders.map(o => `
      <option value="${o.id}" ${o.id === currentId ? 'selected' : ''}>
        ${o.id} - ${o.customer} (${o.stage}) - Priority: ${o.priority}
      </option>
    `).join('');

    selectors.forEach(sel => sel.innerHTML = optionsHtml);
  }

  getCurrentOrder() {
    const orders = window.WMSState.data.orders;
    const currentId = window.WMSState.data.activeSelectedOrder;
    return orders.find(o => o.id === currentId) || orders[0];
  }

  renderPickList() {
    const order = this.getCurrentOrder();
    const containers = [
      document.getElementById('pickingRouteChecklist'),
      document.getElementById('pickingItemsList')
    ].filter(Boolean);

    if (containers.length === 0 || !order) return;

    const allPicked = order.items.every(i => i.picked);
    const pickedCount = order.items.filter(i => i.picked).length;

    // Render pick progress bar if element exists
    const progressPct = Math.round((pickedCount / (order.items.length || 1)) * 100);
    const progressEl = document.getElementById('pickingProgressBar');
    const progressText = document.getElementById('pickingProgressText');
    if (progressEl) progressEl.style.width = `${progressPct}%`;
    if (progressText) progressText.textContent = `${pickedCount} / ${order.items.length} Items Picked (${progressPct}%)`;

    const html = order.items.map((item, idx) => {
      return `
        <div class="p-3.5 rounded-xl border transition-all ${item.picked ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/80 border-slate-700/60 hover:border-cyan-500/50'} flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg ${item.picked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'} flex items-center justify-center font-mono font-bold text-xs shrink-0">
              ${item.picked ? '✓' : idx + 1}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-slate-200">${item.name}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">${item.sku}</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span class="text-amber-400 font-mono font-semibold">📍 Rack ${item.bin} (${item.zone})</span>
                <span>•</span>
                <span class="font-mono text-slate-300">Qty: ${item.qty} units</span>
                <span>•</span>
                <span class="text-slate-400 font-mono">Weight: ${item.weightKg}kg/ea</span>
              </div>
            </div>
          </div>

          <div>
            ${item.picked ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PICKED ✅
              </span>
            ` : `
              <button onclick="window.pickingModule.quickPickItem('${order.id}', '${item.sku}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                Scan Item
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    containers.forEach(c => c.innerHTML = html);

    // Update target item in scanner
    const targetScannerEl = document.getElementById('scannerTargetItem');
    const firstUnpicked = order.items.find(i => !i.picked);
    if (targetScannerEl) {
      targetScannerEl.textContent = firstUnpicked 
        ? `Target: Scan SKU ${firstUnpicked.sku} (${firstUnpicked.name}) at Rack ${firstUnpicked.bin}`
        : 'All items picked for this order! Ready for QC inspection.';
    }
  }

  quickPickItem(orderId, skuId) {
    if (window.soundEngine) window.soundEngine.playScan();
    window.WMSState.pickItem(orderId, skuId);
    if (typeof window.showToast === 'function') {
      window.showToast('Item Scanned (880Hz)', `Verified SKU ${skuId} into picker tote.`, 'emerald');
    }
  }

  handleManualScan(skuId) {
    const order = this.getCurrentOrder();
    if (!order) return;

    if (!skuId) {
      if (typeof window.showToast === 'function') {
        window.showToast('Scanner Warning', 'Please enter a valid SKU ID to scan.', 'amber');
      }
      return;
    }

    const item = order.items.find(i => i.sku.toUpperCase() === skuId.toUpperCase());
    if (item) {
      this.quickPickItem(order.id, item.sku);
      const input = document.getElementById('scannerManualInput');
      if (input) input.value = '';
    } else {
      if (window.soundEngine) window.soundEngine.playAlert();
      if (typeof window.showToast === 'function') {
        window.showToast('SKU Mismatch', `SKU ${skuId} is not part of Order ${order.id}.`, 'rose');
      }
    }
  }

  renderSmartBox() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const totalWeight = order.items.reduce((acc, i) => acc + (i.weightKg * i.qty), 0).toFixed(2);
    const boxRecEl = document.getElementById('smartBoxType') || document.getElementById('smartBoxName');
    const boxDimsEl = document.getElementById('smartBoxDims');
    const boxWeightEl = document.getElementById('smartBoxWeight');
    const boxCarbonEl = document.getElementById('smartBoxCarbon');

    let boxName = 'Box-B (Medium 35x25x15cm)';
    let boxDims = '35 x 25 x 15 cm (13,125 cm³)';
    let carbonSavings = '-18% CO₂ Packaging Footprint';

    if (totalWeight < 1.0) {
      boxName = 'Box-A (Compact 20x15x10cm)';
      boxDims = '20 x 15 x 10 cm (3,000 cm³)';
      carbonSavings = '-26% CO₂ Packaging Footprint';
    } else if (totalWeight > 4.0) {
      boxName = 'Box-C (Heavy-Duty 45x35x30cm)';
      boxDims = '45 x 35 x 30 cm (47,250 cm³)';
      carbonSavings = '-12% CO₂ Packaging Footprint';
    }

    if (boxRecEl) boxRecEl.textContent = boxName;
    if (boxDimsEl) boxDimsEl.textContent = boxDims;
    if (boxWeightEl) boxWeightEl.textContent = `Total Calculated Weight: ${totalWeight} kg`;
    if (boxCarbonEl) boxCarbonEl.textContent = carbonSavings;
  }

  renderQcPanel() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const qcDamage = document.getElementById('qcCheckDamage');
    const qcSkuMatch = document.getElementById('qcCheckSkuMatch');
    const qcWeight = document.getElementById('qcCheckWeight');
    const qcVisual = document.getElementById('qcCheckVisual');
    const qcCushion = document.getElementById('qcCheckCushion');
    const btnComplete = document.getElementById('btnCompleteQCAndPack') || document.getElementById('btnApproveSeal');

    const isPassed = order.qc && order.qc.approved;

    if (qcDamage) qcDamage.checked = isPassed || (order.qc && order.qc.damage);
    if (qcSkuMatch) qcSkuMatch.checked = isPassed || (order.qc && order.qc.skuMatch);
    if (qcWeight) qcWeight.checked = isPassed || (order.qc && order.qc.weight);
    if (qcVisual) qcVisual.checked = isPassed || (order.qc && order.qc.visual);
    if (qcCushion) qcCushion.checked = isPassed || (order.qc && order.qc.cushion);

    if (btnComplete) {
      if (isPassed) {
        btnComplete.textContent = `Package Sealed & Passed (Seal: ${order.qc.sealId || 'SEAL-OK'})`;
        btnComplete.className = 'w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono text-center';
      } else {
        btnComplete.textContent = 'Seal Box & Advance to Dispatch';
        btnComplete.className = 'w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg glow-emerald cursor-pointer';
      }
    }
  }

  updateQcStatus() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const qcDamage = document.getElementById('qcCheckDamage');
    const qcSkuMatch = document.getElementById('qcCheckSkuMatch');
    const qcWeight = document.getElementById('qcCheckWeight');
    const qcVisual = document.getElementById('qcCheckVisual');
    const qcCushion = document.getElementById('qcCheckCushion');

    if (!order.qc) order.qc = {};

    if (qcDamage) order.qc.damage = qcDamage.checked;
    if (qcSkuMatch) order.qc.skuMatch = qcSkuMatch.checked;
    if (qcWeight) order.qc.weight = qcWeight.checked;
    if (qcVisual) order.qc.visual = qcVisual.checked;
    if (qcCushion) order.qc.cushion = qcCushion.checked;

    if (window.soundEngine) window.soundEngine.playClick();
  }

  handleApproveAndSeal() {
    const order = this.getCurrentOrder();
    if (!order) return;

    // Check if items are picked
    const allPicked = order.items.every(i => i.picked);
    if (!allPicked) {
      // Auto-pick remaining items for smooth demo flow
      order.items.forEach(i => i.picked = true);
    }

    // Auto-check all 3 inspection gates if user clicks Seal Box
    const qcDamage = document.getElementById('qcCheckDamage');
    const qcSkuMatch = document.getElementById('qcCheckSkuMatch');
    const qcWeight = document.getElementById('qcCheckWeight');
    if (qcDamage) qcDamage.checked = true;
    if (qcSkuMatch) qcSkuMatch.checked = true;
    if (qcWeight) qcWeight.checked = true;

    if (!order.qc) order.qc = {};
    order.qc.approved = true;
    order.qc.damage = true;
    order.qc.skuMatch = true;
    order.qc.weight = true;
    order.qc.visual = true;
    order.qc.cushion = true;
    order.qc.sealId = `SEAL-${order.id.replace('ORD-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    order.stage = 'Dispatch Ready';

    if (window.soundEngine) window.soundEngine.playSuccess();
    window.WMSState.addAudit(`QC Gate Passed for ${order.id} - Applied Tamper Seal ${order.qc.sealId} and advanced to Dispatch Ready`);
    
    if (typeof window.showToast === 'function') {
      window.showToast(
        'Package Sealed & Advanced to Dispatch',
        `Order ${order.id} successfully passed 3-Point QC! Tamper Seal #${order.qc.sealId} locked.`,
        'emerald'
      );
    }

    this.render();
    window.WMSState.recalculateStats();

    // Auto-sync other views
    if (window.dashboardModule) window.dashboardModule.render();
    if (window.dispatchModule) window.dispatchModule.render();
  }

  // Draw 2D Warehouse Floor Canvas & Shortest Path TSP
  drawRoute() {
    if (!this.canvas) {
      this.initCanvas();
    }
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw warehouse floor grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw Racks / Storage Zones
    const racks = [
      { label: 'Zone A (A-01..A-08)', x: 30, y: 30, w: 110, h: 90, color: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4' },
      { label: 'Zone B (B-01..B-08)', x: 170, y: 30, w: 110, h: 90, color: 'rgba(16, 185, 129, 0.15)', border: '#10b981' },
      { label: 'Zone C (C-01..C-08)', x: 310, y: 30, w: 110, h: 90, color: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6' },
      { label: 'Zone D (D-01..D-08)', x: 450, y: 30, w: 110, h: 90, color: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
      { label: 'Packing & QC Station 1', x: 60, y: 190, w: 160, h: 70, color: 'rgba(51, 65, 85, 0.35)', border: '#475569' },
      { label: 'Dock Outbound Bays 1-4', x: 330, y: 190, w: 200, h: 70, color: 'rgba(6, 182, 212, 0.12)', border: '#06b6d4' }
    ];

    racks.forEach(r => {
      ctx.fillStyle = r.color;
      ctx.strokeStyle = r.border;
      ctx.lineWidth = 1.5;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(r.label, r.x + 8, r.y + 18);
    });

    // Draw Shortest Path Route TSP Nodes
    const waypoints = [
      { x: 30, y: 230, name: 'Picker Depot (Start)' },
      { x: 85, y: 75, name: 'Stop 1: Bin A-03' },
      { x: 225, y: 75, name: 'Stop 2: Bin B-02' },
      { x: 365, y: 75, name: 'Stop 3: Bin C-01' },
      { x: 140, y: 225, name: 'End: QC Packing Gate' }
    ];

    // Draw animated dashed connecting path
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Draw Waypoint nodes
    waypoints.forEach((wp, idx) => {
      ctx.fillStyle = idx === 0 ? '#10b981' : idx === waypoints.length - 1 ? '#8b5cf6' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(wp.name, wp.x - 15, wp.y - 12);
    });
  }

  simulateScanAction() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const unpicked = order.items.find(i => !i.picked);
    if (unpicked) {
      this.quickPickItem(order.id, unpicked.sku);
    } else {
      if (window.soundEngine) window.soundEngine.playSuccess();
      if (typeof window.showToast === 'function') {
        window.showToast('All Items Picked', 'All items for this order are already scanned. Proceed to QC seal.', 'cyan');
      }
    }
  }
}

window.pickingModule = new PickingModule();
