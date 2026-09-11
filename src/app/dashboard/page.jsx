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
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setInvoices(store.getInvoices());
    setQuotations(store.getQuotations());
    setCustomers(store.getCustomers());
    setProducts(store.getProducts());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(i => i.date === todayStr);
  const todaySales = todayInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const allSales = invoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const pendingQuotations = quotations.filter(q => q.status === 'pending');

  // Commercial Khata & Stock Metrics
  const totalReceivables = customers.reduce((sum, c) => sum + (parseFloat(c.current_balance) || 0), 0);
  const totalStockValuation = products.reduce((sum, p) => {
    const rate = p.cost_price > 0 ? p.cost_price : (p.selling_price * 0.85);
    return sum + ((p.current_stock || 0) * rate);
  }, 0);
  const lowStockProducts = products.filter(p => (p.current_stock || 0) <= (p.reorder_level || 5));

  // Payment Breakdown
  const cashSales = invoices.filter(i => (i.payment_mode || 'cash') === 'cash').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const upiSales = invoices.filter(i => i.payment_mode === 'upi').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
  const creditSales = invoices.filter(i => i.payment_mode === 'credit').reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>వ్యాపార డ్యాష్‌బోర్డ్ (Commercial Dashboard)</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Link href="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          🎙️ మాట్లాడండి (Speak)
        </Link>
      </div>

      {/* Primary Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="metric-label">ఈరోజు అమ్మకాలు (Today's Sales)</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>
            {documentGenerator.formatCurrency(todaySales || allSales)}
          </div>
          <div className="metric-sub">{todayInvoices.length || invoices.length} ఇన్వాయిస్‌లు</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #b91c1c' }}>
          <div className="metric-label">మార్కెట్ బాకీ బకాయిలు (Receivables / Udhaar)</div>
          <div className="metric-value" style={{ color: '#b91c1c' }}>
            {documentGenerator.formatCurrency(totalReceivables)}
          </div>
          <div className="metric-sub">{customers.filter(c => (c.current_balance || 0) > 0).length} కస్టమర్లు బాకీ ఉన్నారు</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="metric-label">స్టాక్ ఇన్వెంటరీ విలువ (Stock Valuation)</div>
          <div className="metric-value" style={{ color: '#0284c7' }}>
            {documentGenerator.formatCurrency(totalStockValuation)}
          </div>
          <div className="metric-sub">{products.length} కేటలాగ్ వస్తువులు</div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="metric-label">తక్కువ స్టాక్ హెచ్చరికలు (Low Stock Alerts)</div>
          <div className="metric-value" style={{ color: lowStockProducts.length > 0 ? '#b91c1c' : '#059669' }}>
            {lowStockProducts.length}
          </div>
          <div className="metric-sub">{lowStockProducts.length > 0 ? 'వెంటనే ఆర్డర్ చేయాలి' : 'స్టాక్ సరిపడా ఉంది'}</div>
        </div>
      </div>

      {/* Payment Modes Breakdown Bar */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px', boxShadow: 'var(--shadow-subtle)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>
          📊 చెల్లింపు విధానాల నివేదిక (Payment Breakdown):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>💵 నగదు (Cash)</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>{documentGenerator.formatCurrency(cashSales)}</div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>📲 UPI / QR</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>{documentGenerator.formatCurrency(upiSales)}</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700 }}>⚠️ బాకీ (Credit / Udhaar)</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>{documentGenerator.formatCurrency(creditSales)}</div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Strip (if any) */}
      {lowStockProducts.length > 0 && (
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>
              ⚠️ స్టాక్ తక్కువగా ఉన్న వస్తువులు (Reorder Required):
            </div>
            <Link href="/products" style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700, textDecoration: 'none' }}>
              అన్ని ఉత్పత్తులు చూడండి →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {lowStockProducts.slice(0, 5).map(p => (
              <span key={p.id} style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>
                {p.name} ({p.name_te}): <strong>{p.current_stock || 0} {p.unit}</strong> left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Voice Start Banner */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', color: '#ffffff', borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px' }}>కొత్త బిల్లు సిద్ధం చేయాలా?</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>“మాట్లాడితే బిల్ రెడీ” - డెస్క్‌టాప్ కౌంటర్‌లో లైవ్‌గా మాట్లాడి బిల్లు చేయండి.</div>
        </div>
        <Link href="/" className="btn btn-sm" style={{ background: '#ffffff', color: '#064e3b', fontWeight: 800, textDecoration: 'none' }}>
          🎙️ Start Voice Studio
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
                <div>
                  📅 {inv.date} • <span style={{ color: inv.payment_mode === 'credit' ? '#b45309' : '#059669', fontWeight: 700 }}>
                    {inv.payment_mode === 'credit' ? 'బాకీ (CREDIT)' : (inv.payment_mode || 'CASH').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
