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
        text: `👋 **Greetings, Operations Lead.** I am **LogiBot AI**, your Antigravity Autonomous Warehouse Co-Pilot.\n\nI monitor **14 Decision Rules**, solve inventory deadlocks in **<2ms**, and orchestrate AGV swarm routing.\n\n*Click any prompt chip below or type a query to test my cognitive engine:*`
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
    const chatInput = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('btnSendChatMessage');

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

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => {
        this.handleUserSend();
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleUserSend();
        }
      });
    }

    // Prompt Chips
    const chips = document.querySelectorAll('.chat-prompt-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const query = e.currentTarget.dataset.query || e.currentTarget.textContent.trim();
        this.processQuery(query);
      });
    });
  }

  toggleChat(forceState = null) {
    window.soundEngine.playClick();
    this.isOpen = forceState !== null ? forceState : !this.isOpen;

    const drawer = document.getElementById('chatbotDrawer');
    const badge = document.getElementById('chatUnreadBadge');

    if (drawer) {
      if (this.isOpen) {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
        this.unreadCount = 0;
        if (badge) badge.classList.add('hidden');
        const input = document.getElementById('chatbotInput');
        if (input) setTimeout(() => input.focus(), 150);
      } else {
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
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
    window.soundEngine.playClick();

    // Add user message
    this.messages.push({
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    });
    this.renderMessages();

    // Ensure chat is open
    if (!this.isOpen) this.toggleChat(true);

    // Simulate AI thinking and reply
    setTimeout(() => {
      window.soundEngine.playCompute();
      const answer = this.generateResponse(query);
      this.messages.push({
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: answer.text,
        actions: answer.actions || []
      });
      this.renderMessages();
    }, 450);
  }

  generateResponse(query) {
    const q = query.toLowerCase();

    if (q.includes('conflict') || q.includes('10 vs 7 vs 5') || q.includes('reallocation')) {
      return {
        text: `### 🧠 Autonomous Stock Conflict Resolution Matrix\n\n**Scenario Parameters:**\n- **Urgent Order Demand:** 10 units (Priority 96)\n- **Available Unallocated:** 7 units\n- **Low-Priority Order Held:** 5 units (Priority 35)\n\n**Execution Breakdown:**\n1. **Priority Rule Evaluation:** Priority 96 > Priority 35 (Threshold: 75).\n2. **Inventory Reallocation:** System revokes **3 units** from the low-priority order and combines with **7 unallocated units** to fulfill **100% (10 units)** of Urgent Order demand.\n3. **Backorder Mitigation:** Remaining 2 units left in low-priority order. Automated Purchase Order draft **#PO-702** created for 8 replacement units with expedited 24h delivery SLA.\n4. **Audit State:** Global tables updated in **1.2ms** with zero human intervention.`,
        actions: [
          { label: '🚀 Open What-If Simulator', action: "window.app.switchTab('simulator')" }
        ]
      };
    }

    if (q.includes('bottleneck') || q.includes('zone a') || q.includes('traffic') || q.includes('aisle')) {
      const activeBns = window.WMSState.data.bottlenecks.filter(b => !b.resolved);
      if (activeBns.length > 0) {
        return {
          text: `### ⚠️ Active Warehouse Bottleneck Telemetry\n\n**Radar Alert [${activeBns[0].id}]:** ${activeBns[0].title}\n- **Impact:** ${activeBns[0].delay} picking delay\n- **Root Cause:** AGV-03 & AGV-07 intersection contention\n- **Recommended Resolution:** Engage Autonomous Dynamic Bypass route C-3 around Zone B.`,
          actions: [
            { label: '⚡ Auto-Reroute AGVs Now', action: "window.WMSState.resolveBottleneck('" + activeBns[0].id + "'); window.showToast('Resolved', 'AGVs successfully rerouted.', 'emerald');" }
          ]
        };
      } else {
        return {
          text: `### 🟢 Radar Clear\n\nAll AGV paths, pick aisles, and QC workstations are currently running at optimal velocity. Zero contention locks detected.`,
          actions: []
        };
      }
    }

    if (q.includes('damaged') || q.includes('missing') || q.includes('spill') || q.includes('broken')) {
      return {
        text: `### 🛡️ Damaged / Missing Item Exception Protocol\n\nWhen a warehouse operator reports a damaged SKU:\n1. **Instant Stock Decrement:** \`onHand\` quantity is immediately deducted from the physical rack bin.\n2. **Safety Threshold Check:** If \`onHand < safetyBuffer\`, the system instantly triggers an **Emergency Reorder Recommendation PO** with suggested economic order quantity (EOQ).\n3. **Downstream Dependency Recalculation:** Active orders requiring this SKU are evaluated against Priority Scores; lower-priority orders are queued for backorder.\n4. **Audit Logging:** Incident is timestamped with root cause (e.g. Forklift, Leak, Expiry).`,
        actions: [
          { label: '📦 Open Damage Reporter', action: "window.inventoryModule.openDamageModal()" }
        ]
      };
    }

    if (q.includes('carrier') || q.includes('fedex') || q.includes('dhl') || q.includes('bluedart')) {
      return {
        text: `### 🚚 Multi-Carrier AI Optimization Matrix\n\n- **FedEx Priority:** Best for Domestic Expedited SLA (<14 hrs transit, 99.1% reliability, $12.50/kg).\n- **DHL Express:** Best for Cryo-cooled & High-Value processors ($14.20/kg, 12 hrs global customs fast-track).\n- **BlueDart Logistics:** Best for cost-optimized domestic volume ($8.40/kg, 24 hrs transit).`,
        actions: [
          { label: '📋 View Dock Doors & Manifest', action: "window.app.switchTab('dispatch')" }
        ]
      };
    }

    if (q.includes('route') || q.includes('picking') || q.includes('tsp') || q.includes('shortest')) {
      return {
        text: `### 🗺️ Traveling Salesperson (TSP) Route Optimizer\n\nThe Antigravity pathfinding engine computes the exact minimum Manhattan walking distance across Racks A, B, C, and D.\n- Reduces picker transit time by **38.4%**.\n- Groups co-located SKUs into a single pick run.\n- Integrates with the simulated handheld Barcode Scanner.`,
        actions: [
          { label: '📍 View Pick Route Grid', action: "window.app.switchTab('picking')" }
        ]
      };
    }

    // Default intelligent response
    return {
      text: `### 🤖 LogiBot Cognitive Assistant\n\nI have analyzed your query: *"**${query}**"*.\n\n**Current Warehouse Health:**\n- **Active Orders:** ${window.WMSState.data.systemStats.activeOrdersCount}\n- **SLA Compliance:** ${window.WMSState.data.systemStats.slaCompliancePct}%\n- **Space Utilization:** ${window.WMSState.data.systemStats.spaceUtilizationPct}%\n- **Decision Engine Rules Active:** 14 Rules\n\nSelect any module from the navigation sidebar or ask me about stock reallocations, picking routes, or carrier selection.`,
      actions: [
        { label: '📊 View Executive Dashboard', action: "window.app.switchTab('dashboard')" }
      ]
    };
  }

  renderMessages() {
    const container = document.getElementById('chatbotMessagesList');
    if (!container) return;

    container.innerHTML = this.messages.map((m, idx) => {
      const isAi = m.sender === 'ai';
      const parsedText = this.parseMarkdown(m.text);

      let actionButtons = '';
      if (m.actions && m.actions.length > 0) {
        actionButtons = `
          <div class="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-2">
            ${m.actions.map(act => `
              <button onclick="${act.action}" class="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer">
                ${act.label}
              </button>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}">
          ${isAi ? `
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-slate-950 font-extrabold text-xs shrink-0 shadow-md">
              🤖
            </div>
          ` : ''}

          <div class="max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
            isAi 
              ? 'bg-slate-900/90 text-slate-200 border border-slate-700/70' 
              : 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-medium'
          }">
            <div class="flex justify-between items-center text-[10px] opacity-70 mb-1 font-mono">
              <span>${isAi ? 'LogiBot AI' : 'You'}</span>
              <span>${m.time}</span>
            </div>
            <div>${parsedText}</div>
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  parseMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/### (.*?)\n/g, '<div class="text-xs font-bold font-heading text-cyan-300 mt-2 mb-1">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">$1</code>')
      .replace(/\n\n/g, '<div class="my-1.5"></div>')
      .replace(/\n- /g, '<br>&bull; ')
      .replace(/\n/g, '<br>');
  }
}

window.chatbotModule = new ChatbotModule();
