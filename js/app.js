/**
 * LogiMind Antigravity WMS - Main Application Coordinator & UI Hub
 */
class Application {
  constructor() {
    this.currentTab = 'dashboard';
  }

  init() {
    this.bindGlobalEvents();
    this.initClock();
    this.initToastContainer();

    // Initialize all modules in sequence
    window.landingModule.init();
    window.dashboardModule.init();
    window.scenarioSimulator.init();
    window.inventoryModule.init();
    window.pickingModule.init();
    window.dispatchModule.init();
    window.analyticsModule.init();
    window.chatbotModule.init();

    // Subscribe to state changes
    window.WMSState.subscribe((event, payload, state) => {
      if (event === 'VIEW_CHANGED') {
        this.updateSidebarUI(payload);
      }
      if (['AUDIT_LOGGED', 'INVENTORY_UPDATED', 'ORDER_UPDATED'].includes(event)) {
        this.renderAuditLog();
      }
    });

    this.renderAuditLog();
  }

  bindGlobalEvents() {
    // Sidebar Nav links
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Audio Mute Toggle
    const muteBtn = document.getElementById('btnToggleMute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.updateMuteButtonUI(isMuted);
      });
    }

    // Global Search Bar in Topbar
    const globalSearch = document.getElementById('topbarGlobalSearch');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        window.WMSState.setSearch(e.target.value);
      });
    }
  }

  switchTab(tabName) {
    window.soundEngine.playClick();
    this.currentTab = tabName;
    window.WMSState.setView(tabName);

    // Hide all view containers
    const viewContainers = document.querySelectorAll('.view-pane');
    viewContainers.forEach(pane => {
      pane.classList.add('hidden');
    });

    // Show selected view container
    const activePane = document.getElementById(`view-${tabName}`);
    if (activePane) {
      activePane.classList.remove('hidden');
    }

    this.updateSidebarUI(tabName);

    // Specific on-tab-switch hooks
    if (tabName === 'picking') {
      window.pickingModule.initCanvas();
      window.pickingModule.drawRoute();
    } else if (tabName === 'analytics') {
      setTimeout(() => window.analyticsModule.initCharts(), 100);
    } else if (tabName === 'dispatch') {
      setTimeout(() => window.dispatchModule.initSignaturePad(), 100);
    }
  }

  updateSidebarUI(tabName) {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      const tab = btn.dataset.tab;
      if (tab === tabName) {
        btn.classList.add('bg-cyan-500/15', 'border-cyan-500/50', 'text-cyan-300', 'glow-cyan');
        btn.classList.remove('border-transparent', 'text-slate-400', 'hover:bg-slate-800/60');
      } else {
        btn.classList.remove('bg-cyan-500/15', 'border-cyan-500/50', 'text-cyan-300', 'glow-cyan');
        btn.classList.add('border-transparent', 'text-slate-400', 'hover:bg-slate-800/60');
      }
    });
  }

  updateMuteButtonUI(isMuted) {
    const icon = document.getElementById('soundIcon');
    const label = document.getElementById('soundLabel');
    if (icon) {
      icon.innerHTML = isMuted 
        ? `<svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`
        : `<svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
    }
    if (label) {
      label.textContent = isMuted ? 'Muted' : 'Audio On';
    }
    window.showToast(isMuted ? 'Audio Muted' : 'Audio Enabled', 'Tactile UI acoustic feedback changed.', 'slate');
  }

  initClock() {
    const clockEl = document.getElementById('topbarClock');
    const update = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';
      }
    };
    update();
    setInterval(update, 1000);
  }

  initToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const div = document.createElement('div');
      div.id = 'toastContainer';
      div.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none';
      document.body.appendChild(div);
    }
  }

  renderAuditLog() {
    const container = document.getElementById('auditLogFeed');
    const poContainer = document.getElementById('poRequisitionFeed');
    if (!container) return;

    const logs = window.WMSState.data.auditLog;
    container.innerHTML = logs.map(log => `
      <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs">
        <span class="font-mono text-cyan-400 shrink-0 text-[11px] bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">${log.time}</span>
        <div class="flex-1">
          <div class="text-[11px] text-slate-400 font-mono"><span class="text-slate-200 font-bold">${log.user}</span></div>
          <div class="text-slate-300 mt-0.5">${log.action}</div>
        </div>
      </div>
    `).join('');

    if (poContainer) {
      const pos = window.WMSState.data.purchaseOrders;
      poContainer.innerHTML = pos.map(po => `
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-cyan-400">${po.id}</span>
              <span class="font-semibold text-slate-200">${po.name}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${po.status.includes('Approved') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">${po.status}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Vendor: <strong class="text-slate-300">${po.supplier}</strong> &bull; Qty: <span class="text-emerald-400 font-bold font-mono">${po.qty} units</span> &bull; Date: ${po.date}
            </div>
            <div class="text-[11px] text-slate-500 mt-0.5 italic">${po.reason}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

// Global Toast System
window.showToast = function(title, message, color = 'cyan') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `p-3.5 rounded-xl glass-panel-glow border border-${color}-500/40 shadow-2xl text-xs text-slate-200 pointer-events-auto transform translate-x-10 opacity-0 transition-all duration-300 flex items-start gap-3 bg-slate-950/90`;

  let iconSvg = `<span class="w-2 h-2 rounded-full bg-${color}-400 mt-1"></span>`;
  if (color === 'emerald') iconSvg = `✓`;
  else if (color === 'rose') iconSvg = `⚠️`;
  else if (color === 'amber') iconSvg = `⚡`;
  else if (color === 'purple') iconSvg = `🤖`;

  toast.innerHTML = `
    <div class="w-6 h-6 rounded-lg bg-${color}-500/20 text-${color}-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-${color}-500/30">
      ${iconSvg}
    </div>
    <div class="flex-1 pr-1">
      <div class="font-bold text-slate-100 text-xs">${title}</div>
      <div class="text-slate-400 text-[11px] mt-0.5 leading-snug">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-10', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  }, 20);

  // Auto-dismiss after 4.5 seconds
  setTimeout(() => {
    toast.classList.add('translate-x-10', 'opacity-0');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 4500);
};

// Bootstrap when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new Application();
  window.app.init();
});
