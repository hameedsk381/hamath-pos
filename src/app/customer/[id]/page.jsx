'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';
import { 
  PhoneIcon, 
  WhatsAppIcon, 
  PrinterIcon, 
  PlusIcon, 
  CheckCircleIcon, 
  UsersIcon, 
  FileTextIcon, 
  CashIcon, 
  CreditCardIcon,
  AlertCircleIcon 
} from '@/components/Icons';

export default function CustomerKhataPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'cash',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCustomerData = () => {
    if (!customerId) return;
    const cust = store.getCustomer(customerId);
    if (!cust) return;
    setCustomer(cust);
    const ledger = store.getCustomerLedger(customerId);
    setLedgerEntries(ledger);
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid payment amount.');
      return;
    }

    store.recordPayment({
      customerId: customer.id,
      amount: amount,
      paymentMode: paymentForm.payment_mode,
      reference: paymentForm.reference || `Rcpt-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || 'Customer ledger payment',
      date: paymentForm.date
    });

    setShowPaymentModal(false);
    setPaymentForm({
      amount: '',
      payment_mode: 'cash',
      reference: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });

    showToast(`₹${amount.toLocaleString('en-IN')} payment recorded successfully.`);
    loadCustomerData();
  };

  const sendWhatsAppReminder = () => {
    if (!customer) return;
    const biz = store.getBusiness();
    const due = customer.current_balance || 0;
    const phone = (customer.phone || '').replace(/[^0-9]/g, '');

    const message =
`🙏 Namaskaram *${customer.name}* garu,

This is from *${biz.name}* (${biz.city}) regarding your Khata ledger balance:

💰 *Total Outstanding Balance Due: ${documentGenerator.formatCurrency(due)}*
📅 Date: ${new Date().toLocaleDateString('en-IN')}

Kindly settle via UPI or at store counter:
📲 *UPI Payment Link:*
upi://pay?pa=${biz.upi_id}&pn=${encodeURIComponent(biz.name)}&am=${due.toFixed(2)}&cu=INR
UPI ID: \`${biz.upi_id}\`

Thank you! 🙏
_${biz.name} - Phone: ${biz.phone}_`;

    const encoded = encodeURIComponent(message);
    const url = phone ? `https://wa.me/91${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const printStatement = () => {
    if (typeof window === 'undefined' || !customer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const biz = store.getBusiness();
    let rowsHtml = '';
    ledgerEntries.forEach((row) => {
      rowsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${row.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
            <strong>${row.type === 'invoice' ? 'Invoice: ' + row.reference : 'Receipt: ' + row.reference}</strong>
            <div style="font-size: 10px; color: #64748b;">${row.description || ''} • ${row.mode.toUpperCase()}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #b91c1c; font-weight: 600;">
            ${row.debit > 0 ? documentGenerator.formatCurrency(row.debit) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #059669; font-weight: 600;">
            ${row.credit > 0 ? documentGenerator.formatCurrency(row.credit) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800;">
            ${documentGenerator.formatCurrency(row.balance)}
          </td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Khata Statement - ${customer.name}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 24px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f8fafc; padding: 8px; text-align: left; font-size: 11px; border-bottom: 2px solid #e2e8f0; color: #475569; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px;">
            <div>
              <h2 style="margin: 0; font-size: 20px;">${biz.name}</h2>
              <div style="font-size: 12px; color: #64748b;">${biz.address}, ${biz.city} • Ph: ${biz.phone}</div>
              ${biz.gstin ? `<div style="font-size: 11px; color: #64748b;">GSTIN: ${biz.gstin}</div>` : ''}
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; font-size: 16px; color: #0f172a;">CUSTOMER KHATA STATEMENT</h3>
              <div style="font-size: 11px; color: #64748b;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div style="margin-top: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; border: 1px solid #e2e8f0;">
            <div>
              <strong>Customer: ${customer.name}</strong> (${customer.name_te || ''})<br>
              Phone: ${customer.phone} | Address: ${customer.address || '-'}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b;">Current Outstanding Due:</div>
              <div style="font-size: 20px; font-weight: 800; color: #b91c1c;">${documentGenerator.formatCurrency(customer.current_balance || 0)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 90px;">Date</th>
                <th>Particulars</th>
                <th style="text-align: right;">Debit (+)</th>
                <th style="text-align: right;">Credit (-)</th>
                <th style="text-align: right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!customer) {
    return (
      <div className="view-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <UsersIcon size={36} style={{ color: 'var(--slate-400)' }} />
        </div>
        <h3 style={{ color: 'var(--slate-800)' }}>Customer Record Not Found</h3>
        <Link href="/customers" className="btn btn-primary btn-sm" style={{ marginTop: '12px', display: 'inline-flex' }}>
          Back to Customer Directory
        </Link>
      </div>
    );
  }

  const currentBalance = customer.current_balance || 0;
  const creditLimit = customer.credit_limit || 10000;
  const limitUsedPct = Math.min(100, Math.round((currentBalance / creditLimit) * 100));

  return (
    <div className="view-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--slate-900)',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircleIcon size={16} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Breadcrumb */}
      <div style={{ marginBottom: '14px' }}>
        <Link href="/customers" style={{ textDecoration: 'none', color: 'var(--slate-500)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          ← Back to Customer Directory
        </Link>
      </div>

      {/* Customer Header Card */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-xs)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {customer.name}
              </h1>
              {customer.name_te && (
                <span style={{ fontSize: '15px', color: 'var(--primary-dark)', fontWeight: 600 }}>
                  ({customer.name_te})
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneIcon size={14} style={{ color: 'var(--slate-400)' }} />
              <strong>{customer.phone}</strong>
              {customer.address && <span>• {customer.address}</span>}
              {customer.city && <span>• {customer.city}</span>}
            </div>
            {customer.gstin && (
              <div style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 600, marginTop: '2px' }}>
                GSTIN: {customer.gstin}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowPaymentModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={14} /> Record Payment
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={sendWhatsAppReminder}
              style={{ background: '#16a34a', borderColor: '#16a34a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <WhatsAppIcon size={15} /> WhatsApp Reminder
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={printStatement}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PrinterIcon size={15} /> Print Statement
            </button>
          </div>
        </div>

        {/* Khata Balance Hero Metric Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ background: currentBalance > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${currentBalance > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: currentBalance > 0 ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Outstanding Balance
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: currentBalance > 0 ? '#b91c1c' : '#16a34a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
              {documentGenerator.formatCurrency(currentBalance)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
              {currentBalance > 0 ? 'Payment pending from customer' : 'Account fully settled (Zero due)'}
            </div>
          </div>

          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Credit Limit</span>
              <span>{limitUsedPct}% Used</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
              {documentGenerator.formatCurrency(creditLimit)}
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--slate-200)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${limitUsedPct}%`, height: '100%', background: limitUsedPct > 80 ? '#ef4444' : 'var(--primary-dark)', borderRadius: '3px' }}></div>
            </div>
          </div>

          <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Ledger Entries
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
              {ledgerEntries.length} Records
            </div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px' }}>
              Invoices & Payment receipts
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Khata Ledger Table */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextIcon size={18} style={{ color: 'var(--slate-500)' }} />
            Ledger Transactions History
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
            Chronological audit of debits & credits
          </span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--slate-400)' }}>
            No ledger transactions recorded for this customer yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--slate-600)', fontSize: '12px' }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--slate-600)', fontSize: '12px' }}>Type & Details</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--slate-600)', fontSize: '12px' }}>Mode</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c', fontSize: '12px' }}>Debit (+)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontSize: '12px' }}>Credit (-)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--slate-900)', fontSize: '12px' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--slate-600)', fontSize: '12px' }}>
                      {row.date}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                        {row.type === 'invoice' ? (
                          <span style={{ color: 'var(--slate-800)' }}>Invoice #{row.reference}</span>
                        ) : (
                          <span style={{ color: '#16a34a' }}>Receipt #{row.reference}</span>
                        )}
                      </div>
                      {row.description && (
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: row.mode === 'cash' ? 'var(--slate-100)' : (row.mode === 'upi' ? '#f0fdf4' : '#eff6ff'), color: 'var(--slate-700)' }}>
                        {row.mode ? row.mode.toUpperCase() : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                      {row.debit > 0 ? `+${documentGenerator.formatCurrency(row.debit)}` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                      {row.credit > 0 ? `-${documentGenerator.formatCurrency(row.credit)}` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: row.balance > 0 ? '#b91c1c' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                      {documentGenerator.formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Settlement Modal */}
      {showPaymentModal && (
        <div className="modal-backdrop-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                Record Customer Payment
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--slate-50)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                Customer: <strong>{customer.name}</strong> • Outstanding Due: <strong style={{ color: '#b91c1c' }}>{documentGenerator.formatCurrency(currentBalance)}</strong>
              </div>

              <div>
                <label className="form-label">Amount Received / మొత్తం (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  className="form-input"
                  placeholder={`e.g. ${currentBalance}`}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Payment Mode / విధానం</label>
                <select
                  className="form-input"
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                >
                  <option value="cash">Cash (నగదు)</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="bank">Bank Transfer (NEFT / RTGS)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="form-label">Payment Date / తేదీ</label>
                <input
                  type="date"
                  className="form-input"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Receipt / UTR Reference No</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="UPI Ref / Cheque No / Receipt No"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Notes / గమనిక</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Payment notes or remarks"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
