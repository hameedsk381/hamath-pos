/**
 * Maatlaadi Bill - Product Catalogue Management View
 * Search, category tabs, and add/edit products with Telugu names & aliases
 */

window.ProductsView = {
  selectedCategory: 'All',
  searchQuery: '',

  render(container) {
    const categories = ['All', 'Cement', 'Paint', 'Electrical', 'Plumbing', 'Hardware', 'Grocery', 'Furniture'];
    let products = window.Store.getProducts();

    // Filter by category
    if (this.selectedCategory !== 'All') {
      products = products.filter(p => p.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.name_te.toLowerCase().includes(q) ||
        (p.aliases && p.aliases.some(a => a.toLowerCase().includes(q)))
      );
    }

    container.innerHTML = `
      <div class="view-container">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary);">ఉత్పత్తుల కేటలాగ్ (Products)</h2>
            <div style="font-size: 12px; color: var(--text-secondary);">${products.length} ఉత్పత్తులు అందుబాటులో ఉన్నాయి</div>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-add-product">
            + కొత్త వస్తువు (Add Product)
          </button>
        </div>

        <!-- Search Input -->
        <div style="margin-bottom: 12px;">
          <input type="text" id="product-search-input" class="form-input" placeholder="🔍 ఉత్పత్తి పేరు లేదా అలియాస్ వెతకండి..." value="${this.searchQuery}">
        </div>

        <!-- Category Filter Tabs -->
        <div class="category-tabs">
          ${categories.map(cat => `
            <div class="cat-tab ${this.selectedCategory === cat ? 'active' : ''}" data-cat="${cat}">
              ${cat}
            </div>
          `).join('')}
        </div>

        <!-- Products List -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${products.length === 0 ? `
            <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
              ఉత్పత్తులు ఏవీ కనుగొనబడలేదు.
            </div>
          ` : products.map(p => `
            <div class="doc-card" style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; font-size: 15px; color: var(--text-primary);">${p.name}</div>
                <div style="font-size: 12px; color: var(--primary); font-weight: 600;">${p.name_te}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                  <span style="background: var(--bg-subtle); padding: 2px 6px; border-radius: 4px;">${p.category}</span>
                  • యూనిట్: <strong>${p.unit}</strong> (${p.unit_te || p.unit})
                  • GST: <strong>${p.gst_percent}%</strong>
                  • SKU: ${p.sku || '-'}
                </div>
                ${p.aliases && p.aliases.length > 0 ? `
                  <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                    🗣️ Aliases: ${p.aliases.slice(0, 4).join(', ')}
                  </div>
                ` : ''}
              </div>
              <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
                <div style="font-size: 16px; font-weight: 800; color: var(--primary-dark);">
                  ${window.DocumentGenerator.formatCurrency(p.selling_price)}
                </div>
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                  <button class="btn btn-outline btn-sm" onclick="window.ProductsView.openEditModal('${p.id}')">✏️</button>
                  <button class="btn btn-danger-outline btn-sm" onclick="window.ProductsView.deleteProduct('${p.id}')">🗑️</button>
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
    // Search
    const searchInput = container.querySelector('#product-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(container);
        const newSearch = container.querySelector('#product-search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      });
    }

    // Category Tabs
    container.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedCategory = tab.getAttribute('data-cat');
        this.render(container);
      });
    });

    // Add Product Modal
    container.querySelector('#btn-add-product').addEventListener('click', () => {
      this.openEditModal(null);
    });
  },

  openEditModal(productId = null) {
    const isEdit = !!productId;
    const prod = isEdit ? window.Store.getProductById(productId) : {
      name: '',
      name_te: '',
      category: 'Hardware',
      unit: 'pcs',
      unit_te: 'పీస్',
      selling_price: 100,
      gst_percent: 18,
      sku: '',
      aliases: []
    };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">${isEdit ? 'ఉత్పత్తి సవరణ (Edit Product)' : 'కొత్త ఉత్పత్తి (Add Product)'}</div>
        <div class="modal-sub">తెలుగు మరియు ఇంగ్లీష్ పేర్లు, అలియాస్‌లు నమోదు చేయండి</div>

        <form id="product-form">
          <div class="form-group">
            <label class="form-label">ఉత్పత్తి పేరు (English Name)*</label>
            <input type="text" id="p-name" class="form-input" required value="${prod.name}" placeholder="e.g. UltraTech Cement 50kg">
          </div>

          <div class="form-group">
            <label class="form-label">తెలుగు పేరు (Telugu Name)*</label>
            <input type="text" id="p-name-te" class="form-input" required value="${prod.name_te}" placeholder="e.g. అల్ట్రాటెక్ సిమెంట్ 50 కేజీ">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">కేటగిరీ (Category)</label>
              <select id="p-category" class="form-select">
                ${['Cement', 'Paint', 'Electrical', 'Plumbing', 'Hardware', 'Grocery', 'Furniture'].map(c => `
                  <option value="${c}" ${prod.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">యూనిట్ (Unit)</label>
              <select id="p-unit" class="form-select">
                ${['bag', 'kg', 'pcs', 'litre', 'box', 'pair', 'coil', 'bucket'].map(u => `
                  <option value="${u}" ${prod.unit === u ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">ధర / Selling Price (₹)*</label>
              <input type="number" id="p-price" class="form-input" required value="${prod.selling_price}">
            </div>
            <div class="form-group">
              <label class="form-label">GST శాతం (%)</label>
              <input type="number" id="p-gst" class="form-input" value="${prod.gst_percent}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">వాయిస్ అలియాస్‌లు (Voice Aliases - Comma separated)</label>
            <input type="text" id="p-aliases" class="form-input" value="${(prod.aliases || []).join(', ')}" placeholder="సిమెంట్, cement, ultratech">
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
              ఈ పేర్లను వినియోగదారుడు మాట్లాడినప్పుడు AI ఈ వస్తువును గుర్తిస్తుంది.
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-backdrop').remove()">రద్దు (Cancel)</button>
            <button type="submit" class="btn btn-primary btn-sm">సేవ్ చేయండి (Save)</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedData = {
        name: modal.querySelector('#p-name').value.trim(),
        name_te: modal.querySelector('#p-name-te').value.trim(),
        category: modal.querySelector('#p-category').value,
        unit: modal.querySelector('#p-unit').value,
        selling_price: parseFloat(modal.querySelector('#p-price').value) || 0,
        gst_percent: parseFloat(modal.querySelector('#p-gst').value) || 0,
        aliases: modal.querySelector('#p-aliases').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      };

      if (isEdit) {
        window.Store.updateProduct(productId, updatedData);
        window.App.showToast('ఉత్పత్తి నవీకరించబడింది!', 'success');
      } else {
        window.Store.addProduct(updatedData);
        window.App.showToast('కొత్త ఉత్పత్తి చేర్చబడింది!', 'success');
      }

      modal.remove();
      this.render(document.getElementById('app-view-container'));
    });
  },

  deleteProduct(id) {
    if (confirm('ఈ ఉత్పత్తిని తొలగించాలనుకుంటున్నారా?')) {
      window.Store.deleteProduct(id);
      window.App.showToast('ఉత్పత్తి తొలగించబడింది.', 'info');
      this.render(document.getElementById('app-view-container'));
    }
  }
};
