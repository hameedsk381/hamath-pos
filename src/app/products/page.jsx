'use client';

import { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_te: '',
    category: 'Hardware',
    unit: 'pcs',
    unit_te: 'పీస్',
    selling_price: '',
    gst_percent: 18,
    aliases: ''
  });

  const categories = ['All', 'Cement', 'Paint', 'Electrical', 'Plumbing', 'Hardware', 'Grocery', 'Furniture'];

  const reloadProducts = () => {
    setProducts(store.getProducts());
  };

  useEffect(() => {
    reloadProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.name_te && p.name_te.toLowerCase().includes(q)) ||
      (p.aliases && p.aliases.some(a => a.toLowerCase().includes(q)));
    return matchesCat && matchesSearch;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      name_te: '',
      category: 'Hardware',
      unit: 'pcs',
      unit_te: 'పీస్',
      selling_price: '',
      gst_percent: 18,
      aliases: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      name_te: p.name_te || '',
      category: p.category || 'Hardware',
      unit: p.unit || 'pcs',
      unit_te: p.unit_te || 'పీస్',
      selling_price: p.selling_price || '',
      gst_percent: p.gst_percent !== undefined ? p.gst_percent : 18,
      aliases: (p.aliases || []).join(', ')
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const cleanAliases = formData.aliases
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const productPayload = {
      name: formData.name.trim(),
      name_te: formData.name_te.trim(),
      category: formData.category,
      unit: formData.unit.trim(),
      unit_te: formData.unit_te.trim(),
      selling_price: parseFloat(formData.selling_price) || 0,
      gst_percent: parseFloat(formData.gst_percent) || 0,
      aliases: cleanAliases
    };

    if (editingProduct) {
      store.updateProduct(editingProduct.id, productPayload);
    } else {
      store.addProduct(productPayload);
    }

    setModalOpen(false);
    reloadProducts();
  };

  const handleDelete = (id) => {
    if (confirm('ఈ వస్తువును కేటలాగ్ నుండి తొలగించాలనుకుంటున్నారా?')) {
      store.deleteProduct(id);
      reloadProducts();
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>ఉత్పత్తుల కేటలాగ్ (Products)</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{filteredProducts.length} ఉత్పత్తులు అందుబాటులో ఉన్నాయి</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          + కొత్త వస్తువు (Add Product)
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 ఉత్పత్తి పేరు లేదా అలియాస్ వెతకండి..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <div
            key={cat}
            className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            style={{ cursor: 'pointer' }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Products List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
            ఉత్పత్తులు ఏవీ కనుగొనబడలేదు.
          </div>
        ) : (
          filteredProducts.map(p => (
            <div key={p.id} className="doc-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{p.name_te}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>{p.category}</span>
                  • యూనిట్: <strong>{p.unit}</strong> ({p.unit_te || p.unit})
                  • GST: <strong>{p.gst_percent}%</strong>
                  • SKU: {p.sku || '-'}
                </div>
                {p.aliases && p.aliases.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                    🗣️ Aliases: {p.aliases.slice(0, 4).join(', ')}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                  {documentGenerator.formatCurrency(p.selling_price)}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditModal(p)}>✏️</button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingProduct ? 'వస్తువు వివరాలు సవరించండి' : 'కొత్త వస్తువును చేర్చండి'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">పేరు / English Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">తెలుగు పేరు / Telugu Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name_te}
                  onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">వర్గం / Category</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">యూనిట్ / Unit</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="kg, bag, pcs, box"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">ధర / Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">GST శాతం (%)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={formData.gst_percent}
                    onChange={(e) => setFormData({ ...formData, gst_percent: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">వాయిస్ అలియాస్లు / Spoken Aliases (కామాలతో)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ఉదా: సిమెంట్, cement, cement bag"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>
                  రద్దు చేయి
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  భద్రపరచు (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
