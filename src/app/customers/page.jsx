'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    name_te: '',
    phone: '',
    address: '',
    gstin: '',
    city: 'Vijayawada',
    credit_limit: 10000,
    current_balance: 0,
    notes: ''
  });

  const reloadCustomers = () => {
    setCustomers(store.getCustomers());
  };

  useEffect(() => {
    reloadCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.name_te && c.name_te.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      name_te: '',
      phone: '',
      address: '',
      gstin: '',
      city: 'Vijayawada',
      credit_limit: 10000,
      current_balance: 0,
      notes: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      name_te: c.name_te || '',
      phone: c.phone || '',
      address: c.address || '',
      gstin: c.gstin || '',
      city: c.city || 'Vijayawada',
      credit_limit: c.credit_limit || 10000,
      current_balance: c.current_balance || 0,
      notes: c.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      name_te: formData.name_te.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      gstin: formData.gstin.trim(),
      city: formData.city.trim(),
      credit_limit: parseFloat(formData.credit_limit) || 10000,
      current_balance: parseFloat(formData.current_balance) || 0,
      notes: formData.notes.trim()
    };

    if (editingCustomer) {
      store.updateCustomer(editingCustomer.id, payload);
    } else {
      store.addCustomer(payload);
    }

    setModalOpen(false);
    reloadCustomers();
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>కస్టమర్ల డైరెక్టరీ & ఖాటా (Customers & Khata)</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{filteredCustomers.length} కస్టమర్లు నమోదు చేయబడ్డారు</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          + కొత్త కస్టమర్ (Add)
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 కస్టమర్ పేరు లేదా ఫోన్ నంబర్ వెతకండి..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Customer Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
            కస్టమర్లు ఎవరూ కనుగొనబడలేదు.
          </div>
        ) : (
          filteredCustomers.map(c => {
            const bal = c.current_balance || 0;
            return (
              <div key={c.id} className="doc-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{c.name}</div>
                    {c.name_te && <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>({c.name_te})</div>}
                    {bal > 0 ? (
                      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                        ⚠️ బాకీ: {documentGenerator.formatCurrency(bal)}
                      </span>
                    ) : (
                      <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                        ✓ క్లియర్ (₹0 Due)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📞 {c.phone} {c.address ? `• 📍 ${c.address}` : ''}
                  </div>
                  {c.gstin && <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>GSTIN: {c.gstin}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link
                    href={`/customer/${c.id}`}
                    className="btn btn-outline btn-sm"
                    style={{ fontWeight: 700, color: 'var(--primary)', borderColor: 'var(--primary-border)', background: 'var(--primary-light)' }}
                  >
                    📖 ఖాతా లెడ్జర్ (Khata)
                  </Link>

                  {c.phone && (
                    <>
                      <a href={`tel:${c.phone}`} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }} title="Call">📞</a>
                      <a
                        href={`https://wa.me/91${c.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', color: '#25d366' }}
                        title="WhatsApp"
                      >
                        💬
                      </a>
                    </>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }} onClick={() => openEditModal(c)}>
                    ✏️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Modal */}
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
                {editingCustomer ? 'కస్టమర్ వివరాలు సవరించండి' : 'కొత్త కస్టమర్‌ని చేర్చండి'}
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
                <label className="form-label">కస్టమర్ పేరు / Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">తెలుగు పేరు / Telugu Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name_te}
                  onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">ఫోన్ నంబర్ / Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="9849xxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">క్రెడిట్ పరిమితి (Limit ₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">ప్రారంభ బాకీ (Initial Due ₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">చిరునామా / Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="వీధి, ప్రాంతం"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">GSTIN (ఐచ్ఛికం)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="37AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
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
