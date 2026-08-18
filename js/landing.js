/**
 * LogiMind Antigravity WMS - Landing Page & Role Selection Interface
 */
class LandingModule {
  constructor() {
    this.selectedRole = 'Operations Manager';
    this.isEntered = false;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Role selection cards
    const roleCards = document.querySelectorAll('.role-select-card');
    roleCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.role || 'Operations Manager';
        this.selectRole(role, false);
        this.enterApp(role);
      });
    });

    // Enter primary button
    const enterBtn = document.getElementById('btnEnterDemo');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        this.enterApp(this.selectedRole);
      });
    }

    // Role switcher in topbar
    const roleSwitcher = document.getElementById('topbarRoleSelect');
    if (roleSwitcher) {
      roleSwitcher.addEventListener('change', (e) => {
        const newRole = e.target.value;
        this.selectRole(newRole, false);
        if (window.app) {
          if (newRole === 'Floor Picker Operator') {
            window.app.switchTab('picking');
          } else if (newRole === 'Dispatch Supervisor') {
            window.app.switchTab('dispatch');
          } else {
            window.app.switchTab('dashboard');
          }
        }
      });
    }
  }

  selectRole(role, playSound = true) {
    try {
      if (playSound && window.soundEngine) window.soundEngine.playClick();
    } catch (err) {
      console.warn('Audio click tone error:', err);
    }
    
    this.selectedRole = role;
    if (window.WMSState) {
      window.WMSState.setRole(role);
    }

    // Update role card UI highlights
    const roleCards = document.querySelectorAll('.role-select-card');
    roleCards.forEach(card => {
      if (card.dataset.role === role) {
        card.classList.add('border-emerald-400', 'bg-emerald-500/15', 'glow-emerald');
        card.classList.remove('border-slate-800', 'bg-slate-950/60');
      } else {
        card.classList.remove('border-emerald-400', 'bg-emerald-500/15', 'glow-emerald');
        card.classList.add('border-slate-800', 'bg-slate-950/60');
      }
    });

    // Update topbar select
    const roleSwitcher = document.getElementById('topbarRoleSelect');
    if (roleSwitcher) {
      roleSwitcher.value = role;
    }

    // Update active role badge in topbar if present
    const topRoleBadge = document.getElementById('topbarActiveRoleBadge');
    if (topRoleBadge) {
      topRoleBadge.textContent = role;
    }
  }

  enterApp(role = null) {
    if (role) {
      this.selectedRole = role;
      if (window.WMSState) window.WMSState.setRole(role);
    }

    try {
      if (window.soundEngine) window.soundEngine.playSuccess();
    } catch (err) {
      console.warn('Audio success chime error:', err);
    }

    const landing = document.getElementById('landingScreen');
    const appContainer = document.getElementById('appContainer');

    if (landing) {
      landing.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      setTimeout(() => {
        landing.style.display = 'none';
        landing.classList.add('hidden');
      }, 300);
    }

    if (appContainer) {
      appContainer.style.display = 'flex';
      appContainer.classList.remove('hidden');
      requestAnimationFrame(() => {
        appContainer.classList.remove('opacity-0');
        appContainer.classList.add('opacity-100');
      });
    }

    this.isEntered = true;

    // Route to the appropriate initial tab based on role
    setTimeout(() => {
      if (window.app) {
        if (this.selectedRole === 'Floor Picker Operator') {
          window.app.switchTab('picking');
        } else if (this.selectedRole === 'Dispatch Supervisor') {
          window.app.switchTab('dispatch');
        } else {
          window.app.switchTab('dashboard');
        }
      }

      if (typeof window.showToast === 'function') {
        window.showToast('Matrix Environment Active', `Logged in as ${this.selectedRole}. All 14 autonomous decision rules running live.`, 'emerald');
      }
    }, 50);
  }
}

window.landingModule = new LandingModule();

// Double ensure event listeners bind as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.landingModule.init();
  });
} else {
  window.landingModule.init();
}
