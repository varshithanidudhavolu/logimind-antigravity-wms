/**
 * LogiMind Antigravity WMS - Fleet, Dock Door & Dispatch Center
 */
class DispatchModule {
  constructor() {
    this.sigCanvas = null;
    this.sigCtx = null;
    this.isDrawing = false;
    this.selectedCarrier = 'FedEx Priority';
    this.activeDispatchOrderId = 'ORD-9824';
  }

  init() {
    this.bindEvents();
    this.render();
    this.initSignaturePad();

    // Subscribe to state
    if (window.WMSState) {
      window.WMSState.subscribe((event, payload, state) => {
        if (['DOCK_UPDATED', 'ORDER_DISPATCHED', 'ORDER_UPDATED', 'VIEW_CHANGED', 'ORDER_CREATED'].includes(event)) {
          this.render();
        }
      });
    }
  }

  bindEvents() {
    // Dock Bay Modal form submission
    const dockForm = document.getElementById('dockAssignForm');
    if (dockForm) {
      dockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDockAssignSubmit();
      });
    }

    // AI Auto-Match Carrier button
    const btnAiCarrierMatch = document.getElementById('btnAiCarrierMatch');
    if (btnAiCarrierMatch) {
      btnAiCarrierMatch.addEventListener('click', () => {
        this.runAiCarrierMatch();
      });
    }

    // Clear signature button
    const btnClearSig = document.getElementById('btnClearSignature');
    if (btnClearSig) {
      btnClearSig.addEventListener('click', () => {
        this.clearSignature();
      });
    }

    // Sign & Dispatch button
    const btnSign = document.getElementById('btnSignAndDispatch');
    if (btnSign) {
      btnSign.addEventListener('click', () => {
        this.handleSignAndDispatch();
      });
    }

    // Global click delegation for carrier selection and dispatch buttons
    document.addEventListener('click', (e) => {
      // Select carrier button click
      const carrierBtn = e.target.closest('.btn-select-carrier, [data-carrier]');
      if (carrierBtn && !e.target.closest('#topbarRoleSelect')) {
        const carrier = carrierBtn.dataset.carrier;
        if (carrier) {
          e.preventDefault();
          this.selectCarrier(carrier);
        }
      }

      // Assign dock bay button
      const assignDockBtn = e.target.closest('.btn-assign-dock');
      if (assignDockBtn) {
        e.preventDefault();
        const dockId = parseInt(assignDockBtn.dataset.dockId, 10);
        this.openDockAssignModal(dockId);
      }
    });
  }

  render() {
    this.renderDockCards();
    this.renderCarrierMatrix();
    this.renderReadyOrdersList();
  }

  renderDockCards() {
    const containers = [
      document.getElementById('dockDoorsContainer'),
      document.getElementById('dockDoorsGrid')
    ].filter(Boolean);

    if (containers.length === 0) return;

    const docks = (window.WMSState && window.WMSState.data.docks) ? window.WMSState.data.docks : [
      { id: 1, name: 'Dock 1 - Heavy Freight', status: 'Loading', carrier: 'FedEx Freight', vehicle: 'TRK-4491', capacityPct: 82, destination: 'DFW Airport Cargo Hub', eta: '18 mins' },
      { id: 2, name: 'Dock 2 - Express Parcel', status: 'Available', carrier: 'DHL Express', vehicle: 'VAN-8892', capacityPct: 0, destination: 'Standby - West Coast Loop', eta: 'Standby' },
      { id: 3, name: 'Dock 3 - Cross-Dock Bay', status: 'Loading', carrier: 'BlueDart Logistics', vehicle: 'TRK-9921', capacityPct: 45, destination: 'Chicago O\'Hare Intermodal', eta: '35 mins' },
      { id: 4, name: 'Dock 4 - Autonomous Fleet', status: 'Maintenance', carrier: 'Internal AGV Swarm', vehicle: 'AGV-M1', capacityPct: 0, destination: 'Sensor Recalibration Bay', eta: 'Under Service' }
    ];

    const html = docks.map(dock => {
      let statusColor = 'slate';
      let statusBg = 'bg-slate-800 text-slate-400 border-slate-700';

      if (dock.status === 'Loading') {
        statusColor = 'cyan';
        statusBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 glow-cyan';
      } else if (dock.status === 'Available') {
        statusColor = 'emerald';
        statusBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      } else if (dock.status === 'Reserved') {
        statusColor = 'amber';
        statusBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      } else if (dock.status === 'Maintenance') {
        statusColor = 'rose';
        statusBg = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      }

      return `
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-${statusColor}-500/50 transition-all group">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono font-bold text-xs text-slate-300">BAY ${dock.id}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusBg}">
                ${dock.status.toUpperCase()}
              </span>
            </div>

            <h4 class="font-bold text-sm text-slate-100">${dock.name}</h4>
            <div class="text-xs text-slate-400 mt-1">Vehicle: <span class="font-mono text-cyan-400 font-bold">${dock.vehicle}</span></div>
            <div class="text-xs text-slate-400">Carrier: <span class="text-slate-200 font-medium">${dock.carrier}</span></div>
            <div class="text-xs text-slate-400 truncate">Route: <span class="text-slate-300">${dock.destination}</span></div>

            <div class="mt-3">
              <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Load Fill</span>
                <span class="text-slate-200 font-bold">${dock.capacityPct}%</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div class="h-full bg-gradient-to-r from-${statusColor}-500 to-cyan-400" style="width: ${dock.capacityPct}%"></div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span class="text-[11px] font-mono text-slate-400">Est. Dep: <strong class="text-slate-200">${dock.eta}</strong></span>
            <button onclick="window.dispatchModule.openDockAssignModal(${dock.id})" class="btn-assign-dock px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-500 transition-all cursor-pointer" data-dock-id="${dock.id}">
              Assign Bay
            </button>
          </div>
        </div>
      `;
    }).join('');

    containers.forEach(c => c.innerHTML = html);
  }

  renderCarrierMatrix() {
    const container = document.getElementById('carrierMatrixList');
    if (!container) return;

    const carriers = [
      {
        name: 'FedEx Priority',
        type: 'Express Air Network',
        rate: '$12.50 / kg',
        sla: '<14 Hours',
        reliability: '99.1%',
        recommended: this.selectedCarrier === 'FedEx Priority',
        badge: 'FASTEST AIR'
      },
      {
        name: 'DHL Express',
        type: 'Global Secured Cold-Chain',
        rate: '$14.20 / kg',
        sla: '<12 Hours',
        reliability: '99.4%',
        recommended: this.selectedCarrier === 'DHL Express',
        badge: 'CRYO SAFE'
      },
      {
        name: 'BlueDart Logistics',
        type: 'High-Volume Surface Intermodal',
        rate: '$8.40 / kg',
        sla: '24 Hours',
        reliability: '97.8%',
        recommended: this.selectedCarrier === 'BlueDart Logistics' || this.selectedCarrier === 'BlueDart Express',
        badge: 'BEST VALUE'
      }
    ];

    container.innerHTML = carriers.map(c => {
      const isSelected = c.name === this.selectedCarrier || (c.name.includes('BlueDart') && this.selectedCarrier.includes('BlueDart'));
      const activeBorder = isSelected ? 'border-cyan-400 bg-cyan-500/15 glow-cyan' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700';

      return `
        <div class="carrier-matrix-card glass-panel p-4 rounded-2xl border ${activeBorder} flex flex-col justify-between transition-all" data-carrier="${c.name}">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-sm text-slate-100">${c.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                ${c.badge}
              </span>
            </div>
            <div class="text-xs text-slate-400">${c.type}</div>

            <div class="grid grid-cols-3 gap-2 my-3 py-2.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
              <div>
                <div class="text-[10px] text-slate-500">FREIGHT RATE</div>
                <div class="text-xs font-bold text-emerald-400">${c.rate}</div>
              </div>
              <div>
                <div class="text-[10px] text-slate-500">DELIVERY SLA</div>
                <div class="text-xs font-bold text-cyan-400">${c.sla}</div>
              </div>
              <div>
                <div class="text-[10px] text-slate-500">RELIABILITY</div>
                <div class="text-xs font-bold text-violet-400">${c.reliability}</div>
              </div>
            </div>
          </div>

          <button onclick="window.dispatchModule.selectCarrier('${c.name}')" class="btn-select-carrier w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 glow-cyan' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}" data-carrier="${c.name}">
            ${isSelected ? '✓ Active Selected Carrier' : 'Select Carrier'}
          </button>
        </div>
      `;
    }).join('');
  }

  renderReadyOrdersList() {
    const container = document.getElementById('dispatchReadyOrdersList');
    if (!container) return;

    const orders = (window.WMSState && window.WMSState.data.orders) ? window.WMSState.data.orders : [];
    const readyOrders = orders.filter(o => o.stage === 'Dispatch Ready');

    if (readyOrders.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-950/40 border border-slate-800">
          No orders currently staged in Dispatch Ready status. Complete picking & QC to stage orders for shipping.
        </div>
      `;
      return;
    }

    container.innerHTML = readyOrders.map(order => `
      <div class="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3 hover:border-emerald-500/60 transition-all">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="font-mono font-bold text-xs text-emerald-400">${order.id}</span>
            <span class="text-xs text-slate-100 font-semibold">${order.customer}</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">${order.boxSize || 'Box M2'}</span>
          </div>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
            <span>📍 Dest: <strong class="text-slate-300">${order.dest}</strong></span>
            <span>•</span>
            <span>Carrier: <strong class="text-cyan-300 font-mono">${order.carrier || this.selectedCarrier}</strong></span>
            <span>•</span>
            <span class="text-emerald-400 font-mono font-semibold">$${(order.value || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.dispatchModule.openManifestModal('${order.id}')" class="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print Label
          </button>
          <button onclick="window.dispatchModule.openPodModal('${order.id}')" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Sign &amp; Dispatch
          </button>
        </div>
      </div>
    `).join('');
  }

  selectCarrier(carrierName) {
    this.selectedCarrier = carrierName;
    if (window.soundEngine) window.soundEngine.playClick();
    this.renderCarrierMatrix();

    if (typeof window.showToast === 'function') {
      window.showToast('Carrier Selected', `Active dispatch routing updated to ${carrierName}.`, 'cyan');
    }
  }

  runAiCarrierMatch() {
    if (window.soundEngine) window.soundEngine.playCompute();
    const currentOrder = (window.pickingModule && typeof window.pickingModule.getCurrentOrder === 'function')
      ? window.pickingModule.getCurrentOrder()
      : null;

    let best = 'FedEx Priority';
    let reason = 'High SLA Priority Score (96) requires 14h Expedited Air Network';

    if (currentOrder && currentOrder.items && currentOrder.items.some(i => i.zone === 'Zone C')) {
      best = 'DHL Express';
      reason = 'High-Value Cryogenic Processor SKU matches DHL Specialized Secure Cold-Chain SLA';
    } else if (currentOrder && currentOrder.priority < 65) {
      best = 'BlueDart Logistics';
      reason = 'Standard Ground order optimized for maximum margin & lowest carbon transit';
    }

    this.selectCarrier(best);
    if (typeof window.showToast === 'function') {
      window.showToast('AI Recommendation Applied', `${best}: ${reason}`, 'purple');
    }
  }

  openDockAssignModal(dockId) {
    if (window.soundEngine) window.soundEngine.playClick();
    const modal = document.getElementById('dockAssignModal');
    const dockIdInput = document.getElementById('dockAssignId');
    const dockTitle = document.getElementById('dockAssignTitle');

    if (dockIdInput) dockIdInput.value = dockId;
    if (dockTitle) dockTitle.textContent = `Assign Vehicle & Route to Dock Bay #${dockId}`;

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeDockAssignModal() {
    const modal = document.getElementById('dockAssignModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleDockAssignSubmit() {
    const dockId = parseInt(document.getElementById('dockAssignId').value, 10);
    const vehicle = document.getElementById('dockVehicleInput').value || 'TRK-AUTO';
    const carrier = document.getElementById('dockCarrierSelect').value;
    const dest = document.getElementById('dockDestInput').value || 'Regional Cargo Center';

    if (window.WMSState) {
      window.WMSState.assignDock(dockId, vehicle, carrier, dest);
    }
    if (window.soundEngine) window.soundEngine.playSuccess();
    if (typeof window.showToast === 'function') {
      window.showToast('Dock Bay Updated', `Bay #${dockId} assigned to ${carrier} (${vehicle}).`, 'emerald');
    }

    this.closeDockAssignModal();
    this.render();
  }

  openManifestModal(orderId) {
    if (window.soundEngine) window.soundEngine.playClick();
    const modal = document.getElementById('printableLabelModal') || document.getElementById('modalManifest');
    const order = (window.WMSState && window.WMSState.data.orders.find(o => o.id === orderId))
      || (window.pickingModule && window.pickingModule.getCurrentOrder())
      || { id: orderId || 'ORD-9824', customer: 'Consignee Enterprise', dest: 'Austin, TX 78725', carrier: this.selectedCarrier, boxSize: 'Box M2', value: 960.00, qc: { sealId: 'SEAL-OK' } };

    const trackingId = order.tracking || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const content = document.getElementById('manifestLabelContent');
    if (content) {
      content.innerHTML = `
        <div class="border-4 border-slate-900 p-6 bg-white text-slate-950 rounded-lg max-w-md mx-auto font-sans shadow-2xl">
          <!-- Header -->
          <div class="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
            <div>
              <div class="text-2xl font-extrabold tracking-tight">${order.carrier || this.selectedCarrier}</div>
              <div class="text-[10px] font-mono uppercase font-bold tracking-widest text-slate-600">Priority Autonomous Freight Express</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-mono font-bold">AIRBILL #</div>
              <div class="text-sm font-mono font-extrabold">${trackingId}</div>
            </div>
          </div>

          <!-- Addresses -->
          <div class="grid grid-cols-2 gap-4 border-b-2 border-slate-900 pb-3 mb-3 text-xs">
            <div>
              <div class="font-mono text-[9px] uppercase font-bold text-slate-500">SHIP FROM:</div>
              <div class="font-bold">LogiMind Central Hub #04</div>
              <div class="text-slate-700">Autonomous Gate 12</div>
              <div class="text-slate-700">Dallas, TX 75201</div>
            </div>
            <div>
              <div class="font-mono text-[9px] uppercase font-bold text-slate-500">SHIP TO (CONSIGNEE):</div>
              <div class="font-bold">${order.customer}</div>
              <div class="text-slate-700">${order.dest}</div>
            </div>
          </div>

          <!-- Package Details -->
          <div class="grid grid-cols-3 gap-2 border-b-2 border-slate-900 pb-3 mb-3 text-[11px] text-center font-mono">
            <div class="border-r border-slate-300">
              <div class="text-[9px] text-slate-500 uppercase">ORDER REF</div>
              <div class="font-bold">${order.id}</div>
            </div>
            <div class="border-r border-slate-300">
              <div class="text-[9px] text-slate-500 uppercase">PKG SIZE</div>
              <div class="font-bold">${(order.boxSize || 'Box M2').split(' ')[0]}</div>
            </div>
            <div>
              <div class="text-[9px] text-slate-500 uppercase">DECLARED VALUE</div>
              <div class="font-bold">$${(order.value || 0).toFixed(2)}</div>
            </div>
          </div>

          <!-- Simulated Barcode SVG -->
          <div class="my-4 text-center">
            <svg class="w-full h-16 mx-auto" viewBox="0 0 300 60" preserveAspectRatio="none">
              <rect width="300" height="60" fill="#ffffff"/>
              ${this.generateBarcodeSvgBars(trackingId)}
            </svg>
            <div class="text-xs font-mono font-bold tracking-widest mt-1">${trackingId}</div>
          </div>

          <!-- Footer with QR -->
          <div class="flex justify-between items-center border-t-2 border-slate-900 pt-3">
            <div class="text-[10px] text-slate-600">
              <div>QC Gate: <strong class="text-slate-900">${(order.qc && order.qc.sealId) ? order.qc.sealId : 'VERIFIED-PASS'}</strong></div>
              <div>Autonomous Dispatch Stamp: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="w-12 h-12 border border-slate-900 p-1 flex items-center justify-center font-mono text-[8px] text-center font-bold">
              [ QR POD ]
            </div>
          </div>
        </div>
      `;
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  generateBarcodeSvgBars(str) {
    let bars = '';
    let x = 10;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      const w1 = (code % 3) + 1;
      const w2 = ((code * 2) % 4) + 1;
      bars += `<rect x="${x}" y="5" width="${w1}" height="50" fill="#000000" />`;
      x += w1 + 2;
      bars += `<rect x="${x}" y="5" width="${w2}" height="50" fill="#000000" />`;
      x += w2 + 3;
    }
    return bars;
  }

  closeManifestModal() {
    const modal = document.getElementById('printableLabelModal') || document.getElementById('modalManifest');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  openPodModal(orderId) {
    this.activeDispatchOrderId = orderId;
    const input = document.getElementById('podDriverName');
    if (input) input.focus();
    if (typeof window.showToast === 'function') {
      window.showToast('POD Signature Active', `Please capture driver signature to dispatch ${orderId}.`, 'amber');
    }
  }

  // Digital POD Signature Canvas
  initSignaturePad() {
    this.sigCanvas = document.getElementById('signatureCanvas') || document.getElementById('podSignatureCanvas');
    if (!this.sigCanvas) return;

    this.sigCtx = this.sigCanvas.getContext('2d');
    const parent = this.sigCanvas.parentElement;
    if (parent) {
      this.sigCanvas.width = parent.clientWidth || 400;
      this.sigCanvas.height = 140;
    }

    this.sigCtx.strokeStyle = '#00F5A0';
    this.sigCtx.lineWidth = 2.5;
    this.sigCtx.lineCap = 'round';
    this.sigCtx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = this.sigCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.sigCtx.beginPath();
      this.sigCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.sigCtx.lineTo(pos.x, pos.y);
      this.sigCtx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    this.sigCanvas.addEventListener('mousedown', startDraw);
    this.sigCanvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    this.sigCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    this.sigCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
    this.sigCanvas.addEventListener('touchend', stopDraw);
  }

  clearSignature() {
    if (!this.sigCanvas || !this.sigCtx) return;
    this.sigCtx.clearRect(0, 0, this.sigCanvas.width, this.sigCanvas.height);
    const driverInput = document.getElementById('podDriverName');
    if (driverInput) driverInput.value = '';
    if (window.soundEngine) window.soundEngine.playClick();
  }

  handleSignAndDispatch() {
    const driverInput = document.getElementById('podDriverName');
    const driverName = driverInput ? (driverInput.value.trim() || 'Alex Mercer (FedEx Express)') : 'Alex Mercer (FedEx Express)';

    // Find ready orders or use active
    const orders = (window.WMSState && window.WMSState.data.orders) ? window.WMSState.data.orders : [];
    let order = orders.find(o => o.id === this.activeDispatchOrderId) || orders.find(o => o.stage === 'Dispatch Ready') || orders[0];

    if (order) {
      order.stage = 'Completed';
      order.dispatchedAt = new Date().toLocaleTimeString();
      order.driverName = driverName;
      if (window.WMSState) {
        window.WMSState.addAudit(`Order ${order.id} dispatched via ${order.carrier || this.selectedCarrier} - Signed by ${driverName}`);
        window.WMSState.recalculateStats();
      }
    }

    if (window.soundEngine) window.soundEngine.playSuccess();
    if (typeof window.showToast === 'function') {
      window.showToast(
        'Order Dispatched Successfully',
        `POD verified for ${order ? order.id : 'Order'}! Handed off to carrier driver: ${driverName}.`,
        'emerald'
      );
    }

    this.clearSignature();
    this.render();

    if (window.dashboardModule) window.dashboardModule.render();
  }
}

window.dispatchModule = new DispatchModule();
