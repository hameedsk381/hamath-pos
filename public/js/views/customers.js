/**
 * Maatlaadi Bill - Customer Directory Management View
 * Search, add/edit customers, phone and WhatsApp shortcuts
 */

window.CustomersView = {
  searchQuery: '',

  render(container) {
    let customers = window.Store.getCustomers();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.name_te && c.name_te.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
      );
    }

    container.innerHTML = `
      <div class="view-container">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">కస్టమర్ల డైరెక్టరీ (Customers)</h2>
            <div style="font-size: 12px; color: var(--text-secondary);">${customers.length} కస్టమర్లు నమోదు చేయబడ్డారు</div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-customer">
            + కొత్త కస్టమర్ (Add)
          </button>
        </div>

        <!-- Search Input -->
        <div style="margin-bottom: 14px;">
          <input type="text" id="customer-search-input" class="form-input" placeholder="🔍 కస్టమర్ పేరు లేదా ఫోన్ నంబర్ వెతకండి..." value="${this.searchQuery}">
        </div>

        <!-- Customer Cards List -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${customers.length === 0 ? `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
              కస్టమర్లు ఎవరూ కనుగొనబడలేదు.
            </div>
          ` : customers.map(c => `
            <div class="doc-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-weight: 700; font-size: 15px; color: var(--text-primary);">${c.name}</div>
                  ${c.name_te ? `<div style="font-size: 12px; color: var(--primary); font-weight: 600;">${c.name_te}</div>` : ''}
                  ${c.phone ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">📞 ${c.phone}</div>` : ''}
                  ${c.address ? `<div style="font-size: 11px; color: var(--text-muted);">📍 ${c.address}</div>` : ''}
                  ${c.gstin ? `<div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 2px;">GSTIN: ${c.gstin}</div>` : ''}
                </div>
                <div style="display: flex; gap: 6px;">
                  ${c.phone ? `
                    <a href="tel:${c.phone}" class="btn btn-outline btn-sm" style="padding: 4px 8px;" title="Call">📞</a>
                    <a href="https://wa.me/91${c.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-outline btn-sm" style="padding: 4px 8px; color: #25d366;" title="WhatsApp">💬</a>
                  ` : ''}
                  <button class="btn btn-outline btn-sm" style="padding: 4px 8px;" onclick="window.CustomersView.openEditModal('${c.id}')">✏️</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    const searchInput = container.querySelector('#customer-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(container);
        const newSearch = container.querySelector('#customer-search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      });
    }

    container.querySelector('#btn-add-customer').addEventListener('click', () => {
      this.openEditModal(null);
    });
  },

  openEditModal(customerId = null) {
    const isEdit = !!customerId;
    const cust = isEdit ? window.Store.getCustomerById(customerId) : {
      name: '',
      name_te: '',
      phone: '',
      address: '',
      gstin: '',
      city: 'Vijayawada',
      notes: ''
    };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">${isEdit ? 'కస్టమర్ సవరణ (Edit Customer)' : 'కొత్త కస్టమర్ (Add Customer)'}</div>
        <div class="modal-sub">కస్టమర్ పేరు, ఫోన్ నంబర్ మరియు GST వివరాలు నమోదు చేయండి</div>

        <form id="customer-form">
          <div class="form-group">
            <label class="form-label">కస్టమర్ పేరు (Name)*</label>
            <input type="text" id="c-name" class="form-input" required value="${cust.name}" placeholder="e.g. Ramesh / రమేష్">
          </div>

          <div class="form-group">
            <label class="form-label">తెలుగు పేరు (Telugu Name)</label>
            <input type="text" id="c-name-te" class="form-input" value="${cust.name_te || ''}" placeholder="e.g. రమేష్">
          </div>

          <div class="form-group">
            <label class="form-label">ఫోన్ నంబర్ (Phone)</label>
            <input type="tel" id="c-phone" class="form-input" value="${cust.phone || ''}" placeholder="10-digit mobile number">
          </div>

          <div class="form-group">
            <label class="form-label">చిరునామా (Address & City)</label>
            <input type="text" id="c-address" class="form-input" value="${cust.address || ''}" placeholder="e.g. గవర్నర్‌పేట, విజయవాడ">
          </div>

          <div class="form-group">
            <label class="form-label">GSTIN (Optional)</label>
            <input type="text" id="c-gstin" class="form-input" value="${cust.gstin || ''}" placeholder="37AAAAA0000A1Z5">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-backdrop').remove()">రద్దు (Cancel)</button>
            <button type="submit" class="btn btn-primary btn-sm">సేవ్ చేయండి (Save)</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#customer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedData = {
        name: modal.querySelector('#c-name').value.trim(),
        name_te: modal.querySelector('#c-name-te').value.trim(),
        phone: modal.querySelector('#c-phone').value.trim(),
        address: modal.querySelector('#c-address').value.trim(),
        gstin: modal.querySelector('#c-gstin').value.trim()
      };

      if (isEdit) {
        window.Store.updateCustomer(customerId, updatedData);
        window.App.showToast('కస్టమర్ వివరాలు నవీకరించబడ్డాయి!', 'success');
      } else {
        window.Store.addCustomer(updatedData);
        window.App.showToast('కొత్త కస్టమర్ విజయవంతంగా చేర్చబడ్డారు!', 'success');
      }

      modal.remove();
      this.render(document.getElementById('app-view-container'));
    });
  }
};
