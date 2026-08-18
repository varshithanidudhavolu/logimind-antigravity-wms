/**
 * LogiMind Antigravity WMS - Main Application Coordinator & UI Hub
 */
class Application {
  constructor() {
    this.currentTab = 'dashboard';
  }

  init() {
    this.initTheme();
    this.bindGlobalEvents();
    this.initClock();
    this.initToastContainer();

    // Initialize all modules in sequence with fault tolerance
    const modules = [
      { name: 'landingModule', instance: window.landingModule },
      { name: 'dashboardModule', instance: window.dashboardModule },
      { name: 'scenarioSimulator', instance: window.scenarioSimulator },
      { name: 'inventoryModule', instance: window.inventoryModule },
      { name: 'pickingModule', instance: window.pickingModule },
      { name: 'dispatchModule', instance: window.dispatchModule },
      { name: 'analyticsModule', instance: window.analyticsModule },
      { name: 'chatbotModule', instance: window.chatbotModule }
    ];

    modules.forEach(({ name, instance }) => {
      try {
        if (instance && typeof instance.init === 'function') {
          instance.init();
        }
      } catch (err) {
        console.error(`Error initializing module [${name}]:`, err);
      }
    });

    // Subscribe to state changes
    if (window.WMSState) {
      window.WMSState.subscribe((event, payload, state) => {
        if (event === 'VIEW_CHANGED') {
          this.updateSidebarUI(payload);
        }
        if (event === 'ROLE_CHANGED') {
          this.applyRoleRestrictions(payload);
        }
        if (['AUDIT_LOGGED', 'INVENTORY_UPDATED', 'ORDER_UPDATED', 'ORDER_CREATED'].includes(event)) {
          this.renderAuditLog();
        }
      });

      // Apply initial role restrictions
      this.applyRoleRestrictions(window.WMSState.activeRole);
    }

    this.renderAuditLog();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('logimind_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('theme-light');
      this.updateThemeUI('light');
    } else {
      document.body.classList.remove('theme-light');
      this.updateThemeUI('dark');
    }

    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('theme-light');
        const newTheme = isLight ? 'light' : 'dark';
        localStorage.setItem('logimind_theme', newTheme);
        this.updateThemeUI(newTheme);
        if (typeof window.showToast === 'function') {
          window.showToast(isLight ? 'Minimal Light Mode' : 'Slate Dark Mode', 'Theme updated for optimal viewing comfort.', 'emerald');
        }
      });
    }
  }

  updateThemeUI(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'light' ? 'Light Mode' : 'Dark Mode';
  }

  applyRoleRestrictions(role) {
    const allNavButtons = document.querySelectorAll('.nav-tab-btn');
    allNavButtons.forEach(btn => {
      const tab = btn.dataset.tab;
      let isAllowed = true;
      if (role === 'Floor Picker Operator') {
        isAllowed = ['picking', 'orders', 'inventory'].includes(tab);
      } else if (role === 'Dispatch Supervisor') {
        isAllowed = ['dispatch', 'orders', 'inventory'].includes(tab);
      } else {
        isAllowed = true; // Operations Manager has full access
      }

      if (isAllowed) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    });

    // Auto switch if currently in an unavailable tab
    if (role === 'Floor Picker Operator' && !['picking', 'orders', 'inventory'].includes(this.currentTab)) {
      this.switchTab('picking');
    } else if (role === 'Dispatch Supervisor' && !['dispatch', 'orders', 'inventory'].includes(this.currentTab)) {
      this.switchTab('dispatch');
    }
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
    if (window.soundEngine) window.soundEngine.playClick();
    this.currentTab = tabName;
    if (window.WMSState) window.WMSState.setView(tabName);

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
    if (tabName === 'picking' && window.pickingModule) {
      window.pickingModule.initCanvas();
      window.pickingModule.drawRoute();
    } else if (tabName === 'analytics' && window.analyticsModule) {
      setTimeout(() => window.analyticsModule.initCharts(), 100);
    } else if (tabName === 'dispatch' && window.dispatchModule) {
      setTimeout(() => window.dispatchModule.initSignaturePad(), 100);
    } else if (tabName === 'orders' && window.dashboardModule) {
      window.dashboardModule.renderOrdersTable();
    }
  }

  updateSidebarUI(tabName) {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      const tab = btn.dataset.tab;
      if (tab === tabName) {
        btn.classList.add('bg-emerald-500/15', 'border-emerald-500/60', 'text-emerald-300', 'glow-emerald');
        btn.classList.remove('border-transparent', 'text-slate-400', 'hover:bg-slate-900/80');
      } else {
        btn.classList.remove('bg-emerald-500/15', 'border-emerald-500/60', 'text-emerald-300', 'glow-emerald');
        btn.classList.add('border-transparent', 'text-slate-400', 'hover:bg-slate-900/80');
      }
    });

    // Update active orders count in sidebar
    const countEl = document.getElementById('sidebarOrderCount');
    if (countEl && window.WMSState) {
      countEl.textContent = `${window.WMSState.data.orders.length} Active`;
    }
  }

  updateMuteButtonUI(isMuted) {
    const icon = document.getElementById('soundIcon');
    if (icon) {
      icon.innerHTML = isMuted 
        ? `<svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`
        : `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
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

// Global Glassmorphic Toast Notification System
window.showToast = function(title, message, color = 'cyan') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `relative overflow-hidden p-4 rounded-2xl backdrop-blur-2xl bg-slate-950/90 border border-${color}-500/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] text-xs text-slate-200 pointer-events-auto transform translate-x-12 scale-95 opacity-0 transition-all duration-300 ease-out flex items-start gap-3.5 glow-${color} group`;

  let iconSvg = `<span class="led-${color}"></span>`;
  let badgeBg = `bg-${color}-500/20 text-${color}-300 border-${color}-500/40`;

  if (color === 'emerald') {
    iconSvg = `<span class="led-emerald"></span>`;
  } else if (color === 'rose') {
    iconSvg = `<span class="led-rose"></span>`;
  } else if (color === 'amber') {
    iconSvg = `<span class="led-amber"></span>`;
  } else if (color === 'purple') {
    iconSvg = `<span class="led-purple"></span>`;
  }

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-xl ${badgeBg} flex items-center justify-center font-bold text-sm shrink-0 border shadow-inner">
      ${iconSvg}
    </div>
    <div class="flex-1 pr-2 space-y-0.5">
      <div class="font-bold text-slate-100 text-xs flex items-center justify-between">
        <span>${title}</span>
        <span class="text-[9px] font-mono text-slate-500">JUST NOW</span>
      </div>
      <div class="text-slate-300 text-[11px] leading-relaxed font-normal">${message}</div>
    </div>
    <!-- Animated Toast Progress Timer Bar -->
    <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-${color}-500 via-cyan-400 to-emerald-400 toast-progress-bar"></div>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    setTimeout(() => {
      toast.classList.remove('translate-x-12', 'scale-95', 'opacity-0');
      toast.classList.add('translate-x-0', 'scale-100', 'opacity-100');
    }, 15);
  });

  // Auto-dismiss after 4.5 seconds
  setTimeout(() => {
    toast.classList.remove('translate-x-0', 'scale-100', 'opacity-100');
    toast.classList.add('translate-x-12', 'scale-95', 'opacity-0');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 320);
  }, 4500);
};

// Bootstrap when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new Application();
  window.app.init();
});
