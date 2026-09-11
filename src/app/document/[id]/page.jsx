'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';
import { 
  PrinterIcon, 
  WhatsAppIcon, 
  FileTextIcon, 
  RefreshCwIcon, 
  CheckCircleIcon,
  MicIcon 
} from '@/components/Icons';

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
      <div className="view-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: 'var(--slate-800)' }}>Document Not Found</h2>
        <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '4px' }}>పత్రం కనుగొనబడలేదు</div>
        <Link href="/documents" className="btn btn-primary btn-sm" style={{ marginTop: '16px', display: 'inline-flex', textDecoration: 'none' }}>
          Back to Documents List
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
        <Link href="/documents" className="btn btn-outline btn-sm" style={{ textDecoration: 'none', color: 'var(--slate-600)' }}>
          ← Back to Documents
        </Link>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => documentGenerator.printDocument(doc, isInvoice)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PrinterIcon size={14} /> Print
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => documentGenerator.downloadPdf(doc, isInvoice)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileTextIcon size={14} /> Download PDF
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: '#16a34a', borderColor: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => documentGenerator.shareOnWhatsApp(doc, isInvoice)}
          >
            <WhatsAppIcon size={14} /> Share WhatsApp
          </button>
        </div>
      </div>

      {/* Convert to Invoice action banner */}
      {!isInvoice && doc.status !== 'converted_to_invoice' && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '13px' }}>Convert Quotation to Tax Invoice</div>
            <div style={{ fontSize: '11px', color: '#3b82f6' }}>ఈ కొటేషన్‌ను వెంటనే ఇన్వాయిస్‌గా మార్చండి</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleConvert}>
            Convert to Invoice
          </button>
        </div>
      )}

      {!isInvoice && doc.status === 'converted_to_invoice' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircleIcon size={16} /> This quotation has already been converted to an active Tax Invoice.
        </div>
      )}

      {/* Printable Document Render Frame */}
      <div
        style={{ boxShadow: 'var(--shadow-xs)', borderRadius: 'var(--radius-lg)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-subtle)', background: '#ffffff' }}
        dangerouslySetInnerHTML={{ __html: docHtml }}
      />

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <Link href="/" className="btn btn-outline btn-sm" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <MicIcon size={14} /> New Voice Register Bill
        </Link>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleDuplicate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCwIcon size={13} /> Duplicate Document
        </button>
      </div>
    </div>
  );
}
