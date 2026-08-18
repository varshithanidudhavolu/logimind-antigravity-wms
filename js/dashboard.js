/**
 * LogiMind Antigravity WMS - Executive Command Dashboard & Pipeline
 * @version 4.5.0
 * @author LogiMind Core Engineering
 * 
 * Orchestrates live orders queue, fulfillment lifecycle pipeline, KPI widgets,
 * and automated purchase requisition drafting with high-efficiency DOM caching.
 */

'use strict';

class DashboardModule {
  constructor() {
    this.activeFilter = 'ALL';
    this.searchQuery = '';
    this._searchDebounceTimer = null;

    // Cache frequent DOM container references
    this.dom = {
      kpiActiveOrders: null,
      kpiSlaRate: null,
      kpiSpaceUtil: null,
      kpiBottlenecks: null,
      kpiPickVelocity: null,
      sidebarOrderCount: null,
      bottleneckBanner: null,
      ordersTableBody: null,
      modalCreateOrder: null,
      formCreateOrder: null,
      topbarGlobalSearch: null
    };
  }

  /**
   * Initialize module listeners and initial render
   */
  init() {
    this._cacheDomElements();
    this.bindEvents();
    this.render();

    // Subscribe to state notifications
    if (window.WMSState) {
      window.WMSState.subscribe((event) => {
        if ([
          'ORDER_UPDATED',
          'ORDER_CREATED',
          'INVENTORY_UPDATED',
          'ORDER_SELECTED',
          'ORDER_DISPATCHED',
          'BOTTLENECK_RESOLVED',
          'FILTER_CHANGED',
          'SEARCH_CHANGED',
          'STATS_UPDATED'
        ].includes(event)) {
          this.render();
        }
      });
    }
  }

  /**
   * Cache DOM nodes to avoid repeated querySelector calls
   * @private
   */
  _cacheDomElements() {
    this.dom.kpiActiveOrders = document.getElementById('kpiActiveOrders');
    this.dom.kpiSlaRate = document.getElementById('kpiSlaRate');
    this.dom.kpiSpaceUtil = document.getElementById('kpiSpaceUtil');
    this.dom.kpiBottlenecks = document.getElementById('kpiBottlenecks');
    this.dom.kpiPickVelocity = document.getElementById('kpiPickVelocity');
    this.dom.sidebarOrderCount = document.getElementById('sidebarOrderCount');
    this.dom.bottleneckBanner = document.getElementById('bottleneckBanner');
    this.dom.ordersTableBody = document.getElementById('ordersTableBody');
    this.dom.modalCreateOrder = document.getElementById('modalCreateOrder');
    this.dom.formCreateOrder = document.getElementById('formCreateOrder');
    this.dom.topbarGlobalSearch = document.getElementById('topbarGlobalSearch');
  }

