'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';
import { 
  UsersIcon, 
  SearchIcon, 
  PhoneIcon, 
  WhatsAppIcon, 
  PlusIcon, 
  EditIcon, 
  CheckCircleIcon, 
  AlertCircleIcon 
} from '@/components/Icons';

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
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <UsersIcon size={22} style={{ color: 'var(--primary-dark)' }} />
            Customer Directory & Khata
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
            కస్టమర్ల డైరెక్టరీ & ఖాటా • {filteredCustomers.length} registered accounts
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <PlusIcon size={15} /> Add Customer
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px', position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by customer name, Telugu name, phone number, or GSTIN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Customer Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 10px', color: 'var(--slate-400)', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            No customer accounts found matching search.
          </div>
        ) : (
          filteredCustomers.map(c => {
            const bal = c.current_balance || 0;
            return (
              <div key={c.id} className="doc-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-900)' }}>{c.name}</div>
                    {c.name_te && <div style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 600 }}>({c.name_te})</div>}
                    {bal > 0 ? (
                      <span className="stock-pill low" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircleIcon size={12} /> Due: {documentGenerator.formatCurrency(bal)}
                      </span>
                    ) : (
                      <span className="stock-pill in-stock" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircleIcon size={12} /> Clear (₹0 Due)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PhoneIcon size={13} style={{ color: 'var(--slate-400)' }} />
                    <span>{c.phone}</span>
                    {c.address && <span>• {c.address}</span>}
                  </div>
                  {c.gstin && <div style={{ fontSize: '11px', color: 'var(--primary-dark)', fontWeight: 600, marginTop: '2px' }}>GSTIN: {c.gstin}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Link
                    href={`/customer/${c.id}`}
                    className="btn btn-outline btn-sm"
                    style={{ fontWeight: 700, color: 'var(--primary-dark)', borderColor: 'var(--primary-border)', background: 'var(--primary-light)' }}
                  >
                    Khata Ledger
                  </Link>

                  {c.phone && (
                    <>
                      <a href={`tel:${c.phone}`} className="btn btn-outline btn-sm" style={{ padding: '6px 8px' }} title="Call Customer">
                        <PhoneIcon size={14} />
                      </a>
                      <a
                        href={`https://wa.me/91${c.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '6px 8px', color: '#16a34a' }}
                        title="WhatsApp Message"
                      >
                        <WhatsAppIcon size={14} />
                      </a>
                    </>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" style={{ padding: '6px 8px' }} onClick={() => openEditModal(c)} title="Edit Customer Details">
                    <EditIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Modal */}
      {modalOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label">Customer Name / పేరు *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Telugu Name / తెలుగు పేరు</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name_te}
                  onChange={(e) => setFormData({ ...formData, name_te: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Phone Number / మొబైల్ *</label>
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
                  <label className="form-label">Credit Limit (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Initial Balance Due (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.current_balance}
                    onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Address / చిరునామా</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">GSTIN (Optional)</label>
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
