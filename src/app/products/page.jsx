'use client';

import { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Stock Inward Adjustment Modal State
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [selectedProductForInward, setSelectedProductForInward] = useState(null);
  const [inwardQty, setInwardQty] = useState('');
  const [inwardReason, setInwardReason] = useState('కొత్త స్టాక్ కొనుగోలు / Purchase Inward');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_te: '',
    category: 'Hardware',
    unit: 'pcs',
    unit_te: 'పీస్',
    selling_price: '',
    cost_price: '',
    current_stock: 0,
    reorder_level: 5,
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
    const matchesLowStock = !showLowStockOnly || (p.current_stock || 0) <= (p.reorder_level || 5);
    return matchesCat && matchesSearch && matchesLowStock;
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
      cost_price: '',
      current_stock: 50,
      reorder_level: 5,
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
      cost_price: p.cost_price || '',
      current_stock: p.current_stock !== undefined ? p.current_stock : 0,
      reorder_level: p.reorder_level !== undefined ? p.reorder_level : 5,
      gst_percent: p.gst_percent !== undefined ? p.gst_percent : 18,
      aliases: (p.aliases || []).join(', ')
    });
    setModalOpen(true);
  };

  const openInwardModal = (p) => {
    setSelectedProductForInward(p);
    setInwardQty('');
    setInwardReason('కొత్త స్టాక్ కొనుగోలు / Purchase Inward');
    setInwardModalOpen(true);
  };

  const handleInwardSubmit = (e) => {
    e.preventDefault();
    const delta = parseFloat(inwardQty);
    if (!delta || isNaN(delta)) return;
    if (selectedProductForInward) {
      store.adjustStock(selectedProductForInward.id, delta, inwardReason);
      setInwardModalOpen(false);
      reloadProducts();
    }
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
      cost_price: parseFloat(formData.cost_price) || 0,
      current_stock: parseFloat(formData.current_stock) || 0,
      reorder_level: parseFloat(formData.reorder_level) || 5,
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

      {/* Category Filter Tabs & Low Stock Toggle */}
      <div className="category-tabs" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categories.map(cat => (
          <div
            key={cat}
            className={`cat-tab ${selectedCategory === cat && !showLowStockOnly ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(cat);
              setShowLowStockOnly(false);
            }}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {cat}
          </div>
        ))}
        <div
          className={`cat-tab ${showLowStockOnly ? 'active' : ''}`}
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          style={{ cursor: 'pointer', whiteSpace: 'nowrap', borderColor: '#fca5a5', background: showLowStockOnly ? '#fef2f2' : '#fff5f5', color: '#b91c1c', fontWeight: 700 }}
        >
          ⚠️ తక్కువ స్టాక్ (Low Stock)
        </div>
      </div>

      {/* Products List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
            ఉత్పత్తులు ఏవీ కనుగొనబడలేదు.
          </div>
        ) : (
          filteredProducts.map(p => {
            const stock = p.current_stock !== undefined ? p.current_stock : 0;
            const reorder = p.reorder_level || 5;
            return (
              <div key={p.id} className="doc-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{p.name_te}</div>
                    {/* Stock Badge */}
                    {stock <= 0 ? (
                      <span className="stock-tag-pill out-stock">❌ నిండుకుంది (0 {p.unit})</span>
                    ) : stock <= reorder ? (
                      <span className="stock-tag-pill low-stock">⚠️ తక్కువ స్టాక్: {stock} {p.unit}</span>
                    ) : (
                      <span className="stock-tag-pill in-stock">✓ స్టాక్: {stock} {p.unit}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>{p.category}</span>
                    • యూనిట్: <strong>{p.unit}</strong> ({p.unit_te || p.unit})
                    • GST: <strong>{p.gst_percent}%</strong>
                    {p.cost_price > 0 && ` • కొనుగోలు: ₹${p.cost_price}`}
                  </div>
                  {p.aliases && p.aliases.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                      🗣️ Aliases: {p.aliases.slice(0, 4).join(', ')}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                    {documentGenerator.formatCurrency(p.selling_price)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--primary)', borderColor: 'var(--primary-border)', background: 'var(--primary-light)' }}
                      onClick={() => openInwardModal(p)}
                      title="Add or Adjust Stock"
                    >
                      + స్టాక్ ఇన్వర్డ్
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditModal(p)}>✏️</button>
                    <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stock Inward Adjustment Modal */}
      {inwardModalOpen && selectedProductForInward && (
        <div className="modal-backdrop-overlay" onClick={() => setInwardModalOpen(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                📦 స్టాక్ ఇన్వర్డ్ సర్దుబాటు (Stock Inward)
              </h3>
              <button
                type="button"
                onClick={() => setInwardModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                వస్తువు: <strong>{selectedProductForInward.name}</strong> ({selectedProductForInward.name_te})<br />
                ప్రస్తుత నిల్వ: <strong>{selectedProductForInward.current_stock || 0} {selectedProductForInward.unit}</strong>
              </div>

              <div>
                <label className="form-label">చేర్చాల్సిన పరిమాణం / Quantity to Add *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    className="form-input"
                    placeholder="ఉదా: 50"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                  />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedProductForInward.unit}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  (స్టాక్ తగ్గించడానికి నెగెటివ్ సంఖ్య నమోదు చేయవచ్చు: e.g. -5)
                </div>
              </div>

              <div>
                <label className="form-label">కారణం / రిఫరెన్స్ (Reason / PO / Invoice No)</label>
                <input
                  type="text"
                  className="form-input"
                  value={inwardReason}
                  onChange={(e) => setInwardReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setInwardModalOpen(false)}
                >
                  రద్దు చేయి
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  ✓ స్టాక్ అప్‌డేట్ చేయి
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal */}
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
            maxWidth: '520px',
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
                  <label className="form-label">అమ్మకపు ధర / Selling Price (₹) *</label>
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
                  <label className="form-label">కొనుగోలు ధర / Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="లాభం లెక్కింపు కోసం"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">ప్రస్తుత స్టాక్ / Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">రీ-ఆర్డర్ పరిమితి / Reorder Level</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  />
                </div>
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