  /**
   * Bind event listeners for pipeline filters, search, and modals
   */
  bindEvents() {
    // Pipeline stage click handlers
    const pipelineSteps = document.querySelectorAll('.pipeline-step');
    pipelineSteps.forEach(step => {
      step.addEventListener('click', (e) => {
        const stage = e.currentTarget.dataset.stage;
        if (window.soundEngine) window.soundEngine.playClick();
        if (window.WMSState) window.WMSState.setFilter(stage);
        this.activeFilter = stage;
        this.updatePipelineActiveState(stage);
        this.renderOrdersTable();
      });
    });

    // Auto-Reroute Bottleneck button
    const rerouteBtn = document.getElementById('btnRerouteBottleneck');
    if (rerouteBtn) {
      rerouteBtn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playSuccess();
        if (window.WMSState) window.WMSState.resolveBottleneck('BN-104');
        if (typeof window.showToast === 'function') {
          window.showToast('Auto-Rerouting Deployed', 'AGV-03 & AGV-07 traffic rerouted via Bypass C-3. Bottleneck cleared.', 'emerald');
        }
      });
    }

    // Debounced Global Search Input
    if (this.dom.topbarGlobalSearch) {
      this.dom.topbarGlobalSearch.addEventListener('input', (e) => {
        clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderOrdersTable();
        }, 120);
      });
    }

    // Global Event Delegation for Create Order & Modals
    document.addEventListener('click', (e) => {
      // Open Create Order Modal
      if (e.target.closest('.btn-open-create-order-modal, #btnOpenCreateOrderModal, #btnOpenCreateOrderModalTable, [data-action="open-create-order"]')) {
        e.preventDefault();
        this.openCreateOrderModal();
      }

      // Close Modals
      if (e.target.closest('.btn-close-modal, .btn-cancel-modal, [data-action="close-modal"]')) {
        e.preventDefault();
        this.closeAllModals();
      }

      // Modal Backdrop Click
      if (e.target.classList && e.target.classList.contains('modal-backdrop-glass')) {
        this.closeAllModals();
      }
    });

    // Handle Create Order Form Submission
    if (this.dom.formCreateOrder) {
      this.dom.formCreateOrder.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateOrderSubmit();
      });
    }
  }

  /**
   * Open the Create Order dialog modal
   */
  openCreateOrderModal() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (!this.dom.modalCreateOrder) {
      this.dom.modalCreateOrder = document.getElementById('modalCreateOrder');
    }
    if (this.dom.modalCreateOrder) {
      this.dom.modalCreateOrder.classList.remove('hidden');
      this.dom.modalCreateOrder.classList.add('flex');
      this.dom.modalCreateOrder.style.display = 'flex';
      const custInput = document.getElementById('orderCustomer');
      if (custInput) setTimeout(() => custInput.focus(), 100);
    }
  }

  /**
   * Close all active modals
   */
  closeAllModals() {
    if (window.soundEngine) window.soundEngine.playClick();
    const modals = document.querySelectorAll('.modal-backdrop-glass, #modalCreateOrder, #modalDamage, #modalReplenish, #modalManifest, #modalAssignDock');
    modals.forEach(modal => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.style.display = 'none';
    });
  }

  /**
   * Handle form submission for creating a new fulfillment order
   */
  handleCreateOrderSubmit() {
    const customerEl = document.getElementById('orderCustomer');
    const tierEl = document.getElementById('orderTier');
    const skuEl = document.getElementById('orderSku');
    const qtyEl = document.getElementById('orderQty');
    const priorityEl = document.getElementById('orderPriority');
    const slaEl = document.getElementById('orderSla');
    const carrierEl = document.getElementById('orderCarrier');
    const destEl = document.getElementById('orderDest');

    const rawPayload = {
      customer: customerEl ? customerEl.value : 'Enterprise Account',
      tier: tierEl ? tierEl.value : 'VIP Priority (Score: 90)',
      skuId: skuEl ? skuEl.value : 'SKU-E101',
      qty: qtyEl ? parseInt(qtyEl.value, 10) : 2,
      priority: priorityEl ? parseInt(priorityEl.value, 10) : 85,
      slaHours: slaEl ? parseFloat(slaEl.value) : 3,
      carrier: carrierEl ? carrierEl.value : 'FedEx Priority',
      dest: destEl ? destEl.value : 'Regional Airport Cargo Gate 4'
    };

    let newOrder;
    if (window.WMSState) {
      newOrder = window.WMSState.createOrder(rawPayload);
    }

    this.closeAllModals();
    if (this.dom.formCreateOrder) this.dom.formCreateOrder.reset();

    if (window.soundEngine) window.soundEngine.playSuccess();
    if (typeof window.showToast === 'function') {
      window.showToast(
        'Order Placed Successfully',
        `Order ${newOrder ? newOrder.id : 'ORD-NEW'} staged in [Order Created] with ${rawPayload.qty}x ${rawPayload.skuId}.`,
        'emerald'
      );
    }

    this.render();
  }

  /**
   * Update visual highlighting on pipeline stage filter cards
   * @param {string} activeStage
   */
  updatePipelineActiveState(activeStage) {
    const pipelineSteps = document.querySelectorAll('.pipeline-step');
    pipelineSteps.forEach(step => {
      const stage = step.dataset.stage;
      if (stage === activeStage) {
        step.classList.add('border-cyan-500', 'bg-cyan-500/15', 'text-cyan-300', 'glow-cyan');
        step.classList.remove('border-slate-700/60', 'bg-slate-900/60', 'text-slate-400');
      } else {
        step.classList.remove('border-cyan-500', 'bg-cyan-500/15', 'text-cyan-300', 'glow-cyan');
        step.classList.add('border-slate-700/60', 'bg-slate-900/60', 'text-slate-400');
      }
    });
  }

  /**
   * Master render method for dashboard components
   */
  render() {
    this.renderKPIs();
    this.renderBottleneckBanner();
    this.renderOrdersTable();
  }

  /**
   * Render real-time KPI metrics and pipeline stage counter badges
   */
  renderKPIs() {
    if (!window.WMSState) return;
    const stats = window.WMSState.data.systemStats;
    const orders = window.WMSState.data.orders;

    let activeOrders = 0;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].stage !== 'Completed') activeOrders++;
    }

    if (this.dom.kpiActiveOrders) this.dom.kpiActiveOrders.textContent = activeOrders;
    if (this.dom.kpiSlaRate) this.dom.kpiSlaRate.textContent = `${stats.slaCompliancePct}%`;
    if (this.dom.kpiSpaceUtil) this.dom.kpiSpaceUtil.textContent = `${stats.spaceUtilizationPct}%`;

    if (this.dom.kpiBottlenecks) {
      this.dom.kpiBottlenecks.textContent = stats.bottlenecksCount;
      this.dom.kpiBottlenecks.className = stats.bottlenecksCount > 0
        ? 'text-3xl font-bold font-mono text-amber-400'
        : 'text-3xl font-bold font-mono text-emerald-400';
    }

    if (this.dom.kpiPickVelocity) this.dom.kpiPickVelocity.textContent = stats.todayPicksCount;

    if (this.dom.sidebarOrderCount) {
      this.dom.sidebarOrderCount.textContent = `${activeOrders} Active`;
    }

    // Dynamic pipeline stage counters
    const stages = ['ALL', 'Order Created', 'Priority Scoring', 'Stock Allocation', 'Route Picking', 'QC & Packing', 'Dispatch Ready', 'Completed'];
    for (let s = 0; s < stages.length; s++) {
      const stage = stages[s];
      const countEl = document.querySelector(`.pipeline-count[data-stage="${stage}"]`);
      if (countEl) {
        if (stage === 'ALL') {
          countEl.textContent = orders.length;
        } else {
          let stageCount = 0;
          for (let o = 0; o < orders.length; o++) {
            if (orders[o].stage === stage) stageCount++;
          }
          countEl.textContent = stageCount;
        }
      }
    }
  }

  /**
   * Render radar bottleneck warning banner
   */
  renderBottleneckBanner() {
    if (!this.dom.bottleneckBanner || !window.WMSState) return;
    const activeBns = window.WMSState.data.bottlenecks.filter(b => !b.resolved);

    if (activeBns.length === 0) {
      this.dom.bottleneckBanner.innerHTML = `
        <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3" role="status">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <div class="text-sm font-semibold text-emerald-300">All Aisles &amp; Workstations Operating at Nominal Velocity</div>
              <div class="text-xs text-slate-400">Zero active traffic contention locks or sensor scale drifts detected.</div>
            </div>
          </div>
          <span class="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">RADAR: CLEAR</span>
        </div>
      `;
    } else {
      const first = activeBns[0];
      this.dom.bottleneckBanner.innerHTML = `
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4 glow-amber" role="alert">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 font-bold">${first.id}</span>
                <h4 class="text-sm font-bold text-amber-300">${first.title}</h4>
                <span class="text-xs text-rose-400 font-mono font-semibold">Delay Impact: ${first.delay}</span>
              </div>
              <p class="text-xs text-slate-300 mt-1">${first.desc}</p>
            </div>
          </div>
          <button id="btnRerouteBottleneck" aria-label="Execute Autonomous AGV Reroute" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer">
            <span>⚡ Deploy Auto-Reroute</span>
          </button>
        </div>
      `;

      const rerouteBtn = document.getElementById('btnRerouteBottleneck');
      if (rerouteBtn) {
        rerouteBtn.addEventListener('click', () => {
          if (window.soundEngine) window.soundEngine.playSuccess();
          if (window.WMSState) window.WMSState.resolveBottleneck(first.id);
          if (typeof window.showToast === 'function') {
            window.showToast('Auto-Rerouting Deployed', `Bottleneck [${first.id}] resolved via bypass route C-3.`, 'emerald');
          }
        });
      }
    }
  }

  /**
   * Render the Live Orders Queue data table with stage filters and search matching
   */
  renderOrdersTable() {
    if (!this.dom.ordersTableBody) {
      this.dom.ordersTableBody = document.getElementById('ordersTableBody');
    }
    if (!this.dom.ordersTableBody || !window.WMSState) return;

    const orders = window.WMSState.data.orders;
    const filter = this.activeFilter;
    const search = this.searchQuery;

    // Filter orders
    const filtered = orders.filter(o => {
      const matchFilter = filter === 'ALL' || o.stage === filter;
      if (!matchFilter) return false;

      if (!search) return true;
      const term = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(term) ||
        o.customer.toLowerCase().includes(term) ||
        o.carrier.toLowerCase().includes(term) ||
        o.stage.toLowerCase().includes(term) ||
        o.items.some(i => i.sku.toLowerCase().includes(term) || i.name.toLowerCase().includes(term))
      );
    });

    if (filtered.length === 0) {
      this.dom.ordersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-8 text-center text-slate-500 text-xs font-mono">
            No active orders match current filter [${filter}] or search query "${search}".
          </td>
        </tr>
      `;
      return;
    }

    const escapeHTML = (str) => (typeof WMSSecurity !== 'undefined') ? WMSSecurity.escapeHTML(str) : str;

    this.dom.ordersTableBody.innerHTML = filtered.map(order => {
      let priorityClass = 'bg-slate-800 text-slate-300 border-slate-700';
      if (order.priority >= 90) {
        priorityClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      } else if (order.priority >= 75) {
        priorityClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      }

      let stageClass = 'bg-slate-800 text-slate-400 border-slate-700';
      if (order.stage === 'Order Created') stageClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      else if (order.stage === 'Stock Allocation') stageClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      else if (order.stage === 'Priority Scoring') stageClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      else if (order.stage === 'Route Picking') stageClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      else if (order.stage === 'QC & Packing') stageClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      else if (order.stage === 'Dispatch Ready') stageClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      else if (order.stage === 'Completed') stageClass = 'bg-slate-800 text-slate-500 border-slate-700';

      const itemsSummary = order.items.map(i => `${i.qty}x ${escapeHTML(i.sku)}`).join(', ');

      return `
        <tr class="table-row-glow border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
          <td class="px-4 py-3 font-mono font-bold text-xs text-cyan-400">${escapeHTML(order.id)}</td>
          <td class="px-4 py-3">
            <div class="font-bold text-xs text-slate-200">${escapeHTML(order.customer)}</div>
            <div class="text-[10px] text-slate-400 font-mono">${escapeHTML(order.carrier)}</div>
          </td>
          <td class="px-4 py-3">
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${priorityClass}">
              ${order.priority}
            </span>
          </td>
          <td class="px-4 py-3 text-xs text-slate-300 font-mono truncate max-w-[200px]" title="${itemsSummary}">
            ${itemsSummary}
          </td>
          <td class="px-4 py-3">
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${stageClass}">
              ${order.stage}
            </span>
          </td>
          <td class="px-4 py-3 font-mono text-xs ${order.slaUrgent ? 'text-rose-400 font-bold' : 'text-slate-300'}">
            ⏱ ${escapeHTML(order.slaTimer)}
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="window.pickingModule.selectOrderForPicking('${order.id}'); window.app.switchTab('picking');" class="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold transition-all cursor-pointer" title="Pick Order">
                Pick
              </button>
              <button onclick="window.dispatchModule.openManifestModal('${order.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer" title="Print Airbill Manifest">
                Airbill
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.dashboardModule = new DashboardModule();
