/**
 * Maatlaadi Bill - Daily Business Dashboard View
 * Highlights key sales figures, invoice volume, pending quotations & customers
 */

window.DashboardView = {
  render(container) {
    const invoices = window.Store.getInvoices();
    const quotations = window.Store.getQuotations();
    const customers = window.Store.getCustomers();
    const todayStr = new Date().toISOString().split('T')[0];

    // Calculate metrics
    const todayInvoices = invoices.filter(i => i.date === todayStr);
    const todaySales = todayInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const allSales = invoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
    const pendingQuotations = quotations.filter(q => q.status === 'pending');

    container.innerHTML = `
      <div class="view-container">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">వ్యాపార డ్యాష్‌బోర్డ్ (Dashboard)</h2>
            <div style="font-size: 12px; color: var(--text-secondary);">${new Date().toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.App.navigateTo('home')">
            🎙️ మాట్లాడండి (Speak)
          </button>
        </div>

        <!-- Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card" style="border-left: 4px solid var(--primary);">
            <div class="metric-label">ఈరోజు అమ్మకాలు (Today's Sales)</div>
            <div class="metric-value" style="color: var(--primary);">${window.DocumentGenerator.formatCurrency(todaySales || allSales)}</div>
            <div class="metric-sub">${todayInvoices.length || invoices.length} ఇన్వాయిస్‌లు</div>
          </div>

          <div class="metric-card" style="border-left: 4px solid var(--secondary);">
            <div class="metric-label">పెండింగ్ కొటేషన్లు (Pending Quotes)</div>
            <div class="metric-value" style="color: var(--secondary);">${pendingQuotations.length}</div>
            <div class="metric-sub">కొటేషన్లు వేచి ఉన్నాయి</div>
          </div>

          <div class="metric-card" style="border-left: 4px solid #7c3aed;">
            <div class="metric-label">మొత్తం ఇన్వాయిస్‌లు (Total Bills)</div>
            <div class="metric-value">${invoices.length}</div>
            <div class="metric-sub">విజయవంతమైన బిల్లులు</div>
          </div>

          <div class="metric-card" style="border-left: 4px solid var(--accent-amber);">
            <div class="metric-label">కస్టమర్లు (Total Customers)</div>
            <div class="metric-value">${customers.length}</div>
            <div class="metric-sub">ఖాతాదారులు</div>
          </div>
        </div>

        <!-- Quick Voice Start Banner -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); color: #ffffff; border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 800; font-size: 16px;">కొత్త బిల్లు సిద్ధం చేయాలా?</div>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">“మాట్లాడితే బిల్ రెడీ” - ఒక్క సెకనులో బిల్లు చేయండి.</div>
          </div>
          <button class="btn btn-sm" style="background: #ffffff; color: #064e3b; font-weight: 800;" onclick="window.App.navigateTo('home')">
            🎙️ Start Voice
          </button>
        </div>

        <!-- Recent Documents Preview -->
        <div style="margin-bottom: 12px; font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
          ఇటీవలి లావాదేవీలు (Recent Transactions)
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${invoices.slice(0, 5).map(inv => `
            <div class="doc-card" onclick="window.App.viewDocument('${inv.id}', 'invoice')">
              <div class="doc-card-header">
                <div class="doc-number">
                  <span class="confirm-type-pill invoice" style="margin-right: 6px; font-size: 10px;">INVOICE</span>
                  <strong>${inv.invoice_number}</strong>
                </div>
                <div class="doc-amount">${window.DocumentGenerator.formatCurrency(inv.total)}</div>
              </div>
              <div class="doc-meta-row">
                <div>👤 ${inv.customer_name_snapshot || 'Retail'}</div>
                <div>📅 ${inv.date} • <span style="color: #059669; font-weight: 700;">PAID</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};
