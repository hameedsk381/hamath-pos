'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';
import {
  MicIcon,
  CashIcon,
  QrCodeIcon,
  CreditCardIcon,
  AlertCircleIcon,
  PackageIcon,
  UsersIcon,
  FileTextIcon,
  BarChartIcon
} from '@/components/Icons';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)' }}>
            Business Overview & Analytics
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
            వ్యాపార విశ్లేషణలు • {new Date().toLocaleDateString('te-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <Link href="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          <MicIcon size={16} /> Open Voice Register
        </Link>
      </div>

      {/* Primary Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderTop: '3px solid var(--primary)' }}>
          <div className="metric-label">Today's Sales / నేటి అమ్మకాలు</div>
          <div className="metric-value">
            {documentGenerator.formatCurrency(todaySales || allSales)}
          </div>
          <div className="metric-sub">{todayInvoices.length || invoices.length} settled invoices</div>
        </div>

        <div className="metric-card" style={{ borderTop: '3px solid var(--accent-red)' }}>
          <div className="metric-label">Receivables / మార్కెట్ బాకీ</div>
          <div className="metric-value" style={{ color: 'var(--accent-red)' }}>
            {documentGenerator.formatCurrency(totalReceivables)}
          </div>
          <div className="metric-sub">{customers.filter(c => (c.current_balance || 0) > 0).length} customers with outstanding due</div>
        </div>

        <div className="metric-card" style={{ borderTop: '3px solid var(--accent-blue)' }}>
          <div className="metric-label">Stock Valuation / ఇన్వెంటరీ నిల్వ</div>
          <div className="metric-value">
            {documentGenerator.formatCurrency(totalStockValuation)}
          </div>
          <div className="metric-sub">{products.length} active inventory items</div>
        </div>

        <div className="metric-card" style={{ borderTop: '3px solid var(--accent-amber)' }}>
          <div className="metric-label">Low Stock Reorders / తక్కువ నిల్వ</div>
          <div className="metric-value" style={{ color: lowStockProducts.length > 0 ? 'var(--accent-amber)' : 'var(--primary)' }}>
            {lowStockProducts.length}
          </div>
          <div className="metric-sub">{lowStockProducts.length > 0 ? 'Items below reorder limit' : 'All items optimal'}</div>
        </div>
      </div>

      {/* Payment Modes Breakdown Bar */}
      <div className="console-card" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '12px' }}>
          Settlement Channels / చెల్లింపు నివేదిక
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: '#ffffff', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CashIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>Cash Sales</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>{documentGenerator.formatCurrency(cashSales)}</div>
            </div>
          </div>

          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: '#ffffff', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <QrCodeIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>Bharat UPI / QR</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>{documentGenerator.formatCurrency(upiSales)}</div>
            </div>
          </div>

          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: '#ffffff', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <CreditCardIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', fontWeight: 600 }}>Udhaar / Credit</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>{documentGenerator.formatCurrency(creditSales)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Reorder Strip */}
      {lowStockProducts.length > 0 && (
        <div style={{ background: 'var(--accent-amber-light)', border: '1px solid var(--accent-amber-border)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircleIcon size={16} />
              <span>Inventory Threshold Reorder Alert (తక్కువ స్టాక్ ఉన్న వస్తువులు)</span>
            </div>
            <Link href="/products" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 700, textDecoration: 'none' }}>
              Manage Catalogue →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {lowStockProducts.slice(0, 6).map(p => (
              <span key={p.id} style={{ background: '#ffffff', border: '1px solid var(--accent-amber-border)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: 'var(--slate-800)', fontWeight: 600 }}>
                {p.name}: <strong style={{ color: 'var(--accent-red)' }}>{p.current_stock || 0} {p.unit}</strong> remaining
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices Ledger Table */}
      <div className="console-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            Recent Register Transactions / ఇటీవలి బిల్లులు
          </div>
          <Link href="/documents" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            View All Documents →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--slate-400)', fontSize: '13px' }}>
              No transactions recorded yet.
            </div>
          ) : (
            invoices.slice(0, 6).map(inv => (
              <div
                key={inv.id}
                className="doc-card"
                onClick={() => router.push(`/document/${inv.id}?type=invoice`)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--slate-100)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: '4px', color: 'var(--slate-700)' }}>
                      INVOICE
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--slate-900)' }}>{inv.invoice_number}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>• {inv.customer_name_snapshot || inv.customer_name || 'Retail Customer'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px' }}>
                    Date: {inv.date} • Mode: <span style={{ fontWeight: 700, color: inv.payment_mode === 'credit' ? 'var(--accent-amber)' : 'var(--primary)' }}>{(inv.payment_mode || 'cash').toUpperCase()}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                    {documentGenerator.formatCurrency(inv.total)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
