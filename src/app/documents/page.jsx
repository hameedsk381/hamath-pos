'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function DocumentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);

  const reload = () => {
    setInvoices(store.getInvoices().map(i => ({ ...i, docType: 'invoice' })));
    setQuotations(store.getQuotations().map(q => ({ ...q, docType: 'quotation' })));
  };

  useEffect(() => {
    reload();
  }, []);

  let list = [];
  if (activeTab === 'all') {
    list = [...invoices, ...quotations].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  } else if (activeTab === 'quotations') {
    list = quotations.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  } else {
    list = invoices.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(doc => {
      const num = (doc.invoice_number || doc.quotation_number || '').toLowerCase();
      const cust = (doc.customer_name_snapshot || doc.customer_name || '').toLowerCase();
      return num.includes(q) || cust.includes(q);
    });
  }

  const quickConvert = (quotationId) => {
    const saved = store.convertQuotationToInvoice(quotationId);
    if (saved) {
      reload();
      router.push(`/document/${saved.id}?type=invoice`);
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>బిల్లుల చరిత్ర (Documents)</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>అన్ని ఇన్వాయిస్‌లు మరియు కొటేషన్లు</div>
        </div>
        <Link href="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          🎙️ కొత్త బిల్లు (New Bill)
        </Link>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 బిల్ నంబర్ లేదా కస్టమర్ పేరు వెతకండి..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="category-tabs">
        <div
          className={`cat-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
          style={{ cursor: 'pointer' }}
        >
          అన్నీ / All ({invoices.length + quotations.length})
        </div>
        <div
          className={`cat-tab ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
          style={{ cursor: 'pointer' }}
        >
          కొటేషన్లు / Quotations ({quotations.length})
        </div>
        <div
          className={`cat-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
          style={{ cursor: 'pointer' }}
        >
          ఇన్వాయిస్‌లు / Invoices ({invoices.length})
        </div>
      </div>

      {/* Document Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
            పత్రాలు ఏవీ కనుగొనబడలేదు.
          </div>
        ) : (
          list.map(doc => {
            const isInvoice = doc.docType === 'invoice';
            const num = isInvoice ? doc.invoice_number : doc.quotation_number;
            const cust = doc.customer_name_snapshot || doc.customer_name || 'Cash Customer';
            const status = doc.status || (isInvoice ? 'PAID' : 'PENDING');
            const isConverted = doc.status === 'converted_to_invoice';

            return (
              <div
                key={doc.id}
                className="doc-card"
                onClick={() => router.push(`/document/${doc.id}?type=${doc.docType}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="doc-card-header">
                  <div className="doc-number">
                    <span className={`confirm-type-pill ${doc.docType}`} style={{ marginRight: '6px', fontSize: '10px' }}>
                      {doc.docType}
                    </span>
                    <strong>{num}</strong>
                  </div>
                  <div className="doc-amount">
                    {documentGenerator.formatCurrency(doc.total)}
                  </div>
                </div>

                <div className="doc-meta-row">
                  <div>👤 <strong>{cust}</strong></div>
                  <div>📅 {doc.date}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: isConverted ? '#059669' : (isInvoice ? '#059669' : '#d97706') }}>
                    ● {isConverted ? 'CONVERTED TO INVOICE' : status}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                    {!isInvoice && !isConverted && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => quickConvert(doc.id)}
                      >
                        ⚡ Invoice
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 8px' }}
                      title="Print"
                      onClick={() => documentGenerator.printDocument(doc, isInvoice)}
                    >
                      🖨️
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 8px', color: '#25d366' }}
                      title="WhatsApp"
                      onClick={() => documentGenerator.shareOnWhatsApp(doc, isInvoice)}
                    >
                      💬
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
