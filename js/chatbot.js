/**
 * LogiMind Antigravity WMS - Embedded AI Operations Copilot ("LogiBot AI")
 */
class ChatbotModule {
  constructor() {
    this.isOpen = false;
    this.unreadCount = 1;
    this.messages = [
      {
        sender: 'ai',
        time: 'Just now',
        text: `👋 **Greetings, Operations Lead.** I am **LogiBot AI**, your Antigravity Autonomous Warehouse Co-Pilot.\n\nI monitor **14 Decision Rules**, resolve inventory deadlocks in **<2ms**, and orchestrate AGV swarm routing.\n\n*Click any prompt chip below or type a query to test my cognitive engine:*`
      }
    ];
  }

  init() {
    this.bindEvents();
    this.renderMessages();
  }

  bindEvents() {
    const triggerBtn = document.getElementById('btnToggleChatbot');
    const closeBtn = document.getElementById('btnCloseChatbot');
    const chatForm = document.getElementById('chatbotForm');
    const chatInput = document.getElementById('chatbotInput');

    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        this.toggleChat();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggleChat(false);
      });
    }

    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUserSend();
      });
    }

    // Global click delegation for chatbot toggle, close, and chips
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnToggleChatbot')) {
        e.preventDefault();
        this.toggleChat();
      }

      if (e.target.closest('#btnCloseChatbot')) {
        e.preventDefault();
        this.toggleChat(false);
      }

      const chip = e.target.closest('.chat-chip, .chat-prompt-chip');
      if (chip) {
        e.preventDefault();
        const query = chip.dataset.query || chip.textContent.trim();
        this.processQuery(query);
      }
    });
  }

  toggleChat(forceState = null) {
    if (window.soundEngine) window.soundEngine.playClick();
    this.isOpen = forceState !== null ? forceState : !this.isOpen;

    const drawer = document.getElementById('chatbotDrawer');
    const badge = document.getElementById('chatUnreadBadge');

    if (drawer) {
      if (this.isOpen) {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
        drawer.style.display = 'flex';
        this.unreadCount = 0;
        if (badge) badge.classList.add('hidden');
        const input = document.getElementById('chatbotInput');
        if (input) setTimeout(() => input.focus(), 150);
      } else {
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
        drawer.style.display = 'none';
      }
    }
  }

  handleUserSend() {
    const input = document.getElementById('chatbotInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.processQuery(text);
  }

  processQuery(query) {
    if (window.soundEngine) window.soundEngine.playClick();

    // Add user message
    this.messages.push({
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    });
    this.renderMessages();

    // Ensure chat drawer is open
    if (!this.isOpen) this.toggleChat(true);

    // Simulate AI thinking and reply
    setTimeout(() => {
      if (window.soundEngine) window.soundEngine.playCompute();
      const answer = this.generateResponse(query);
      this.messages.push({
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: answer.text,
        actions: answer.actions || []
      });
      this.renderMessages();
    }, 400);
  }

  generateResponse(query) {
    const q = query.toLowerCase();
    const orders = (window.WMSState && window.WMSState.data.orders) ? window.WMSState.data.orders : [];

    if (q.includes('high priority') || q.includes('priority order') || q.includes('urgent')) {
      const highOrders = orders.filter(o => o.priority >= 80);
      return {
        text: `### 🚨 High-Priority Active Orders (${highOrders.length} Found)\n\n` +
          highOrders.map(o => `* **${o.id}** — **${o.customer}** | Priority: **${o.priority}** | Stage: \`${o.stage}\` | SLA: ⏱ **${o.slaTimer}**`).join('\n\n') +
          `\n\n*All critical SLA timers are actively tracked in the dispatch queue.*`,
        actions: [
          { label: '📋 View Live Orders Queue', action: "window.app.switchTab('dashboard')" }
        ]
      };
    }

    if (q.includes('reroute') || q.includes('agv') || q.includes('traffic') || q.includes('bottleneck')) {
      const activeBns = (window.WMSState && window.WMSState.data.bottlenecks) ? window.WMSState.data.bottlenecks.filter(b => !b.resolved) : [];
      if (activeBns.length > 0) {
        const bn = activeBns[0];
        return {
          text: `### ⚠️ Active Warehouse Bottleneck [${bn.id}]\n\n* **Location:** ${bn.title}\n* **Impact:** ${bn.delay} picking lead time delay\n* **Root Cause:** AGV swarm intersection lock.\n\n*Engaging autonomous dynamic bypass routing via Bypass Corridor C-3.*`,
          actions: [
            { label: '⚡ Execute Auto-Reroute Now', action: "window.WMSState.resolveBottleneck('" + bn.id + "'); if(typeof window.showToast==='function') window.showToast('Bottleneck Resolved', 'AGVs successfully rerouted.', 'emerald');" }
          ]
        };
      } else {
        return {
          text: `### 🟢 Swarm AGV Telemetry: Optimal\n\nAll 12 Swarm AGVs and aisle paths are operating with **zero congestion** at 100% velocity. All bypass channels on standby.`,
          actions: []
        };
      }
    }

    if (q.includes('inventory') || q.includes('stock') || q.includes('sku') || q.includes('buffer')) {
      const skus = (window.WMSState && window.WMSState.data.skus) ? window.WMSState.data.skus : [];
      const lowStock = skus.filter(s => (s.onHand - s.allocated) <= s.safetyBuffer);
      return {
        text: `### 📦 Live Inventory & Safety Buffer Telemetry\n\n* **Total Tracked SKUs:** ${skus.length} Items\n* **Zone Health:** Zones A, B, C, D at 84.2% nominal density\n* **Safety Buffer Alerts:** ${lowStock.length > 0 ? lowStock.map(s => `⚠️ **${s.id}** (${s.name}): Avail ${s.onHand - s.allocated} / Buffer ${s.safetyBuffer}`).join(', ') : 'All SKUs above minimum threshold'}\n\n*Automated Purchase Requisitions are configured for safety stock recovery.*`,
        actions: [
          { label: '📦 Open Inventory & Heatmap', action: "window.app.switchTab('inventory')" }
        ]
      };
    }

    if (q.includes('rule 14') || q.includes('rule') || q.includes('rules')) {
      return {
        text: `### 📜 Antigravity Decision Rule 14: Autonomous Inventory Conflict Resolution\n\n* **Trigger:** Multiple orders contending for scarce SKU stock.\n* **Execution:** If \`Order_A.Priority > Order_B.Priority\` and Order_B is held in buffer, the system automatically revokes up to 100% of required allocation from Order_B to satisfy Order_A.\n* **PO Mitigation:** Automatically drafts a 24h expedited Purchase Order to replenish revoked stock with **zero human intervention**.`,
        actions: [
          { label: '🧠 Test in What-If Simulator', action: "window.app.switchTab('simulator')" }
        ]
      };
    }

    if (q.includes('bay') || q.includes('dock') || q.includes('carrier') || q.includes('truck')) {
      const docks = (window.WMSState && window.WMSState.data.docks) ? window.WMSState.data.docks : [];
      return {
        text: `### 🚛 Dock Doors & Fleet Status (4 Active Bays)\n\n` +
          docks.map(d => `* **${d.name}:** Vehicle \`${d.vehicle}\` | Carrier: **${d.carrier}** | Load Fill: **${d.capacityPct}%** | ETA: \`${d.eta}\``).join('\n\n') +
          `\n\n*All outbound carriers (FedEx, DHL, BlueDart) are monitored with live SLA tracking.*`,
        actions: [
          { label: '🚛 View Dock Doors & Fleet', action: "window.app.switchTab('dispatch')" }
        ]
      };
    }

    // Default fallback intelligence response
    return {
      text: `### 🤖 LogiMind Copilot Intelligence\n\nProcessed query: *"${query}"*\n\n* System State: **Optimal Nominal (12ms Latency)**\n* Active Decision Engine: **Antigravity-v4.2**\n* All 7 Warehouse subsystems are synchronized and responsive.`,
      actions: [
        { label: '📊 View Executive Overview', action: "window.app.switchTab('dashboard')" }
      ]
    };
  }

  renderMessages() {
    const container = document.getElementById('chatbotMessages');
    if (!container) return;

    container.innerHTML = this.messages.map(msg => {
      const isAi = msg.sender === 'ai';

      // Parse markdown bold and headers
      let formattedText = msg.text
        .replace(/### (.*?)\n/g, '<h4 class="font-bold text-xs text-cyan-300 mt-1 mb-0.5">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
        .replace(/`(.*?)`/g, '<code class="px-1 py-0.2 rounded bg-slate-950 font-mono text-[10px] text-emerald-400 border border-slate-800">$1</code>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');

      let actionsHtml = '';
      if (msg.actions && msg.actions.length > 0) {
        actionsHtml = `
          <div class="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
            ${msg.actions.map(act => `
              <button onclick="${act.action}" class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition-all cursor-pointer">
                ${act.label}
              </button>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="flex items-start gap-2.5 ${isAi ? '' : 'flex-row-reverse'} animate-fadeIn">
          <div class="w-6 h-6 rounded-lg ${isAi ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'} flex items-center justify-center text-xs shrink-0">
            ${isAi ? '🤖' : '👤'}
          </div>
          <div class="max-w-[85%] p-3 rounded-2xl ${isAi ? 'bg-slate-900/90 border border-slate-800 text-slate-200' : 'bg-purple-600/30 border border-purple-500/40 text-slate-100'} shadow-md">
            <div class="text-[11px] leading-relaxed">${formattedText}</div>
            ${actionsHtml}
            <div class="text-[9px] font-mono text-slate-500 mt-1 text-right">${msg.time}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }
}

window.chatbotModule = new ChatbotModule();
