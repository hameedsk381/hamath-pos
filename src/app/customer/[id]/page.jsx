'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { store } from '@/lib/store';
import { documentGenerator } from '@/lib/pdf-generator';

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
      showToast('దయచేసి చెల్లుబాటు అయ్యే మొత్తాన్ని నమోదు చేయండి.');
      return;
    }

    store.recordPayment({
      customerId: customer.id,
      amount: amount,
      paymentMode: paymentForm.payment_mode,
      reference: paymentForm.reference || `Rcpt-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || 'కస్టమర్ చెల్లింపు',
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

    showToast(`₹${amount.toLocaleString('en-IN')} చెల్లింపు విజయవంతంగా రికార్డ్ చేయబడింది!`);
    loadCustomerData();
  };

  const sendWhatsAppReminder = () => {
    if (!customer) return;
    const biz = store.getBusiness();
    const due = customer.current_balance || 0;
    const phone = (customer.phone || '').replace(/[^0-9]/g, '');

    const message =
`🙏 నమస్కారం *${customer.name}* గారు,

ఇది *${biz.name}* (${biz.city}) నుండి మీ ఖాతా బకాయి వివరాలు:

💰 *మొత్తం చెల్లించవలసిన బాకీ: ${documentGenerator.formatCurrency(due)}*
📅 తేదీ: ${new Date().toLocaleDateString('en-IN')}

దయచేసి క్రింది UPI లింక్ ద్వారా లేదా దుకాణం వద్ద చెల్లించగలరు:
📲 *UPI Payment Link:*
upi://pay?pa=${biz.upi_id}&pn=${encodeURIComponent(biz.name)}&am=${due.toFixed(2)}&cu=INR
UPI ID: \`${biz.upi_id}\`

ధన్యవాదములు! 🙏
_${biz.name} - ఫోన్: ${biz.phone}_`;

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
    ledgerEntries.forEach((row, idx) => {
      rowsHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px;">${row.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <strong>${row.type === 'invoice' ? 'ఇన్వాయిస్: ' + row.reference : 'చెల్లింపు రసీదు: ' + row.reference}</strong>
            <div style="font-size: 10px; color: #6b7280;">${row.description || ''} • ${row.mode.toUpperCase()}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #b91c1c; font-weight: 600;">
            ${row.debit > 0 ? documentGenerator.formatCurrency(row.debit) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">
            ${row.credit > 0 ? documentGenerator.formatCurrency(row.credit) : '-'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 800;">
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
            body { font-family: 'Inter', sans-serif; padding: 24px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; border-bottom: 2px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px;">
            <div>
              <h2 style="margin: 0; color: #065f46;">${biz.name}</h2>
              <div style="font-size: 12px; color: #4b5563;">${biz.city} | Ph: ${biz.phone} | UPI: ${biz.upi_id}</div>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0;">కస్టమర్ ఖాతా లెడ్జర్ (Khata Statement)</h3>
              <div style="font-size: 12px; color: #6b7280;">Date: ${new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div style="margin-top: 16px; background: #f9fafb; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between;">
            <div>
              <strong>కస్టమర్: ${customer.name}</strong> (${customer.name_te || ''})<br>
              ఫోన్: ${customer.phone} | చిరునామా: ${customer.address || '-'}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #6b7280;">ప్రస్తుత బకాయి (Current Due):</div>
              <div style="font-size: 20px; font-weight: 900; color: #b91c1c;">${documentGenerator.formatCurrency(customer.current_balance || 0)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 90px;">తేదీ (Date)</th>
                <th>వివరాలు (Particulars)</th>
                <th style="text-align: right;">బాకీ (+) Debit</th>
                <th style="text-align: right;">చెల్లింపు (-) Credit</th>
                <th style="text-align: right;">బకాయి (Balance)</th>
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
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
        <h3>కస్టమర్ కనుగొనబడలేదు</h3>
        <Link href="/customers" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
          ← కస్టమర్ల జాబితాకు వెళ్ళండి
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
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999
        }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* Back Breadcrumb */}
      <div style={{ marginBottom: '14px' }}>
        <Link href="/customers" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
          ← కస్టమర్ల డైరెక్టరీ (Customer Directory)
        </Link>
      </div>

      {/* Customer Header Card */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-subtle)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {customer.name}
              </h1>
              {customer.name_te && (
                <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 600 }}>
                  ({customer.name_te})
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              📞 <strong>{customer.phone}</strong> • 📍 {customer.address || 'చిరునామా లేదు'} {customer.city ? `• ${customer.city}` : ''}
            </div>
            {customer.gstin && (
              <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                GSTIN: {customer.gstin}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowPaymentModal(true)}
              style={{ fontWeight: 800 }}
            >
              + చెల్లింపు జమ చేయండి (Record Payment)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={sendWhatsAppReminder}
              style={{ background: '#25d366', borderColor: '#25d366', fontWeight: 700 }}
            >
              💬 WhatsApp రిమైండర్
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={printStatement}
              style={{ fontWeight: 700 }}
            >
              🖨️ స్టేట్‌మెంట్
            </button>
          </div>
        </div>

        {/* Khata Balance Hero Metric Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ background: currentBalance > 0 ? '#fef2f2' : '#ecfdf5', border: `1px solid ${currentBalance > 0 ? '#fecaca' : '#a7f3d0'}`, borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: currentBalance > 0 ? '#991b1b' : '#065f46', textTransform: 'uppercase' }}>
              మొత్తం బకాయి బాకీ (Net Balance Due)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: currentBalance > 0 ? '#b91c1c' : '#059669', marginTop: '4px' }}>
              {documentGenerator.formatCurrency(currentBalance)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {currentBalance > 0 ? 'కస్టమర్ చెల్లించాల్సిన మొత్తం' : 'బాకీ ఏమీ లేదు (Account Clear)'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <span>క్రెడిట్ పరిమితి (Credit Limit)</span>
              <span>{limitUsedPct}% Used</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {documentGenerator.formatCurrency(creditLimit)}
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${limitUsedPct}%`, height: '100%', background: limitUsedPct > 80 ? '#ef4444' : 'var(--primary)', borderRadius: '3px' }}></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              మొత్తం లావాదేవీలు (Total Transactions)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {ledgerEntries.length} రికార్డులు
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ఇన్వాయిస్‌లు & చెల్లింపులు
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Khata Ledger Table */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            📖 లెడ్జర్ లావాదేవీలు (Chronological Ledger)
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            అన్ని డెబిట్‌లు మరియు క్రెడిట్‌లు
          </span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
            ఈ కస్టమర్‌కి ఇప్పటివరకు ఎటువంటి క్రెడిట్ లావాదేవీలు నమోదు కాలేదు.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-color)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>తేదీ (Date)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>రకం / వివరాలు (Type & Notes)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>విధానం (Mode)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c' }}>కొనుగోలు (+) Debit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#059669' }}>చెల్లింపు (-) Credit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>నికర బకాయి (Balance)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {row.date}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {row.type === 'invoice' ? (
                          <span style={{ color: '#b45309' }}>🧾 ఇన్వాయిస్: {row.reference}</span>
                        ) : (
                          <span style={{ color: '#059669' }}>💳 రసీదు: {row.reference}</span>
                        )}
                      </div>
                      {row.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: row.mode === 'cash' ? '#f3f4f6' : (row.mode === 'upi' ? '#ecfdf5' : '#eff6ff'), color: 'var(--text-secondary)' }}>
                        {row.mode ? row.mode.toUpperCase() : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                      {row.debit > 0 ? `+${documentGenerator.formatCurrency(row.debit)}` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {row.credit > 0 ? `-${documentGenerator.formatCurrency(row.credit)}` : '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '14px', color: row.balance > 0 ? '#b91c1c' : '#059669' }}>
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
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                💳 కస్టమర్ చెల్లింపు నమోదు (Record Payment)
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                కస్టమర్: <strong>{customer.name}</strong> • ప్రస్తుత బాకీ: <strong style={{ color: '#b91c1c' }}>{documentGenerator.formatCurrency(currentBalance)}</strong>
              </div>

              <div>
                <label className="form-label">చెల్లించిన మొత్తం / Amount Received (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  className="form-input"
                  placeholder={`ఉదా: ${currentBalance}`}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">చెల్లింపు విధానం / Payment Mode</label>
                <select
                  className="form-input"
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                >
                  <option value="cash">💵 నగదు (Cash)</option>
                  <option value="upi">📲 UPI / Google Pay / PhonePe</option>
                  <option value="bank">🏛️ బ్యాంక్ ట్రాన్స్‌ఫర్ (NEFT / RTGS)</option>
                  <option value="cheque">📝 చెక్ (Cheque)</option>
                </select>
              </div>

              <div>
                <label className="form-label">తేదీ / Payment Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">రసీదు / UTR నంబర్ (Reference No)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="UPI Ref / Cheque No / Receipt No"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">గమనిక / Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="వివరాలు లేదా వ్యాఖ్యలు"
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
                  రద్దు చేయి
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  ✓ జమ చేయి (Save Receipt)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
