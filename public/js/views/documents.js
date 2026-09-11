/**
 * Maatlaadi Bill - Documents History View
 * Tabs: All | Quotations | Invoices, filters, and Convert to Invoice action
 */

window.DocumentsView = {
  activeTab: 'all', // 'all' | 'quotations' | 'invoices'
  searchQuery: '',

  render(container) {
    const invoices = window.Store.getInvoices().map(i => ({ ...i, docType: 'invoice' }));
    const quotations = window.Store.getQuotations().map(q => ({ ...q, docType: 'quotation' }));

    let list = [];
    if (this.activeTab === 'all') {
      list = [...invoices, ...quotations].sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (this.activeTab === 'quotations') {
      list = quotations.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      list = invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(doc => {
        const num = (doc.invoice_number || doc.quotation_number || '').toLowerCase();
        const cust = (doc.customer_name_snapshot || doc.customer_name || '').toLowerCase();
        return num.includes(q) || cust.includes(q);
      });
    }

    container.innerHTML = `
      <div class="view-container">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">బిల్లుల చరిత్ర (Documents)</h2>
            <div style="font-size: 12px; color: var(--text-secondary);">అన్ని ఇన్వాయిస్‌లు మరియు కొటేషన్లు</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.App.navigateTo('home')">
            🎙️ కొత్త బిల్లు (New Bill)
          </button>
        </div>

        <!-- Search Input -->
        <div style="margin-bottom: 12px;">
          <input type="text" id="doc-search-input" class="form-input" placeholder="🔍 బిల్ నంబర్ లేదా కస్టమర్ పేరు వెతకండి..." value="${this.searchQuery}">
        </div>

        <!-- Tabs: All | Quotations | Invoices -->
        <div class="category-tabs">
          <div class="cat-tab ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all">
            అన్నీ / All (${invoices.length + quotations.length})
          </div>
          <div class="cat-tab ${this.activeTab === 'quotations' ? 'active' : ''}" data-tab="quotations">
            కొటేషన్లు / Quotations (${quotations.length})
          </div>
          <div class="cat-tab ${this.activeTab === 'invoices' ? 'active' : ''}" data-tab="invoices">
            ఇన్వాయిస్‌లు / Invoices (${invoices.length})
          </div>
        </div>

        <!-- Document Cards List -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${list.length === 0 ? `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
              పత్రాలు ఏవీ కనుగొనబడలేదు.
            </div>
          ` : list.map(doc => {
            const isInvoice = doc.docType === 'invoice';
            const num = isInvoice ? doc.invoice_number : doc.quotation_number;
            const cust = doc.customer_name_snapshot || doc.customer_name || 'Cash Customer';
            const status = doc.status || (isInvoice ? 'PAID' : 'PENDING');
            const isConverted = doc.status === 'converted_to_invoice';

            return `
              <div class="doc-card" onclick="window.App.viewDocument('${doc.id}', '${doc.docType}')">
                <div class="doc-card-header">
                  <div class="doc-number">
                    <span class="confirm-type-pill ${doc.docType}" style="margin-right: 6px; font-size: 10px;">${doc.docType}</span>
                    <strong>${num}</strong>
                  </div>
                  <div class="doc-amount">
                    ${window.DocumentGenerator.formatCurrency(doc.total)}
                  </div>
                </div>

                <div class="doc-meta-row">
                  <div>👤 <strong>${cust}</strong></div>
                  <div>📅 ${doc.date}</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${isConverted ? '#059669' : (isInvoice ? '#059669' : '#d97706')};">
                    ● ${isConverted ? 'CONVERTED TO INVOICE' : status}
                  </div>

                  <div style="display: flex; gap: 6px;" onclick="event.stopPropagation();">
                    ${!isInvoice && !isConverted ? `
                      <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="window.DocumentsView.quickConvert('${doc.id}')">
                        ⚡ Convert to Invoice
                      </button>
                    ` : ''}
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="window.DocumentGenerator.printDocument(window.Store.${isInvoice ? 'getInvoiceById' : 'getQuotationById'}('${doc.id}'), ${isInvoice})">
                      🖨️
                    </button>
                    <button class="btn btn-outline btn-sm" style="padding: 4px 8px; color: #25d366;" onclick="window.DocumentGenerator.shareOnWhatsApp(window.Store.${isInvoice ? 'getInvoiceById' : 'getQuotationById'}('${doc.id}'), ${isInvoice})">
                      💬
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  quickConvert(quotationId) {
    const invoice = window.Store.convertQuotationToInvoice(quotationId);
    if (invoice) {
      window.App.showToast('కొటేషన్ ఇన్వాయిస్‌గా విజయవంతంగా మార్చబడింది!', 'success');
      this.render(document.getElementById('app-view-container'));
    }
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#doc-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(container);
        const newSearch = container.querySelector('#doc-search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      });
    }

    container.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.getAttribute('data-tab');
        this.render(container);
      });
    });
  }
};
