/**
 * LogiMind Antigravity WMS - Landing Page & Role Selection Interface
 */
class LandingModule {
  constructor() {
    this.selectedRole = 'Operations Manager';
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const roleCards = document.querySelectorAll('.role-select-card');
    roleCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.role;
        this.selectRole(role);
      });
    });

    const enterBtn = document.getElementById('btnEnterDemo');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        this.enterApp();
      });
    }

    // Role switcher in topbar
    const roleSwitcher = document.getElementById('topbarRoleSelect');
    if (roleSwitcher) {
      roleSwitcher.addEventListener('change', (e) => {
        const newRole = e.target.value;
        this.selectRole(newRole, false);
      });
    }
  }

  selectRole(role, playSound = true) {
    if (playSound) window.soundEngine.playClick();
    this.selectedRole = role;
    window.WMSState.setRole(role);

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

    // Update active role badge in topbar
    const topRoleBadge = document.getElementById('topbarActiveRoleBadge');
    if (topRoleBadge) {
      topRoleBadge.textContent = role;
    }
  }

  enterApp() {
    window.soundEngine.playSuccess();
    const landing = document.getElementById('landingScreen');
    const appContainer = document.getElementById('appContainer');

    if (landing && appContainer) {
      landing.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      setTimeout(() => {
        landing.classList.add('hidden');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('opacity-100', 'scale-100');

        // Route to the appropriate initial tab based on role
        if (this.selectedRole === 'Floor Picker Operator') {
          window.app.switchTab('picking');
        } else if (this.selectedRole === 'Dispatch Supervisor') {
          window.app.switchTab('dispatch');
        } else {
          window.app.switchTab('dashboard');
        }

        window.showToast('Matrix Environment Active', `Logged in as ${this.selectedRole}. All 14 autonomous decision rules running live.`, 'emerald');
      }, 400);
    }
  }
}

window.landingModule = new LandingModule();
