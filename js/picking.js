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
      if (['ORDER_SELECTED', 'ORDER_UPDATED', 'ITEM_PICKED', 'VIEW_CHANGED'].includes(event)) {
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
    const orderSelect = document.getElementById('pickingOrderSelect');
    if (orderSelect) {
      orderSelect.addEventListener('change', (e) => {
        window.WMSState.selectOrder(e.target.value);
      });
    }

    // Barcode scanner trigger
    const scanBtn = document.getElementById('btnOpenScanner');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        this.openScannerModal();
      });
    }

    // Close scanner modal
    const closeScanBtn = document.getElementById('btnCloseScanner');
    if (closeScanBtn) {
      closeScanBtn.addEventListener('click', () => {
        this.closeScannerModal();
      });
    }

    // Simulated scan action inside viewfinder
    const triggerScanBtn = document.getElementById('btnSimulateBarcodeScan');
    if (triggerScanBtn) {
      triggerScanBtn.addEventListener('click', () => {
        this.simulateScanAction();
      });
    }

    // QC Checkbox toggles
    const qcVisual = document.getElementById('qcCheckVisual');
    const qcWeight = document.getElementById('qcCheckWeight');
    const qcCushion = document.getElementById('qcCheckCushion');
    const btnApproveSeal = document.getElementById('btnApproveSeal');

    [qcVisual, qcWeight, qcCushion].forEach(el => {
      if (el) {
        el.addEventListener('change', () => {
          this.updateQcStatus();
        });
      }
    });

    if (btnApproveSeal) {
      btnApproveSeal.addEventListener('click', () => {
        this.handleApproveAndSeal();
      });
    }
  }

  initCanvas() {
    this.canvas = document.getElementById('routeOptimizerCanvas');
    if (!this.canvas) return;

    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 600;
      this.canvas.height = 280;
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
    const select = document.getElementById('pickingOrderSelect');
    if (!select) return;

    const orders = window.WMSState.data.orders;
    const currentId = window.WMSState.data.activeSelectedOrder;

    select.innerHTML = orders.map(o => `
      <option value="${o.id}" ${o.id === currentId ? 'selected' : ''}>
        ${o.id} - ${o.customer} (${o.stage}) - Priority: ${o.priority}
      </option>
    `).join('');
  }

  getCurrentOrder() {
    const orders = window.WMSState.data.orders;
    const currentId = window.WMSState.data.activeSelectedOrder;
    return orders.find(o => o.id === currentId) || orders[0];
  }

  renderPickList() {
    const order = this.getCurrentOrder();
    const container = document.getElementById('pickingItemsList');
    if (!container || !order) return;

    const allPicked = order.items.every(i => i.picked);
    const pickedCount = order.items.filter(i => i.picked).length;

    // Render pick progress bar
    const progressPct = Math.round((pickedCount / order.items.length) * 100);
    const progressEl = document.getElementById('pickingProgressBar');
    const progressText = document.getElementById('pickingProgressText');
    if (progressEl) progressEl.style.width = `${progressPct}%`;
    if (progressText) progressText.textContent = `${pickedCount} / ${order.items.length} Items Picked (${progressPct}%)`;

    container.innerHTML = order.items.map((item, idx) => {
      return `
        <div class="p-3.5 rounded-xl border transition-all ${item.picked ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900/80 border-slate-700/60 hover:border-cyan-500/50'} flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl ${item.picked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'} flex items-center justify-center font-mono font-bold text-sm shrink-0">
              ${item.picked ? '✓' : idx + 1}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-200">${item.name}</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">${item.sku}</span>
              </div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span class="text-amber-400 font-mono font-semibold">📍 Rack ${item.bin} (${item.zone})</span>
                <span>&bull;</span>
                <span class="font-mono text-slate-300">Qty: ${item.qty} units</span>
                <span>&bull;</span>
                <span class="text-slate-400 font-mono">Weight: ${item.weightKg}kg/ea</span>
              </div>
            </div>
          </div>

          <div>
            ${item.picked ? `
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PICKED ✅
              </span>
            ` : `
              <button onclick="window.pickingModule.quickPickItem('${order.id}', '${item.sku}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                Scan SKU
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  quickPickItem(orderId, skuId) {
    window.soundEngine.playScan();
    window.WMSState.pickItem(orderId, skuId);
    window.showToast('Item Scanned', `Verified SKU ${skuId} into picker tote.`, 'emerald');
  }

  renderSmartBox() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const totalWeight = order.items.reduce((acc, i) => acc + (i.weightKg * i.qty), 0).toFixed(2);
    const boxRecEl = document.getElementById('smartBoxName');
    const boxDimsEl = document.getElementById('smartBoxDims');
    const boxWeightEl = document.getElementById('smartBoxWeight');
    const boxCarbonEl = document.getElementById('smartBoxCarbon');

    let boxName = 'Box M2';
    let boxDims = '30 x 20 x 15 cm (9,000 cm³)';
    let carbonSavings = '-18% CO₂ Packaging Footprint';

    if (totalWeight < 1.0) {
      boxName = 'Box S1 (Compact)';
      boxDims = '20 x 15 x 10 cm (3,000 cm³)';
      carbonSavings = '-26% CO₂ Packaging Footprint';
    } else if (totalWeight > 4.0) {
      boxName = 'Box L3 (Heavy-Duty Reinforced)';
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

    const qcVisual = document.getElementById('qcCheckVisual');
    const qcWeight = document.getElementById('qcCheckWeight');
    const qcCushion = document.getElementById('qcCheckCushion');
    const sealBadge = document.getElementById('qcSealBadge');
    const btnApprove = document.getElementById('btnApproveSeal');

    if (qcVisual) qcVisual.checked = order.qc.visual;
    if (qcWeight) qcWeight.checked = order.qc.weight;
    if (qcCushion) qcCushion.checked = order.qc.cushion;

    if (order.qc.approved && order.qc.sealId) {
      if (sealBadge) {
        sealBadge.innerHTML = `
          <div class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between">
            <span class="font-bold">SECURITY SEAL: ${order.qc.sealId}</span>
            <span>STATUS: QC PASSED ✅</span>
          </div>
        `;
      }
      if (btnApprove) {
        btnApprove.disabled = true;
        btnApprove.textContent = 'Package Sealed & QC Approved';
        btnApprove.className = 'w-full py-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-not-allowed';
      }
    } else {
      if (sealBadge) {
        sealBadge.innerHTML = `
          <div class="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 font-mono text-xs text-center">
            Pending 3-Point Inspection Sign-off
          </div>
        `;
      }
      if (btnApprove) {
        btnApprove.disabled = false;
        btnApprove.textContent = 'Approve & Seal Package';
        btnApprove.className = 'w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg cursor-pointer';
      }
    }
  }

  updateQcStatus() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const qcVisual = document.getElementById('qcCheckVisual');
    const qcWeight = document.getElementById('qcCheckWeight');
    const qcCushion = document.getElementById('qcCheckCushion');

    if (qcVisual) order.qc.visual = qcVisual.checked;
    if (qcWeight) order.qc.weight = qcWeight.checked;
    if (qcCushion) order.qc.cushion = qcCushion.checked;

    window.soundEngine.playClick();
  }

  handleApproveAndSeal() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const allChecked = order.qc.visual && order.qc.weight && order.qc.cushion;
    if (!allChecked) {
      window.soundEngine.playAlert();
      window.showToast('QC Incomplete', 'Please check and verify all 3 inspection gates before sealing.', 'amber');
      return;
    }

    order.qc.approved = true;
    order.qc.sealId = `SEAL-${order.id.replace('ORD-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    order.stage = 'Dispatch Ready';

    window.soundEngine.playSuccess();
    window.WMSState.addAudit(`QC Gate Passed for ${order.id} - Applied Tamper Seal ${order.qc.sealId}`);
    window.showToast('Package Approved & Sealed', `Tamper-proof Seal #${order.qc.sealId} generated. Ready for dispatch.`, 'emerald');

    this.render();
    window.WMSState.recalculateStats();
  }

  // Draw 2D Warehouse Grid & Animated Traveling Salesperson Shortest Path
  drawRoute() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw warehouse floor grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    const gridSize = 20;
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

    // Draw Racks / Zones
    const racks = [
      { label: 'Zone A (A-01..A-08)', x: 40, y: 30, w: 100, h: 80, color: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4' },
      { label: 'Zone B (B-01..B-08)', x: 180, y: 30, w: 100, h: 80, color: 'rgba(16, 185, 129, 0.15)', border: '#10b981' },
      { label: 'Zone C (C-01..C-08)', x: 320, y: 30, w: 100, h: 80, color: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6' },
      { label: 'Zone D (D-01..D-08)', x: 460, y: 30, w: 100, h: 80, color: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
      
      { label: 'Packing Station 1', x: 80, y: 180, w: 140, h: 60, color: 'rgba(51, 65, 85, 0.3)', border: '#475569' },
      { label: 'QC & Dispatch Bays', x: 340, y: 180, w: 180, h: 60, color: 'rgba(6, 182, 212, 0.1)', border: '#06b6d4' }
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
      { x: 30, y: 220, name: 'Picker Depot (Start)' },
      { x: 90, y: 70, name: 'Stop 1: Bin A-03' },
      { x: 230, y: 70, name: 'Stop 2: Bin B-02' },
      { x: 370, y: 70, name: 'Stop 3: Bin C-01' },
      { x: 430, y: 210, name: 'End: QC Station' }
    ];

    // Draw dashed connecting path
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
    ctx.shadowBlur = 10;

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
      ctx.fillText(wp.name, wp.x - 20, wp.y - 12);
    });
  }

  openScannerModal() {
    window.soundEngine.playClick();
    const modal = document.getElementById('scannerModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeScannerModal() {
    const modal = document.getElementById('scannerModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  simulateScanAction() {
    const order = this.getCurrentOrder();
    if (!order) return;

    const unpicked = order.items.find(i => !i.picked);
    if (unpicked) {
      window.soundEngine.playScan();
      window.WMSState.pickItem(order.id, unpicked.sku);
      window.showToast('Barcode Verified', `Scanned SKU: ${unpicked.sku} - ${unpicked.name}`, 'emerald');
      this.closeScannerModal();
    } else {
      window.soundEngine.playSuccess();
      window.showToast('All Items Picked', 'All items for this order are already scanned.', 'cyan');
      this.closeScannerModal();
    }
  }
}

window.pickingModule = new PickingModule();
