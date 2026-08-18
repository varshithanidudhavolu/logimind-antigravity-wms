/**
 * LogiMind Antigravity WMS - Executive Command Dashboard & Pipeline
 */
class DashboardModule {
  constructor() {
    this.activeFilter = 'ALL';
  }

  init() {
    this.bindEvents();
    this.render();

    // Subscribe to state changes
    window.WMSState.subscribe((event, payload, state) => {
      if (['ORDER_UPDATED', 'ORDER_SELECTED', 'ORDER_DISPATCHED', 'BOTTLENECK_RESOLVED', 'FILTER_CHANGED', 'SEARCH_CHANGED', 'STATS_UPDATED'].includes(event)) {
        this.render();
      }
    });
  }

  bindEvents() {
    // Pipeline stage click handlers
    const pipelineSteps = document.querySelectorAll('.pipeline-step');
    pipelineSteps.forEach(step => {
      step.addEventListener('click', (e) => {
        const stage = e.currentTarget.dataset.stage;
        window.soundEngine.playClick();
        window.WMSState.setFilter(stage);
        this.activeFilter = stage;
        this.updatePipelineActiveState(stage);
        this.renderOrdersTable();
      });
    });

    // Auto-Reroute Bottleneck button
    const rerouteBtn = document.getElementById('btnRerouteBottleneck');
    if (rerouteBtn) {
      rerouteBtn.addEventListener('click', () => {
        window.soundEngine.playSuccess();
        window.WMSState.resolveBottleneck('BN-01');
        window.showToast('Auto-Rerouting Deployed', 'AGV-03 & AGV-07 traffic rerouted via Bypass C-3. Bottleneck cleared.', 'emerald');
      });
    }

    // Create New Order Modal triggers
    const openOrderBtns = document.querySelectorAll('.btn-open-create-order-modal, #btnOpenCreateOrderModal, #btnOpenCreateOrderModalTable');
    openOrderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openCreateOrderModal();
      });
    });

    const closeOrderBtn = document.getElementById('btnCloseCreateOrderModal');
    if (closeOrderBtn) {
      closeOrderBtn.addEventListener('click', () => {
        this.closeCreateOrderModal();
      });
    }

    const cancelOrderBtn = document.getElementById('btnCancelCreateOrderModal');
    if (cancelOrderBtn) {
      cancelOrderBtn.addEventListener('click', () => {
        this.closeCreateOrderModal();
      });
    }

    const createOrderForm = document.getElementById('createOrderForm');
    if (createOrderForm) {
      createOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateOrderSubmit();
      });
    }

    // Priority slider live update
    const prioritySlider = document.getElementById('newOrderPriority');
    const priorityVal = document.getElementById('newOrderPriorityVal');
    if (prioritySlider && priorityVal) {
      prioritySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const slaHours = val >= 90 ? '0.5h (Flash SLA)' : val >= 80 ? '2h (Expedited)' : val >= 60 ? '4h (Standard)' : '8h (Economy)';
        priorityVal.textContent = `${val} &bull; ${slaHours}`;
      });
    }
  }

  openCreateOrderModal() {
    window.soundEngine.playClick();
    const modal = document.getElementById('createOrderModal');
    const skuSelect = document.getElementById('newOrderSku');
    if (!modal || !skuSelect) return;

    // Populate SKUs dynamically from live inventory
    const skus = window.WMSState.data.skus;
    skuSelect.innerHTML = skus.map(sku => {
      const avail = sku.onHand - sku.allocated;
      return `
        <option value="${sku.id}">
          ${sku.id} - ${sku.name} (${sku.zone} / ${sku.aisle}) &bull; Avail: ${avail} / On-Hand: ${sku.onHand} &bull; $${sku.unitCost.toFixed(2)}
        </option>
      `;
    }).join('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeCreateOrderModal() {
    const modal = document.getElementById('createOrderModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleCreateOrderSubmit() {
    const customer = document.getElementById('newOrderCustomer').value.trim() || 'Tesla Energy Hub';
    const tier = document.getElementById('newOrderTier').value;
    const skuId = document.getElementById('newOrderSku').value;
    const qty = parseInt(document.getElementById('newOrderQty').value, 10) || 5;
    const priority = parseInt(document.getElementById('newOrderPriority').value, 10) || 85;
    const carrier = document.getElementById('newOrderCarrier') ? document.getElementById('newOrderCarrier').value : null;
    const dest = document.getElementById('newOrderDest') ? document.getElementById('newOrderDest').value.trim() : 'Austin, TX - Gigafactory 1';

    const slaHours = priority >= 90 ? 1 : priority >= 80 ? 2 : priority >= 60 ? 4 : 8;

    const newOrder = window.WMSState.createOrder({
      customer,
      tier,
      skuId,
      qty,
      priority,
      slaHours,
      carrier,
      dest
    });

    this.closeCreateOrderModal();

    // Sound and Green Toast
    window.soundEngine.playSuccess();
    window.showToast(
      'Order Successfully Placed',
      `Order ${newOrder.id} successfully placed! Staged in [Order Created] & allocated ${qty}x ${skuId}.`,
      'emerald'
    );

    // Refresh views and ensure user sees the order
    this.render();
  }

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

  render() {
    this.renderKPIs();
    this.renderBottleneckBanner();
    this.renderOrdersTable();
  }

  renderKPIs() {
    const stats = window.WMSState.data.systemStats;
    const orders = window.WMSState.data.orders;
    const activeOrders = orders.filter(o => o.stage !== 'Completed').length;
    const dispatchReady = orders.filter(o => o.stage === 'Dispatch Ready').length;

    const elActive = document.getElementById('kpiActiveOrders');
    const elSla = document.getElementById('kpiSlaRate');
    const elSpace = document.getElementById('kpiSpaceUtil');
    const elBottlenecks = document.getElementById('kpiBottlenecks');
    const elVelocity = document.getElementById('kpiPickVelocity');

    if (elActive) elActive.textContent = activeOrders;
    if (elSla) elSla.textContent = `${stats.slaCompliancePct}%`;
    if (elSpace) elSpace.textContent = `${stats.spaceUtilizationPct}%`;
    if (elBottlenecks) {
      elBottlenecks.textContent = stats.bottlenecksCount;
      elBottlenecks.className = stats.bottlenecksCount > 0 
        ? "text-3xl font-bold font-mono text-amber-400" 
        : "text-3xl font-bold font-mono text-emerald-400";
    }
    if (elVelocity) elVelocity.textContent = stats.todayPicksCount;

    // Update pipeline counts
    const stages = ['ALL', 'Order Created', 'Priority Scoring', 'Stock Allocation', 'Route Picking', 'QC & Packing', 'Dispatch Ready', 'Completed'];
    stages.forEach(stage => {
      const countEl = document.querySelector(`.pipeline-count[data-stage="${stage}"]`);
      if (countEl) {
        if (stage === 'ALL') {
          countEl.textContent = orders.length;
        } else {
          countEl.textContent = orders.filter(o => o.stage === stage).length;
        }
      }
    });
  }

  renderBottleneckBanner() {
    const banner = document.getElementById('bottleneckBanner');
    const activeBns = window.WMSState.data.bottlenecks.filter(b => !b.resolved);

    if (!banner) return;

    if (activeBns.length === 0) {
      banner.innerHTML = `
        <div class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <div class="text-sm font-semibold text-emerald-300">All Aisles & Workstations Operating at Optimal Velocity</div>
              <div class="text-xs text-slate-400">Zero active traffic contentions or sensor scale drifts detected.</div>
            </div>
          </div>
          <span class="text-xs font-mono text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">RADAR: CLEAR</span>
        </div>
      `;
    } else {
      const first = activeBns[0];
      banner.innerHTML = `
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4 glow-amber">
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
          <div class="flex items-center gap-2">
            <button id="btnRerouteBottleneck" class="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              Auto-Reroute AGVs
            </button>
          </div>
        </div>
      `;

      const newRerouteBtn = document.getElementById('btnRerouteBottleneck');
      if (newRerouteBtn) {
        newRerouteBtn.addEventListener('click', () => {
          window.soundEngine.playSuccess();
          window.WMSState.resolveBottleneck(first.id);
          window.showToast('Auto-Rerouting Deployed', `${first.title} resolved via autonomous routing matrix.`, 'emerald');
        });
      }
    }
  }

  renderOrdersTable() {
    const tableBody = document.getElementById('dashboardOrdersTableBody');
    if (!tableBody) return;

    let orders = [...window.WMSState.data.orders];
    const filter = window.WMSState.activeFilter;
    const query = window.WMSState.searchQuery;

    if (filter !== 'ALL') {
      orders = orders.filter(o => o.stage === filter);
    }

    if (query) {
      orders = orders.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.customer.toLowerCase().includes(query) ||
        o.carrier.toLowerCase().includes(query) ||
        o.items.some(i => i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query))
      );
    }

    if (orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-10 text-slate-500">
            <svg class="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            No orders found in stage: <span class="text-cyan-400 font-mono font-semibold">${filter}</span>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = orders.map(order => {
      let priorityColor = 'slate';
      if (order.priority >= 90) priorityColor = 'rose';
      else if (order.priority >= 70) priorityColor = 'amber';
      else priorityColor = 'emerald';

      let stageBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
      if (order.stage === 'Route Picking') stageBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 glow-cyan';
      else if (order.stage === 'QC & Packing') stageBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40 glow-purple';
      else if (order.stage === 'Dispatch Ready') stageBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 glow-emerald';
      else if (order.stage === 'Stock Allocation') stageBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      else if (order.stage === 'Completed') stageBadgeClass = 'bg-slate-700/40 text-slate-400 border-slate-600';

      const itemsSummary = order.items.map(i => `${i.qty}x ${i.name} (${i.bin})`).join(', ');

      return `
        <tr class="hover:bg-slate-800/40 border-b border-slate-800/60 transition-colors group cursor-pointer" onclick="window.dashboardModule.handleRowClick('${order.id}')">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-cyan-400 group-hover:text-cyan-300">${order.id}</span>
              ${order.slaUrgent ? '<span class="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Urgent SLA"></span>' : ''}
            </div>
            <div class="text-[11px] text-slate-500 font-mono">${order.dest}</div>
          </td>

          <td class="py-3.5 px-4 font-medium text-slate-200">
            <div>${order.customer}</div>
            <div class="text-xs text-slate-500 font-mono">${order.carrier}</div>
          </td>

          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-${priorityColor}-500/20 border border-${priorityColor}-500/40 flex items-center justify-center font-mono font-bold text-xs text-${priorityColor}-400">
                ${order.priority}
              </div>
              <div class="text-xs text-slate-400">
                ${order.priority >= 90 ? 'Critical' : order.priority >= 70 ? 'High' : 'Normal'}
              </div>
            </div>
          </td>

          <td class="py-3.5 px-4 max-w-xs">
            <div class="text-xs text-slate-300 truncate" title="${itemsSummary}">${itemsSummary}</div>
            <div class="text-[11px] text-slate-500">${order.items.length} Line Item(s) &bull; Value: $${order.value.toFixed(2)}</div>
          </td>

          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${stageBadgeClass}">
              ${order.stage}
            </span>
          </td>

          <td class="py-3.5 px-4 font-mono text-xs">
            <span class="${order.slaUrgent ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-400'}">
              ⏱ ${order.slaTimer}
            </span>
          </td>

          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5" onclick="event.stopPropagation()">
              ${this.renderRowActionButtons(order)}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderRowActionButtons(order) {
    if (order.stage === 'Route Picking') {
      return `
        <button onclick="window.dashboardModule.jumpToPicking('${order.id}')" class="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Pick Station
        </button>
      `;
    } else if (order.stage === 'QC & Packing') {
      return `
        <button onclick="window.dashboardModule.jumpToQC('${order.id}')" class="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          QC Station
        </button>
      `;
    } else if (order.stage === 'Dispatch Ready') {
      return `
        <button onclick="window.dashboardModule.jumpToDispatch('${order.id}')" class="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          Dispatch Label
        </button>
      `;
    } else if (order.stage === 'Order Created' || order.stage === 'Priority Scoring') {
      return `
        <button onclick="window.dashboardModule.advanceToStock('${order.id}')" class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-all">
          Allocate Stock
        </button>
      `;
    } else if (order.stage === 'Stock Allocation') {
      return `
        <button onclick="window.dashboardModule.advanceToPicking('${order.id}')" class="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-all">
          Release to Pick
        </button>
      `;
    } else {
      return `
        <span class="text-xs text-slate-500 font-mono">Dispatched ✅</span>
      `;
    }
  }

  handleRowClick(orderId) {
    window.WMSState.selectOrder(orderId);
  }

  jumpToPicking(orderId) {
    window.WMSState.selectOrder(orderId);
    window.app.switchTab('picking');
    window.showToast('Routing to Picker', `Loaded ${orderId} into digital picking station.`, 'cyan');
  }

  jumpToQC(orderId) {
    window.WMSState.selectOrder(orderId);
    window.app.switchTab('picking');
    window.showToast('Routing to QC', `Loaded ${orderId} into inspection panel.`, 'purple');
  }

  jumpToDispatch(orderId) {
    window.WMSState.selectOrder(orderId);
    window.app.switchTab('dispatch');
    window.dispatchModule.openManifestModal(orderId);
  }

  advanceToStock(orderId) {
    window.soundEngine.playClick();
    window.WMSState.advanceOrderStage(orderId, 'Stock Allocation');
    window.showToast('Stage Advanced', `${orderId} allocated inventory.`, 'amber');
  }

  advanceToPicking(orderId) {
    window.soundEngine.playClick();
    window.WMSState.advanceOrderStage(orderId, 'Route Picking');
    window.showToast('Stage Advanced', `${orderId} released to floor picking route.`, 'cyan');
  }
}

window.dashboardModule = new DashboardModule();
