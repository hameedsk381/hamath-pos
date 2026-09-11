'use client';

import { useState, useEffect } from 'react';
import { store } from '@/lib/store';

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
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>కస్టమర్ల డైరెక్టరీ (Customers)</h2>
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
          filteredCustomers.map(c => (
            <div key={c.id} className="doc-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{c.name}</div>
                  {c.name_te && <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{c.name_te}</div>}
                  {c.phone && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>📞 {c.phone}</div>}
                  {c.address && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {c.address}</div>}
                  {c.gstin && <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>GSTIN: {c.gstin}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
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
            </div>
          ))
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
