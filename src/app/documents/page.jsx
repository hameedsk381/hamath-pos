'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';
import { 
  FileTextIcon, 
  PrinterIcon, 
  WhatsAppIcon, 
  PlusIcon, 
  SearchIcon, 
  UserIcon, 
  CalendarIcon 
} from '@/components/Icons';

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
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileTextIcon size={22} style={{ color: 'var(--primary-dark)' }} />
            Billing Documents & History
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
            బిల్లుల చరిత్ర • All Invoices and Estimates
          </div>
        </div>
        <Link href="/" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <PlusIcon size={14} /> New Bill Register
        </Link>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px', position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by invoice number, quotation ID, or customer name..."
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
          All ({invoices.length + quotations.length})
        </div>
        <div
          className={`cat-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
          style={{ cursor: 'pointer' }}
        >
          Tax Invoices ({invoices.length})
        </div>
        <div
          className={`cat-tab ${activeTab === 'quotations' ? 'active' : ''}`}
          onClick={() => setActiveTab('quotations')}
          style={{ cursor: 'pointer' }}
        >
          Quotations & Estimates ({quotations.length})
        </div>
      </div>

      {/* Document Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--slate-400)', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            No billing documents found.
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
                  <div className="doc-amount" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {documentGenerator.formatCurrency(doc.total)}
                  </div>
                </div>

                <div className="doc-meta-row" style={{ display: 'flex', gap: '16px', color: 'var(--slate-500)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserIcon size={13} style={{ color: 'var(--slate-400)' }} />
                    <strong style={{ color: 'var(--slate-800)' }}>{cust}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CalendarIcon size={13} style={{ color: 'var(--slate-400)' }} />
                    <span>{doc.date}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isConverted ? '#16a34a' : (isInvoice ? '#16a34a' : '#d97706') }}>
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
                        Convert to Invoice
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 8px' }}
                      title="Print Document"
                      onClick={() => documentGenerator.printDocument(doc, isInvoice)}
                    >
                      <PrinterIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 8px', color: '#16a34a' }}
                      title="Share via WhatsApp"
                      onClick={() => documentGenerator.shareOnWhatsApp(doc, isInvoice)}
                    >
                      <WhatsAppIcon size={14} />
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
