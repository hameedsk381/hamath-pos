'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function DashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    setInvoices(store.getInvoices());
    setQuotations(store.getQuotations());
    setCustomers(store.getCustomers());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(i => i.date === todayStr);
  const todaySales = todayInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const allSales = invoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const pendingQuotations = quotations.filter(q => q.status === 'pending');

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>వ్యాపార డ్యాష్‌బోర్డ్ (Dashboard)</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Link href="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          🎙️ మాట్లాడండి (Speak)
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="metric-label">ఈరోజు అమ్మకాలు (Today's Sales)</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>
            {documentGenerator.formatCurrency(todaySales || allSales)}
          </div>
          <div className="metric-sub">{todayInvoices.length || invoices.length} ఇన్వాయిస్‌లు</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div className="metric-label">పెండింగ్ కొటేషన్లు (Pending Quotes)</div>
          <div className="metric-value" style={{ color: 'var(--secondary)' }}>
            {pendingQuotations.length}
          </div>
          <div className="metric-sub">కొటేషన్లు వేచి ఉన్నాయి</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="metric-label">మొత్తం ఇన్వాయిస్‌లు (Total Bills)</div>
          <div className="metric-value">{invoices.length}</div>
          <div className="metric-sub">విజయవంతమైన బిల్లులు</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className="metric-label">కస్టమర్లు (Total Customers)</div>
          <div className="metric-value">{customers.length}</div>
          <div className="metric-sub">ఖాతాదారులు</div>
        </div>
      </div>

      {/* Quick Voice Start Banner */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', color: '#ffffff', borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px' }}>కొత్త బిల్లు సిద్ధం చేయాలా?</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>“మాట్లాడితే బిల్ రెడీ” - ఒక్క సెకనులో బిల్లు చేయండి.</div>
        </div>
        <Link href="/" className="btn btn-sm" style={{ background: '#ffffff', color: '#064e3b', fontWeight: 800, textDecoration: 'none' }}>
          🎙️ Start Voice
        </Link>
      </div>

      {/* Recent Documents Preview */}
      <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        ఇటీవలి లావాదేవీలు (Recent Transactions)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            ఇంకా ఎలాంటి బిల్లులు రూపొందించబడలేదు.
          </div>
        ) : (
          invoices.slice(0, 5).map(inv => (
            <div
              key={inv.id}
              className="doc-card"
              onClick={() => router.push(`/document/${inv.id}?type=invoice`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="doc-card-header">
                <div className="doc-number">
                  <span className="confirm-type-pill invoice" style={{ marginRight: '6px', fontSize: '10px' }}>INVOICE</span>
                  <strong>{inv.invoice_number}</strong>
                </div>
                <div className="doc-amount">{documentGenerator.formatCurrency(inv.total)}</div>
              </div>
              <div className="doc-meta-row">
                <div>👤 {inv.customer_name_snapshot || inv.customer_name || 'Retail'}</div>
                <div>📅 {inv.date} • <span style={{ color: '#059669', fontWeight: 700 }}>PAID</span></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
