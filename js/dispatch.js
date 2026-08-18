/**
 * LogiMind Antigravity WMS - Fleet, Dock Door & Dispatch Center
 */
class DispatchModule {
  constructor() {
    this.sigCanvas = null;
    this.sigCtx = null;
    this.isDrawing = false;
    this.selectedCarrier = 'FedEx Priority';
  }

  init() {
    this.bindEvents();
    this.render();
    this.initSignaturePad();

    // Subscribe to state
    window.WMSState.subscribe((event, payload, state) => {
      if (['DOCK_UPDATED', 'ORDER_DISPATCHED', 'ORDER_UPDATED', 'VIEW_CHANGED'].includes(event)) {
        this.render();
      }
    });
  }

  bindEvents() {
    // Dock Door vehicle assignment triggers
    const dockAssignBtns = document.querySelectorAll('.btn-assign-dock');
    dockAssignBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dockId = parseInt(e.currentTarget.dataset.dockId, 10);
        this.openDockAssignModal(dockId);
      });
    });

    // Form submission for dock assignment
    const dockForm = document.getElementById('dockAssignForm');
    if (dockForm) {
      dockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDockAssignSubmit();
      });
    }

    const closeDockModalBtn = document.getElementById('btnCloseDockModal');
    if (closeDockModalBtn) {
      closeDockModalBtn.addEventListener('click', () => {
        this.closeDockAssignModal();
      });
    }

    // Carrier selector matrix radio/buttons
    const carrierBtns = document.querySelectorAll('.btn-select-carrier');
    carrierBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const carrier = e.currentTarget.dataset.carrier;
        this.selectCarrier(carrier);
      });
    });

    // AI Auto-Match Carrier button
    const btnAiCarrierMatch = document.getElementById('btnAiCarrierMatch');
    if (btnAiCarrierMatch) {
      btnAiCarrierMatch.addEventListener('click', () => {
        this.runAiCarrierMatch();
      });
    }

    // Close manifest modal
    const closeManifestBtn = document.getElementById('btnCloseManifestModal');
    if (closeManifestBtn) {
      closeManifestBtn.addEventListener('click', () => {
        this.closeManifestModal();
      });
    }

    // Print label button
    const printLabelBtn = document.getElementById('btnPrintShippingLabel');
    if (printLabelBtn) {
      printLabelBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Digital POD Signature buttons
    const btnOpenPod = document.getElementById('btnOpenPodModal');
    if (btnOpenPod) {
      btnOpenPod.addEventListener('click', () => {
        this.openPodModal();
      });
    }

    const btnClosePod = document.getElementById('btnClosePodModal');
    if (btnClosePod) {
      btnClosePod.addEventListener('click', () => {
        this.closePodModal();
      });
    }

    const btnClearSig = document.getElementById('btnClearSignature');
    if (btnClearSig) {
      btnClearSig.addEventListener('click', () => {
        this.clearSignature();
      });
    }

    const btnSubmitPod = document.getElementById('btnSubmitPod');
    if (btnSubmitPod) {
      btnSubmitPod.addEventListener('click', () => {
        this.submitPod();
      });
    }
  }

  render() {
    this.renderDockCards();
    this.renderReadyOrdersList();
  }

  renderDockCards() {
    const container = document.getElementById('dockDoorsGrid');
    if (!container) return;

    const docks = window.WMSState.data.docks;

    container.innerHTML = docks.map(dock => {
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
        <div class="glass-panel p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between hover:border-${statusColor}-500/40 transition-all">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="font-mono font-bold text-sm text-slate-200">BAY ${dock.id}</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded-full border ${statusBg}">
                ${dock.status.toUpperCase()}
              </span>
            </div>

            <h4 class="font-bold text-sm text-slate-100">${dock.name}</h4>
            <div class="text-xs text-slate-400 mt-1">Vehicle: <span class="font-mono text-cyan-400 font-bold">${dock.vehicle}</span></div>
            <div class="text-xs text-slate-400">Carrier: <span class="text-slate-200">${dock.carrier}</span></div>
            <div class="text-xs text-slate-400">Route: <span class="text-slate-300">${dock.destination}</span></div>

            <div class="mt-3">
              <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Load Fill</span>
                <span>${dock.capacityPct}%</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-${statusColor}-500 to-cyan-400" style="width: ${dock.capacityPct}%"></div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span class="text-[11px] font-mono text-slate-400">Est. Departure: <strong class="text-slate-200">${dock.eta}</strong></span>
            <button onclick="window.dispatchModule.openDockAssignModal(${dock.id})" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer">
              Assign Bay
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderReadyOrdersList() {
    const container = document.getElementById('dispatchReadyOrdersList');
    if (!container) return;

    const readyOrders = window.WMSState.data.orders.filter(o => o.stage === 'Dispatch Ready');

    if (readyOrders.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-500 text-xs">
          No orders currently staged in Dispatch Ready status. Complete picking & QC to stage orders for shipping.
        </div>
      `;
      return;
    }

    container.innerHTML = readyOrders.map(order => `
      <div class="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-xs text-emerald-400">${order.id}</span>
            <span class="text-xs text-slate-200 font-semibold">${order.customer}</span>
            <span class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">${order.boxSize}</span>
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">
            Dest: ${order.dest} &bull; Value: $${order.value.toFixed(2)} &bull; Carrier: <span class="text-cyan-300 font-mono">${order.carrier}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.dispatchModule.openManifestModal('${order.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Print Label
          </button>
          <button onclick="window.dispatchModule.openPodModal('${order.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Sign & Dispatch
          </button>
        </div>
      </div>
    `).join('');
  }

  selectCarrier(carrierName) {
    this.selectedCarrier = carrierName;
    window.soundEngine.playClick();

    const carrierCards = document.querySelectorAll('.carrier-matrix-card');
    carrierCards.forEach(card => {
      if (card.dataset.carrier === carrierName) {
        card.classList.add('border-cyan-500', 'bg-cyan-500/15', 'glow-cyan');
        card.classList.remove('border-slate-700/60', 'bg-slate-900/60');
      } else {
        card.classList.remove('border-cyan-500', 'bg-cyan-500/15', 'glow-cyan');
        card.classList.add('border-slate-700/60', 'bg-slate-900/60');
      }
    });

    window.showToast('Carrier Selected', `Active dispatch routing updated to ${carrierName}.`, 'cyan');
  }

  runAiCarrierMatch() {
    window.soundEngine.playCompute();
    // Intelligent Match: If high priority -> FedEx Priority; If Cryo/High Value -> DHL; If bulk -> BlueDart
    const currentOrder = window.pickingModule.getCurrentOrder();
    let best = 'FedEx Priority';
    let reason = 'High SLA Priority Score (96) requires 14h Expedited Air Network';

    if (currentOrder && currentOrder.items.some(i => i.zone === 'Zone C')) {
      best = 'DHL Express';
      reason = 'High-Value Cryogenic Processor SKU matches DHL Specialized Secure Cold-Chain SLA';
    } else if (currentOrder && currentOrder.priority < 65) {
      best = 'BlueDart Express';
      reason = 'Standard Priority order optimized for maximum margin & lowest carbon transit';
    }

    this.selectCarrier(best);
    window.showToast('AI Recommendation Applied', `${best}: ${reason}`, 'purple');
  }

  openDockAssignModal(dockId) {
    window.soundEngine.playClick();
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

    window.WMSState.assignDock(dockId, vehicle, carrier, dest);
    window.soundEngine.playSuccess();
    window.showToast('Dock Bay Updated', `Bay #${dockId} assigned to ${carrier} (${vehicle}).`, 'emerald');

    this.closeDockAssignModal();
    this.render();
  }

  openManifestModal(orderId) {
    window.soundEngine.playClick();
    const modal = document.getElementById('printableLabelModal');
    const order = window.WMSState.data.orders.find(o => o.id === orderId) || window.pickingModule.getCurrentOrder();
    if (!modal || !order) return;

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
              <div class="font-bold">${order.boxSize.split(' ')[0]}</div>
            </div>
            <div>
              <div class="text-[9px] text-slate-500 uppercase">DECLARED VALUE</div>
              <div class="font-bold">$${order.value.toFixed(2)}</div>
            </div>
          </div>

          <!-- Simulated Barcode SVG -->
          <div class="my-4 text-center">
            <svg class="w-full h-16 mx-auto" viewBox="0 0 300 60" preserveAspectRatio="none">
              <!-- Background -->
              <rect width="300" height="60" fill="#ffffff"/>
              <!-- Simulated Code128 Bars -->
              ${this.generateBarcodeSvgBars(trackingId)}
            </svg>
            <div class="text-xs font-mono font-bold tracking-widest mt-1">${trackingId}</div>
          </div>

          <!-- Footer with QR -->
          <div class="flex justify-between items-center border-t-2 border-slate-900 pt-3">
            <div class="text-[10px] text-slate-600">
              <div>QC Gate: <strong class="text-slate-900">${order.qc.sealId || 'VERIFIED-PASS'}</strong></div>
              <div>Autonomous Dispatch Stamp: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="w-12 h-12 border border-slate-900 p-1 flex items-center justify-center font-mono text-[8px] text-center font-bold">
              [ QR POD ]
            </div>
          </div>
        </div>
      `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
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
    const modal = document.getElementById('printableLabelModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // Digital POD Signature Canvas
  initSignaturePad() {
    this.sigCanvas = document.getElementById('podSignatureCanvas');
    if (!this.sigCanvas) return;

    this.sigCtx = this.sigCanvas.getContext('2d');
    this.sigCanvas.width = 400;
    this.sigCanvas.height = 140;

    this.sigCtx.strokeStyle = '#06b6d4';
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
      e.preventDefault();
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.sigCtx.lineTo(pos.x, pos.y);
      this.sigCtx.stroke();
      e.preventDefault();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    this.sigCanvas.addEventListener('mousedown', startDraw);
    this.sigCanvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    this.sigCanvas.addEventListener('touchstart', startDraw);
    this.sigCanvas.addEventListener('touchmove', draw);
    window.addEventListener('touchend', stopDraw);
  }

  clearSignature() {
    if (!this.sigCanvas || !this.sigCtx) return;
    this.sigCtx.clearRect(0, 0, this.sigCanvas.width, this.sigCanvas.height);
  }

  openPodModal(orderId = null) {
    window.soundEngine.playClick();
    const modal = document.getElementById('podSignatureModal');
    const order = orderId ? window.WMSState.data.orders.find(o => o.id === orderId) : window.pickingModule.getCurrentOrder();
    
    if (order) {
      document.getElementById('podModalOrderId').textContent = order.id;
      document.getElementById('podModalCustomer').textContent = order.customer;
      document.getElementById('podModalDest').textContent = order.dest;
      this.currentPodOrderId = order.id;
    }

    this.clearSignature();

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closePodModal() {
    const modal = document.getElementById('podSignatureModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  submitPod() {
    const orderId = this.currentPodOrderId || 'ORD-9824';
    const sigData = this.sigCanvas ? this.sigCanvas.toDataURL() : '';
    const tracking = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    window.soundEngine.playSuccess();
    window.WMSState.dispatchOrder(orderId, this.selectedCarrier, tracking, sigData);
    window.showToast('Order Dispatched & Signed', `${orderId} marked COMPLETED. Digital POD signature archived.`, 'emerald');

    this.closePodModal();
    this.render();
  }
}

window.dispatchModule = new DispatchModule();
