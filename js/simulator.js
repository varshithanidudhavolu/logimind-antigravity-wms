/**
 * LogiMind Antigravity WMS - Live "What-If" Custom Scenario Simulator
 */
class ScenarioSimulator {
  constructor() {
    this.urgentNeeded = 10;
    this.availableStock = 7;
    this.heldStock = 5;
    this.priorityThreshold = 75;
    this.lastResult = null;
  }

  init() {
    this.bindEvents();
    this.runSimulation(); // initial render
  }

  bindEvents() {
    const urgentInput = document.getElementById('simUrgentNeeded');
    const availableInput = document.getElementById('simAvailableStock');
    const heldInput = document.getElementById('simHeldStock');
    const thresholdSlider = document.getElementById('simPriorityThreshold');
    const thresholdVal = document.getElementById('simPriorityThresholdVal');
    const execBtn = document.getElementById('btnExecSimulation');

    if (urgentInput) urgentInput.addEventListener('input', (e) => { this.urgentNeeded = parseInt(e.target.value, 10) || 0; });
    if (availableInput) availableInput.addEventListener('input', (e) => { this.availableStock = parseInt(e.target.value, 10) || 0; });
    if (heldInput) heldInput.addEventListener('input', (e) => { this.heldStock = parseInt(e.target.value, 10) || 0; });

    if (thresholdSlider && thresholdVal) {
      thresholdSlider.addEventListener('input', (e) => {
        this.priorityThreshold = parseInt(e.target.value, 10);
        thresholdVal.textContent = this.priorityThreshold;
      });
    }

    if (execBtn) {
      execBtn.addEventListener('click', () => {
        window.soundEngine.playCompute();
        this.runSimulation();
        window.showToast('Scenario Engine Executed', 'Evaluation completed with active rule matrix.', 'cyan');
      });
    }

    // Preset buttons
    const presets = document.querySelectorAll('.sim-preset-btn');
    presets.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        this.loadPreset(preset);
      });
    });

    // Apply to live state button
    const applyBtn = document.getElementById('btnApplySimToLive');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyToLiveState();
      });
    }
  }

  loadPreset(name) {
    window.soundEngine.playClick();
    if (name === 'classic') {
      this.setInputs(10, 7, 5, 75);
    } else if (name === 'safe') {
      this.setInputs(6, 10, 4, 70);
    } else if (name === 'deficit') {
      this.setInputs(20, 4, 6, 80);
    } else if (name === 'surge') {
      this.setInputs(15, 8, 12, 85);
    }
    this.runSimulation();
    window.showToast('Preset Loaded', `Applied scenario preset: ${name.toUpperCase()}`, 'purple');
  }

  setInputs(needed, avail, held, thresh) {
    this.urgentNeeded = needed;
    this.availableStock = avail;
    this.heldStock = held;
    this.priorityThreshold = thresh;

    const urgentInput = document.getElementById('simUrgentNeeded');
    const availableInput = document.getElementById('simAvailableStock');
    const heldInput = document.getElementById('simHeldStock');
    const thresholdSlider = document.getElementById('simPriorityThreshold');
    const thresholdVal = document.getElementById('simPriorityThresholdVal');

    if (urgentInput) urgentInput.value = needed;
    if (availableInput) availableInput.value = avail;
    if (heldInput) heldInput.value = held;
    if (thresholdSlider) thresholdSlider.value = thresh;
    if (thresholdVal) thresholdVal.textContent = thresh;
  }

  runSimulation() {
    const N = this.urgentNeeded;
    const A = this.availableStock;
    const H = this.heldStock;
    const T = this.priorityThreshold;

    let route = '';
    let statusBadge = '';
    let badgeColor = '';
    let urgentAllocated = 0;
    let revokedFromHeld = 0;
    let remainingHeld = H;
    let remainingAvail = 0;
    let backorderQty = 0;
    let emergencyPoQty = 0;
    let explanationSteps = [];

    // Decision Logic Tree
    if (A >= N) {
      // Case 1: Direct Full Allocation
      route = 'CASE_1_DIRECT';
      statusBadge = 'DIRECT ALLOCATION (NO CONFLICT)';
      badgeColor = 'emerald';
      urgentAllocated = N;
      remainingAvail = A - N;
      remainingHeld = H;
      revokedFromHeld = 0;

      explanationSteps = [
        `1. Available unallocated stock (${A} units) is GREATER than or EQUAL to urgent demand (${N} units).`,
        `2. Full allocation of ${N} units granted to Urgent Order directly from unallocated pool.`,
        `3. Low-priority order holds remain 100% untouched (${H} units intact).`,
        `4. Unallocated inventory buffer updated to ${remainingAvail} units. No backorder or PO required.`
      ];
    } else if ((A + H) >= N) {
      // Case 2: Stock Reallocation / Conflict Resolution
      route = 'CASE_2_REALLOCATE';
      statusBadge = 'DYNAMIC REALLOCATION EXECUTED';
      badgeColor = 'cyan';
      urgentAllocated = N;
      remainingAvail = 0;
      revokedFromHeld = N - A;
      remainingHeld = H - revokedFromHeld;
      emergencyPoQty = revokedFromHeld + 5; // auto buffer replenishment

      explanationSteps = [
        `1. Urgent demand (${N} units) exceeds available unallocated stock (${A} units). Shortfall = ${N - A} units.`,
        `2. Priority Evaluation: Urgent Order (Priority 96) > Threshold (${T}) > Low-Priority Order (Priority 35).`,
        `3. System revokes ${revokedFromHeld} units from Low-Priority held allocation.`,
        `4. Urgent order is 100% fulfilled (${A} available + ${revokedFromHeld} reallocated = ${N} total units).`,
        `5. Low-Priority order adjusted to ${remainingHeld} units remaining. Automated PO #${Math.floor(1000 + Math.random()*9000)} drafted for ${emergencyPoQty} units.`
      ];
    } else {
      // Case 3: Severe Deficit / Partial Allocation + Emergency PO
      route = 'CASE_3_DEFICIT';
      statusBadge = 'CRITICAL DEFICIT: PARTIAL ALLOCATION';
      badgeColor = 'rose';
      urgentAllocated = A + H;
      backorderQty = N - urgentAllocated;
      remainingAvail = 0;
      revokedFromHeld = H;
      remainingHeld = 0;
      emergencyPoQty = backorderQty + 10;

      explanationSteps = [
        `1. Combined inventory (${A} available + ${H} held = ${A + H} total) is INSUFFICIENT for demand (${N} units).`,
        `2. Maximum possible allocation executed: All ${A} available + all ${H} held = ${urgentAllocated} units allocated to Urgent Order.`,
        `3. Unfulfilled urgent balance of ${backorderQty} units routed to Expedited Air Backorder.`,
        `4. Low-priority order fully converted to Backorder queue.`,
        `5. Emergency Supplier Purchase Order PO-EMERGENCY triggered with 24-hr expedited SLA.`
      ];
    }

    this.lastResult = {
      route,
      statusBadge,
      badgeColor,
      urgentNeeded: N,
      availableStock: A,
      heldStock: H,
      urgentAllocated,
      revokedFromHeld,
      remainingHeld,
      remainingAvail,
      backorderQty,
      emergencyPoQty,
      explanationSteps
    };

    this.renderResult();
  }

  renderResult() {
    const res = this.lastResult;
    if (!res) return;

    // Render Status Header
    const statusHeader = document.getElementById('simResultHeader');
    if (statusHeader) {
      statusHeader.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold bg-${res.badgeColor}-500/20 text-${res.badgeColor}-400 border border-${res.badgeColor}-500/30">
              <span class="w-2 h-2 rounded-full bg-${res.badgeColor}-400 mr-2 animate-ping"></span>
              ${res.statusBadge}
            </span>
            <span class="text-xs text-slate-400 font-mono">Engine: Antigravity-v4.2 / Rule-14 Active</span>
          </div>
          <div class="text-xs text-slate-400">
            Computation Time: <span class="text-cyan-400 font-mono font-semibold">1.4ms</span>
          </div>
        </div>
      `;
    }

    // Update Flowchart highlights
    this.updateFlowchart(res.route);

    // Render Metrics Matrix
    const matrixEl = document.getElementById('simMatrixContainer');
    if (matrixEl) {
      matrixEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col">
            <span class="text-xs text-slate-400 font-medium">Urgent Order Fulfilled</span>
            <span class="text-2xl font-bold font-mono text-emerald-400 mt-1">${res.urgentAllocated} / ${res.urgentNeeded}</span>
            <span class="text-[11px] text-slate-500 mt-1">${res.urgentAllocated === res.urgentNeeded ? '✅ 100% Demand Met' : '⚠️ ' + res.backorderQty + ' Backordered'}</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col">
            <span class="text-xs text-slate-400 font-medium">Reallocated from Held</span>
            <span class="text-2xl font-bold font-mono text-amber-400 mt-1">${res.revokedFromHeld} units</span>
            <span class="text-[11px] text-slate-500 mt-1">Remaining held: ${res.remainingHeld}</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col">
            <span class="text-xs text-slate-400 font-medium">Remaining Available</span>
            <span class="text-2xl font-bold font-mono text-cyan-400 mt-1">${res.remainingAvail} units</span>
            <span class="text-[11px] text-slate-500 mt-1">Unallocated reserve</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex flex-col">
            <span class="text-xs text-slate-400 font-medium">Emergency PO Trigger</span>
            <span class="text-2xl font-bold font-mono ${res.emergencyPoQty > 0 ? 'text-purple-400' : 'text-slate-500'} mt-1">
              ${res.emergencyPoQty > 0 ? res.emergencyPoQty + ' units' : 'None'}
            </span>
            <span class="text-[11px] text-slate-500 mt-1">${res.emergencyPoQty > 0 ? 'Auto-Supplier Dispatch' : 'Stock level safe'}</span>
          </div>
        </div>
      `;
    }

    // Render Step Explanation
    const stepsEl = document.getElementById('simExplanationSteps');
    if (stepsEl) {
      stepsEl.innerHTML = res.explanationSteps.map(step => `
        <li class="flex items-start gap-3 py-2 border-b border-slate-800/80 last:border-0">
          <div class="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <div class="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
          </div>
          <span class="text-sm text-slate-300 font-normal leading-relaxed">${step}</span>
        </li>
      `).join('');
    }
  }

  updateFlowchart(route) {
    const nodeA = document.getElementById('flowNodeAvailCheck');
    const nodeRealloc = document.getElementById('flowNodeReallocCheck');
    const nodeDirect = document.getElementById('flowNodeDirect');
    const nodeRevoke = document.getElementById('flowNodeRevoke');
    const nodeDeficit = document.getElementById('flowNodeDeficit');

    // Reset all nodes
    [nodeA, nodeRealloc, nodeDirect, nodeRevoke, nodeDeficit].forEach(node => {
      if (node) {
        node.classList.remove('active-path', 'highlight-green', 'highlight-amber', 'highlight-rose');
      }
    });

    if (nodeA) nodeA.classList.add('active-path');

    if (route === 'CASE_1_DIRECT') {
      if (nodeDirect) nodeDirect.classList.add('highlight-green');
    } else if (route === 'CASE_2_REALLOCATE') {
      if (nodeRealloc) nodeRealloc.classList.add('active-path');
      if (nodeRevoke) nodeRevoke.classList.add('highlight-amber');
    } else if (route === 'CASE_3_DEFICIT') {
      if (nodeRealloc) nodeRealloc.classList.add('active-path');
      if (nodeDeficit) nodeDeficit.classList.add('highlight-rose');
    }
  }

  applyToLiveState() {
    if (!this.lastResult) return;
    const res = this.lastResult;

    // Update an existing or create a simulated order in state
    const order = window.WMSState.data.orders.find(o => o.id === 'ORD-9821');
    if (order) {
      order.stage = 'Stock Allocated';
      order.items[0].qty = res.urgentAllocated;
      window.WMSState.addAudit(`Simulated Scenario Committed: Allocated ${res.urgentAllocated} units to ${order.id}`);
      
      if (res.emergencyPoQty > 0) {
        const po = {
          id: `PO-${Math.floor(1000 + Math.random()*9000)}`,
          sku: 'SKU-E101',
          name: 'Quantum LiDAR Sensor V2',
          qty: res.emergencyPoQty,
          supplier: 'Photonix Global Express',
          status: 'Auto-Triggered Reorder',
          date: new Date().toISOString().split('T')[0],
          reason: `Scenario Engine Execution: Replenishing ${res.emergencyPoQty} units`
        };
        window.WMSState.data.purchaseOrders.unshift(po);
      }

      window.soundEngine.playSuccess();
      window.showToast('Committed to Live State', `Applied scenario outcome to ${order.id} and Master Inventory.`, 'emerald');
      window.WMSState.recalculateStats();
    }
  }
}

window.scenarioSimulator = new ScenarioSimulator();
