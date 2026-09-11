'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

export default function DocumentDetailPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);
  const docId = unwrappedParams.id;
  const docType = searchParams.get('type') || 'invoice';

  const [doc, setDoc] = useState(null);
  const isInvoice = docType === 'invoice';

  const loadDoc = () => {
    let loaded = null;
    if (isInvoice) {
      loaded = store.getInvoiceById(docId);
    } else {
      loaded = store.getQuotationById(docId);
    }
    setDoc(loaded);
  };

  useEffect(() => {
    loadDoc();
  }, [docId, docType]);

  if (!doc) {
    return (
      <div className="view-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2>డాక్యుమెంట్ కనుగొనబడలేదు (Document Not Found)</h2>
        <Link href="/documents" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}>
          పత్రాల జాబితాకు వెళ్లండి (Back to Documents)
        </Link>
      </div>
    );
  }

  const handleConvert = () => {
    const saved = store.convertQuotationToInvoice(doc.id);
    if (saved) {
      router.push(`/document/${saved.id}?type=invoice`);
    }
  };

  const handleDuplicate = () => {
    const nextNum = isInvoice ? store.getNextInvoiceNumber() : store.getNextQuotationNumber();
    const duplicated = {
      ...doc,
      id: (isInvoice ? 'inv-' : 'qt-') + Date.now(),
      invoice_number: isInvoice ? nextNum : undefined,
      quotation_number: !isInvoice ? nextNum : undefined,
      date: new Date().toISOString().split('T')[0],
      status: isInvoice ? 'paid' : 'pending'
    };
    if (isInvoice) {
      store.saveInvoice(duplicated);
      router.push(`/document/${duplicated.id}?type=invoice`);
    } else {
      store.saveQuotation(duplicated);
      router.push(`/document/${duplicated.id}?type=quotation`);
    }
  };

  const docHtml = documentGenerator.renderDocumentHtml(doc, isInvoice);

  return (
    <div className="view-container">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <Link href="/documents" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
          ← పత్రాల జాబితా (Documents)
        </Link>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => documentGenerator.printDocument(doc, isInvoice)}
          >
            🖨️ ప్రింట్ (Print)
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => documentGenerator.downloadPdf(doc, isInvoice)}
          >
            📥 PDF
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: '#25d366', borderColor: '#25d366' }}
            onClick={() => documentGenerator.shareOnWhatsApp(doc, isInvoice)}
          >
            💬 WhatsApp
          </button>
        </div>
      </div>

      {/* Convert to Invoice action banner */}
      {!isInvoice && doc.status !== 'converted_to_invoice' && (
        <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '14px' }}>కొటేషన్ నుండి ఇన్వాయిస్ రూపొందించండి</div>
            <div style={{ fontSize: '11px', color: '#3b82f6' }}>Convert this Quotation into a Tax Invoice</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleConvert}>
            ⚡ Convert to Invoice
          </button>
        </div>
      )}

      {!isInvoice && doc.status === 'converted_to_invoice' && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
          ✓ ఈ కొటేషన్ ఇప్పటికే ఇన్వాయిస్‌గా మార్చబడింది.
        </div>
      )}

      {/* Printable Document Render Frame */}
      <div
        style={{ boxShadow: 'var(--shadow-card)', borderRadius: '12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-color)', background: '#ffffff' }}
        dangerouslySetInnerHTML={{ __html: docHtml }}
      />

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <Link href="/" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
          🎙️ కొత్త బిల్లు కోసం మాట్లాడండి (New Voice Bill)
        </Link>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleDuplicate}>
          📋 డూప్లికేట్ చేయండి (Duplicate)
        </button>
      </div>
    </div>
  );
}
