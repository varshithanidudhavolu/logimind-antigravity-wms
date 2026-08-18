/**
 * LogiMind Antigravity WMS - Inventory & Exception Management
 */
class InventoryModule {
  constructor() {
    this.selectedCategory = 'ALL';
    this.selectedRack = null;
  }

  init() {
    this.bindEvents();
    this.render();

    // Subscribe to state
    window.WMSState.subscribe((event, payload, state) => {
      if (['INVENTORY_UPDATED', 'SEARCH_CHANGED'].includes(event)) {
        this.render();
      }
    });
  }

  bindEvents() {
    // Category filter dropdown
    const catSelect = document.getElementById('inventoryCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.renderSkuTable();
      });
    }

    // SKU Search input
    const skuSearch = document.getElementById('inventorySkuSearch');
    if (skuSearch) {
      skuSearch.addEventListener('input', (e) => {
        this.renderSkuTable();
      });
    }

    // Report Damaged Modal openers
    const reportBtns = document.querySelectorAll('.btn-open-damage-modal');
    reportBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.openDamageModal();
      });
    });

    // Damage form submission
    const damageForm = document.getElementById('damageReportForm');
    if (damageForm) {
      damageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDamageSubmit();
      });
    }

    // Close damage modal
    const closeDamageModalBtn = document.getElementById('btnCloseDamageModal');
    if (closeDamageModalBtn) {
      closeDamageModalBtn.addEventListener('click', () => {
        this.closeDamageModal();
      });
    }
  }

  render() {
    this.renderZoneHeatmap();
    this.renderSkuTable();
    this.renderCategoryCounts();
  }

  renderCategoryCounts() {
    const skus = window.WMSState.data.skus;
    const countTotal = skus.reduce((acc, s) => acc + s.onHand, 0);
    const countElec = skus.filter(s => s.category === 'Electronics').reduce((acc, s) => acc + s.onHand, 0);
    const countFast = skus.filter(s => s.category === 'Fasteners').reduce((acc, s) => acc + s.onHand, 0);
    const countHigh = skus.filter(s => s.category === 'High-Value').reduce((acc, s) => acc + s.onHand, 0);
    const countApp = skus.filter(s => s.category === 'Apparel').reduce((acc, s) => acc + s.onHand, 0);

    const elTotal = document.getElementById('invCountTotal');
    const elElec = document.getElementById('invCountElec');
    const elFast = document.getElementById('invCountFast');
    const elHigh = document.getElementById('invCountHigh');
    const elApp = document.getElementById('invCountApp');

    if (elTotal) elTotal.textContent = countTotal;
    if (elElec) elElec.textContent = countElec;
    if (elFast) elFast.textContent = countFast;
    if (elHigh) elHigh.textContent = countHigh;
    if (elApp) elApp.textContent = countApp;
  }

  renderZoneHeatmap() {
    const zones = [
      { id: 'Zone A', name: 'Zone A: High-Tech Electronics', racks: ['A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06', 'A-07', 'A-08'], color: 'cyan' },
      { id: 'Zone B', name: 'Zone B: Precision Fasteners', racks: ['B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06', 'B-07', 'B-08'], color: 'emerald' },
      { id: 'Zone C', name: 'Zone C: Cryo & High-Value', racks: ['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06', 'C-07', 'C-08'], color: 'purple' },
      { id: 'Zone D', name: 'Zone D: Apparel & ESD Safety', racks: ['D-01', 'D-02', 'D-03', 'D-04', 'D-05', 'D-06', 'D-07', 'D-08'], color: 'amber' }
    ];

    const skus = window.WMSState.data.skus;
    const container = document.getElementById('zoneHeatmapGrid');
    if (!container) return;

    container.innerHTML = zones.map(zone => {
      return `
        <div class="glass-panel hover-elevate p-4 rounded-xl border border-slate-700/60 transition-all">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="led-${zone.color}"></span>
              <h4 class="text-xs font-bold font-heading text-slate-200">${zone.name}</h4>
            </div>
            <span class="text-[11px] font-mono text-slate-400">Temp: 21.4°C | Humidity: 42%</span>
          </div>

          <div class="grid grid-cols-4 gap-2">
            ${zone.racks.map(rack => {
              const matchedSku = skus.find(s => s.aisle === rack);
              let densityPct = matchedSku ? Math.min(100, Math.round((matchedSku.onHand / (matchedSku.safetyBuffer * 2)) * 80)) : Math.floor(20 + Math.random() * 50);
              let densityColor = 'bg-slate-800 border-slate-700 text-slate-400';

              if (densityPct > 80) densityColor = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
              else if (densityPct > 55) densityColor = `bg-${zone.color}-500/20 border-${zone.color}-500/50 text-${zone.color}-300`;
              else densityColor = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';

              return `
                <div onclick="window.inventoryModule.inspectRack('${rack}', '${matchedSku ? matchedSku.id : ''}')" 
                     class="p-2 rounded-lg border text-center cursor-pointer transition-all hover:scale-105 hover:border-${zone.color}-400 ${densityColor} flex flex-col justify-between h-18 group relative shadow-md">
                  <div class="flex justify-between items-center text-[10px] font-mono">
                    <span class="font-bold">${rack}</span>
                    <span>${densityPct}%</span>
                  </div>
                  <div class="text-[10px] truncate font-medium text-slate-300">
                    ${matchedSku ? matchedSku.name.split(' ')[0] : 'Open Bin'}
                  </div>
                  <div class="w-full bg-slate-900/60 rounded-full h-1 mt-1 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style="width: ${densityPct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  inspectRack(rackId, skuId) {
    window.soundEngine.playClick();
    if (skuId) {
      const sku = window.WMSState.data.skus.find(s => s.id === skuId);
      if (sku) {
        window.showToast(`Rack ${rackId}`, `${sku.name} (${sku.id}) &bull; On-Hand: ${sku.onHand} &bull; Batch: ${sku.batch}`, 'cyan');
        this.openDamageModal(sku.id);
      }
    } else {
      window.showToast(`Rack ${rackId}`, `Bin is currently reserved for buffer overflow stock.`, 'slate');
    }
  }

  renderSkuTable() {
    const tableBody = document.getElementById('inventorySkuTableBody');
    if (!tableBody) return;

    let skus = [...window.WMSState.data.skus];
    const category = this.selectedCategory;
    const searchInput = document.getElementById('inventorySkuSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    if (category !== 'ALL') {
      skus = skus.filter(s => s.category === category);
    }

    if (query) {
      skus = skus.filter(s => 
        s.id.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.zone.toLowerCase().includes(query) ||
        s.aisle.toLowerCase().includes(query)
      );
    }

    if (skus.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8 text-slate-500">No SKU items matching current filter criteria.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = skus.map(sku => {
      const isLowStock = sku.onHand < sku.safetyBuffer;
      const isWarning = sku.onHand <= sku.safetyBuffer + 2;

      let stockBadge = `
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          HEALTHY
        </span>
      `;

      if (isLowStock) {
        stockBadge = `
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
            CRITICAL LOW
          </span>
        `;
      } else if (isWarning) {
        stockBadge = `
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            BUFFER AT RISK
          </span>
        `;
      }

      return `
        <tr class="table-row-glow hover:bg-slate-800/40 border-b border-slate-800/60 transition-all">
          <td class="py-3 px-4">
            <div class="font-mono font-bold text-cyan-400 flex items-center gap-2">
              <span class="led-cyan"></span>
              ${sku.id}
            </div>
            <div class="text-[11px] text-slate-500 font-mono pl-4">Batch: ${sku.batch}</div>
          </td>

          <td class="py-3 px-4">
            <div class="font-semibold text-slate-200">${sku.name}</div>
            <div class="text-xs text-slate-400">${sku.category} &bull; Unit: $${sku.unitCost.toFixed(2)}</div>
          </td>

          <td class="py-3 px-4">
            <div class="flex items-center gap-1.5 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-semibold">${sku.zone}</span>
              <span class="text-cyan-400">${sku.aisle}</span>
            </div>
          </td>

          <td class="py-3 px-4 font-mono">
            <div class="text-base font-bold ${isLowStock ? 'text-rose-400' : 'text-slate-200'}">${sku.onHand} units</div>
            <div class="text-[11px] text-slate-500">${sku.allocated} Allocated</div>
          </td>

          <td class="py-3 px-4 font-mono text-xs text-slate-400">
            <div>${sku.safetyBuffer} units</div>
            <div class="text-[11px] text-slate-500">Exp: ${sku.expiry}</div>
          </td>

          <td class="py-3 px-4">
            ${stockBadge}
          </td>

          <td class="py-3 px-4 text-right">
            <button onclick="window.inventoryModule.openDamageModal('${sku.id}')" class="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 ml-auto transition-all cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Report Damage
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openDamageModal(preselectedSkuId = null) {
    window.soundEngine.playClick();
    const modal = document.getElementById('damageReportModal');
    const select = document.getElementById('damageSkuSelect');
    if (!modal || !select) return;

    const skus = window.WMSState.data.skus;
    select.innerHTML = skus.map(s => `
      <option value="${s.id}" ${preselectedSkuId === s.id ? 'selected' : ''}>
        ${s.id} - ${s.name} (On-Hand: ${s.onHand})
      </option>
    `).join('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeDamageModal() {
    const modal = document.getElementById('damageReportModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleDamageSubmit() {
    const skuId = document.getElementById('damageSkuSelect').value;
    const qty = parseInt(document.getElementById('damageQtyInput').value, 10) || 1;
    const reason = document.getElementById('damageReasonSelect').value;

    const res = window.WMSState.reportDamaged(skuId, qty, reason);

    this.closeDamageModal();

    if (res.reorderTriggered) {
      window.soundEngine.playAlert();
      window.showToast('CRITICAL EXCEPTION', `Damaged items reported. On-hand (${res.sku.onHand}) dropped below safety buffer (${res.sku.safetyBuffer}). Triggered Emergency PO draft!`, 'rose');
      this.showEmergencyPoModal(res.newPo);
    } else {
      window.soundEngine.playSuccess();
      window.showToast('Stock Adjusted', `Reported -${qty} damaged units of ${res.sku.name}. Inventory decremented.`, 'amber');
    }

    this.render();
  }

  showEmergencyPoModal(po) {
    if (!po) return;
    const modal = document.getElementById('emergencyPoModal');
    const poDetails = document.getElementById('emergencyPoDetails');
    if (modal && poDetails) {
      poDetails.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-slate-300 space-y-2">
          <div class="flex justify-between font-mono font-bold text-rose-300">
            <span>PO NUMBER: ${po.id}</span>
            <span>STATUS: ${po.status}</span>
          </div>
          <div><strong class="text-slate-100">Item:</strong> ${po.name} (${po.sku})</div>
          <div><strong class="text-slate-100">Reorder Quantity:</strong> <span class="text-emerald-400 font-bold font-mono text-sm">${po.qty} units</span></div>
          <div><strong class="text-slate-100">Recommended Vendor:</strong> ${po.supplier}</div>
          <div class="text-[11px] text-slate-400"><strong class="text-slate-200">Trigger Reason:</strong> ${po.reason}</div>
        </div>
      `;
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      const btnApprove = document.getElementById('btnApproveEmergencyPo');
      if (btnApprove) {
        btnApprove.onclick = () => {
          window.soundEngine.playSuccess();
          po.status = 'Approved & Dispatched to Supplier';
          window.WMSState.addAudit(`Approved Emergency PO ${po.id} for ${po.qty}x ${po.name}`);
          window.showToast('Purchase Order Approved', `PO #${po.id} dispatched via API to supplier.`, 'emerald');
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        };
      }

      const btnClose = document.getElementById('btnCloseEmergencyPo');
      if (btnClose) {
        btnClose.onclick = () => {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
        };
      }
    }
  }
}

window.inventoryModule = new InventoryModule();
