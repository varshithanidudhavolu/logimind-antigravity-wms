/**
 * LogiMind Antigravity WMS - Operational Analytics & Visual Intelligence
 */
class AnalyticsModule {
  constructor() {
    this.pickingSpeedChart = null;
    this.inventoryDonutChart = null;
    this.slaTrendChart = null;
  }

  init() {
    this.initCharts();

    // Re-render charts when inventory or orders update
    window.WMSState.subscribe((event, payload, state) => {
      if (['INVENTORY_UPDATED', 'ORDER_UPDATED', 'ORDER_DISPATCHED', 'VIEW_CHANGED'].includes(event)) {
        this.updateCharts();
      }
    });
  }

  initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet. Retrying in 200ms...');
      setTimeout(() => this.initCharts(), 200);
      return;
    }

    this.createPickingSpeedChart();
    this.createInventoryDonutChart();
    this.createSlaTrendChart();
  }

  createPickingSpeedChart() {
    const ctx = document.getElementById('chartPickingSpeed');
    if (!ctx) return;

    if (this.pickingSpeedChart) {
      this.pickingSpeedChart.destroy();
    }

    this.pickingSpeedChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Zone A (Elec)', 'Zone B (Fasteners)', 'Zone C (High-Val)', 'Zone D (Apparel)'],
        datasets: [{
          label: 'Current Pick Velocity (Items / Hr)',
          data: [142, 385, 48, 192],
          backgroundColor: [
            'rgba(6, 182, 212, 0.65)',
            'rgba(16, 185, 129, 0.65)',
            'rgba(139, 92, 246, 0.65)',
            'rgba(245, 158, 11, 0.65)'
          ],
          borderColor: [
            '#06b6d4',
            '#10b981',
            '#8b5cf6',
            '#f59e0b'
          ],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#06b6d4',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(51, 65, 85, 0.8)',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.2)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(51, 65, 85, 0.2)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  }

  createInventoryDonutChart() {
    const ctx = document.getElementById('chartInventoryDonut');
    if (!ctx) return;

    if (this.inventoryDonutChart) {
      this.inventoryDonutChart.destroy();
    }

    const skus = window.WMSState.data.skus;
    const countElec = skus.filter(s => s.category === 'Electronics').reduce((acc, s) => acc + s.onHand, 0);
    const countFast = skus.filter(s => s.category === 'Fasteners').reduce((acc, s) => acc + s.onHand, 0);
    const countHigh = skus.filter(s => s.category === 'High-Value').reduce((acc, s) => acc + s.onHand, 0);
    const countApp = skus.filter(s => s.category === 'Apparel').reduce((acc, s) => acc + s.onHand, 0);

    this.inventoryDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Electronics', 'Fasteners', 'High-Value', 'Apparel & ESD'],
        datasets: [{
          data: [countElec, countFast, countHigh, countApp],
          backgroundColor: [
            'rgba(6, 182, 212, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)'
          ],
          borderColor: '#0f172a',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(51, 65, 85, 0.8)',
            borderWidth: 1,
            padding: 10
          }
        }
      }
    });
  }

  createSlaTrendChart() {
    const ctx = document.getElementById('chartSlaTrend');
    if (!ctx) return;

    if (this.slaTrendChart) {
      this.slaTrendChart.destroy();
    }

    this.slaTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
        datasets: [
          {
            label: 'Actual Dispatch Lead Time (Mins)',
            data: [42, 38, 55, 48, 35, 32, 28],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#06b6d4',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'SLA Target Benchmark (60 mins)',
            data: [60, 60, 60, 60, 60, 60, 60],
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(51, 65, 85, 0.8)',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(51, 65, 85, 0.2)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(51, 65, 85, 0.2)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  }

  updateCharts() {
    if (this.inventoryDonutChart) {
      const skus = window.WMSState.data.skus;
      const countElec = skus.filter(s => s.category === 'Electronics').reduce((acc, s) => acc + s.onHand, 0);
      const countFast = skus.filter(s => s.category === 'Fasteners').reduce((acc, s) => acc + s.onHand, 0);
      const countHigh = skus.filter(s => s.category === 'High-Value').reduce((acc, s) => acc + s.onHand, 0);
      const countApp = skus.filter(s => s.category === 'Apparel').reduce((acc, s) => acc + s.onHand, 0);

      this.inventoryDonutChart.data.datasets[0].data = [countElec, countFast, countHigh, countApp];
      this.inventoryDonutChart.update();
    }
  }
}

window.analyticsModule = new AnalyticsModule();
