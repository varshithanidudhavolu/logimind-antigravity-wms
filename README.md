# LogiMind Antigravity WMS 🚀
### *Next-Gen Autonomous Warehouse Decision & Fulfillment Co-Pilot*

![Theme](https://img.shields.io/badge/Theme-Dark%20Obsidian-06B6D4?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-HTML5%20%7C%20TailwindCSS%20%7C%20Vanilla%20JS-8B5CF6?style=for-the-badge)
![AI-Engine](https://img.shields.io/badge/Engine-Antigravity%20v4.2-10B981?style=for-the-badge)
![Status](https://img.shields.io/badge/System-Online%20(14%20Rules)-06B6D4?style=for-the-badge)

**LogiMind Antigravity WMS** is a full-featured, zero-build single-page web application designed for high-velocity autonomous warehouse fulfillment, dynamic stock reallocation, and intelligent logistics orchestration.

---

## 🌟 Key Architecture & Modules

### 1. 🚀 Section 0: Welcome Screen & Persona Role Selector
- **System Status Pulse**: Live indicator showing 14 active autonomous decision rules, 12ms latency, and core engine version.
- **Tailored Role Modes**:
  - **Operations Manager**: Loads the Executive Radar, Space Utilization metrics, and Live Scenario Simulator.
  - **Floor Picker Operator**: Loads Digital Picking, TSP Route Optimizer, and 3-Point QC Packing Station.
  - **Dispatch Supervisor**: Loads Dock Bays 1–4, Multi-Carrier Matrix, and Digital Proof of Delivery (POD) Signature Pad.

---

### 2. ⚡ Section 1: Live "What-If" Custom Scenario Simulator
- Test multi-order stock contention and priority conflict resolution in real-time.
- **Customizable Inputs**:
  - Urgent Order Demand Needed ($N$)
  - Available Unallocated Stock ($A$)
  - Low-Priority Order Held Stock ($H$)
  - Priority Score Threshold Slider (1–100)
- **Presets Included**: *The Classic 10-7-5 Conflict*, *Direct Safe Allocation*, *Severe Deficit Crisis*, and *Flash Peak Surge*.
- **Decision Engine Output**:
  - Evaluates $A \ge N$ (Direct Full Allocation), $(A+H) \ge N$ (Reallocation Workflow + Revocation + Backorder PO), or $(A+H) < N$ (Partial Allocation + Emergency Supplier PO).
  - Highlights active pathways in the interactive SVG/HTML Decision Flowchart.
  - One-click **"Commit Outcome to Live WMS State"** to update master inventory and order tables.

---

### 3. 📊 Section 2: Executive Command Dashboard & Pipeline
- **Real-Time KPI Cards**: Active Orders, On-Time Dispatch SLA % (98.4%), Space Utilization (84.2%), Active Bottlenecks, and Pick Velocity.
- **Interactive 7-Stage Fulfillment Pipeline**:
  $$\text{All} \longrightarrow \text{Created} \longrightarrow \text{Priority Scored} \longrightarrow \text{Allocated} \longrightarrow \text{Picking} \longrightarrow \text{QC \& Packing} \longrightarrow \text{Dispatch Ready}$$
  Clicking any phase filters active orders instantly with glowing indicators.
- **Bottleneck Radar Banner**: Real-time traffic alerts (e.g. *Zone B Aisle 4 Congestion*) with a 1-click **"Auto-Reroute AGVs"** button.

---

### 4. 🏬 Section 3: Inventory & 2D Zone Heatmap
- **Interactive 2D Heatmap**: Zones A (Electronics), B (Fasteners), C (High-Value), and D (Apparel) with 32 rack bins and hover tooltips.
- **Master SKU Catalog**: Search, category filters, unit costs, batch codes, and safety buffer tags.
- **Report Damaged / Missing Item Action**: Immediately decrements stock, logs the incident to the audit trail, and auto-triggers an **Emergency Purchase Order** if buffer falls below safe thresholds.

---

### 5. 🎯 Section 4: Digital Pick, Pack & Quality Control Workflow
- **Traveling Salesperson (TSP) Shortest Path Canvas**: Interactive 2D warehouse canvas visualizing the optimal pick route across zones, saving **38.4%** transit time.
- **Simulated Laser Barcode / QR Scanner**: Viewfinder animation with tactile 880Hz audio feedback.
- **AI Smart Box Recommender**: Computes weight/volume to recommend box sizes (Box S1, M2, L3) and displays carbon footprint savings.
- **3-Point QC Inspection Gate**: Visual check, weight tolerance scale, and cushioning verification leading to tamper-proof seal generation (`SEAL-9824-SEC`).

---

### 6. 🚚 Section 5: Fleet, Dock Doors & Dispatch Center
- **Dock Bays 1–4**: Real-time bay status, capacity progress bars, and truck assignments.
- **AI Carrier Selection Matrix**: Side-by-side comparison of **FedEx Priority**, **DHL Express**, and **BlueDart Logistics** with an "AI Auto-Match Best Carrier" engine.
- **One-Click Printable Shipping Manifest & Label Modal**: Includes SVG Code128 barcode, QR code, and print-ready stylesheet.
- **Digital Proof of Delivery (POD) Signature Pad**: Interactive HTML5 Canvas allowing users to draw and submit signatures to finalize dispatch.

---

### 7. 🤖 Section 6: Embedded AI Operations Copilot ("LogiBot AI")
- Floating widget with cyan glowing aura and unread notification counter.
- Interactive prompt chips:
  - *"Explain Conflict Resolution (10 vs 7 vs 5)"*
  - *"Show Active Bottlenecks in Zone A"*
  - *"What happens when an item is reported damaged?"*
- Natural language queries and dynamic deep-link action buttons embedded inside AI responses.

---

### 8. 🔊 Section 7: Operational Analytics & Web Audio Engine
- Animated Chart.js charts: Zone Picking Speed (Bar), Category Distribution (Donut), and 24-Hour SLA Lead Time (Line).
- Built-in Web Audio API sound synthesis with an on-screen **Mute / Unmute** toggle.

---

## 🛠️ Quick Start & Local Preview

No build steps or dependencies required! Open `index.html` directly in any modern browser, or run a lightweight local server:

```bash
# Clone the repository
git clone https://github.com/varshithanidudhavolu/logimind-antigravity-wms.git

# Navigate to project directory
cd logimind-antigravity-wms

# Start local server (Python)
python -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 📁 File Structure

```
├── index.html               # Main SPA entry point (Landing screen, UI cockpits, Modals)
├── css/
│   └── styles.css           # Antigravity Dark Obsidian theme, glassmorphism & animations
└── js/
    ├── state.js             # Reactive central state store & seed mock database
    ├── audio.js             # Web Audio API sound synthesizer
    ├── landing.js           # Role selection & intro transition
    ├── simulator.js         # "What-If" Scenario Simulator & decision flowchart
    ├── dashboard.js         # Executive metrics, pipeline filter & orders queue
    ├── inventory.js         # 2D Zone heatmap & damage exception reporting
    ├── picking.js           # TSP route optimizer canvas, laser scanner & QC panel
    ├── dispatch.js          # Dock doors, carrier matrix & canvas signature POD
    ├── analytics.js         # Chart.js instances (Picking speed, Donut, SLA trend)
    ├── chatbot.js           # LogiBot AI floating operations co-pilot
    └── app.js               # Application coordinator, routing & toast manager
```

---

## 📄 License
MIT License. Created with Antigravity AI.
