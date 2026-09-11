/**
 * Maatlaadi Bill - Document Print, PDF & WhatsApp Sharing Utility (Next.js)
 * Generates high-fidelity printable bills, thermal slips, and WhatsApp sharing links
 */

import { store } from './store';

export class DocumentGenerator {
  constructor(customStore = null) {
    this.store = customStore || store;
  }

  formatCurrency(num) {
    const val = parseFloat(num) || 0;
    return '₹' + val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getUpiQrUrl(amount, invoiceNumber) {
    const biz = this.store.getBusiness();
    const upiId = biz.upi_id || '9849012345@ybl';
    const payeeName = biz.name || 'Store';
    const note = invoiceNumber ? `Bill-${invoiceNumber}` : 'Payment';
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${parseFloat(amount || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(upiUri)}`;
  }

  renderDocumentHtml(doc, isInvoice = true) {
    const biz = this.store.getBusiness();
    const docTitle = isInvoice ? 'టాక్స్ ఇన్వాయిస్ / TAX INVOICE' : 'కొటేషన్ / QUOTATION';
    const docNumber = isInvoice ? doc.invoice_number : doc.quotation_number;
    const isQuotation = !isInvoice;
    const upiQrUrl = this.getUpiQrUrl(doc.total, docNumber);

    // Customer balance context
    let customerBalance = 0;
    if (doc.customer_id) {
      const cust = this.store.getCustomer(doc.customer_id);
      if (cust) customerBalance = cust.current_balance || 0;
    }

    let itemsRows = '';
    (doc.items || []).forEach((item, index) => {
      itemsRows += `
        <tr>
          <td style="text-align: center; width: 40px; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${index + 1}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-weight: 600; color: #111827;">${item.product_name_snapshot || item.name}</div>
            ${item.product_name_te_snapshot || item.name_te ? `<div style="font-size: 11px; color: #4b5563;">${item.product_name_te_snapshot || item.name_te}</div>` : ''}
          </td>
          <td style="text-align: center; color: #6b7280; font-size: 11px; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${item.hsn_snapshot || item.hsn_code || '-'}</td>
          <td style="text-align: right; font-weight: 600; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${item.quantity} <span style="font-size: 11px; font-weight: normal; color: #6b7280;">${item.unit}</span></td>
          <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${this.formatCurrency(item.unit_price)}</td>
          <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${item.gst_percent}%</td>
          <td style="text-align: right; font-weight: 700; padding: 10px 8px; border-bottom: 1px solid #f1f5f9;">${this.formatCurrency(item.line_total)}</td>
        </tr>
      `;
    });

    return `
      <div class="print-document" id="printable-doc" style="background: #fff; padding: 24px; font-family: 'Inter', 'Noto Sans Telugu', sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 22px; font-weight: 800; color: #065f46; margin: 0 0 4px 0;">${biz.name}</h1>
            <div style="font-size: 14px; font-weight: 600; color: #047857; margin-bottom: 6px;">${biz.name_te}</div>
            <div style="font-size: 12px; color: #4b5563; line-height: 1.4;">
              ${biz.address}, ${biz.city} - ${biz.pincode}<br>
              <strong>ఫోన్ / Phone:</strong> ${biz.phone} | <strong>Email:</strong> ${biz.email}<br>
              <strong>GSTIN:</strong> ${biz.gstin}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="background: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 6px; border: 1px solid #a7f3d0;">
              ${docTitle}
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #111827;">${docNumber}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;"><strong>తేదీ / Date:</strong> ${doc.date}</div>
            ${isQuotation && doc.valid_until ? `<div style="font-size: 11px; color: #b45309; margin-top: 2px;"><strong>చెల్లుబాటు / Valid Until:</strong> ${doc.valid_until}</div>` : ''}
          </div>
        </div>

        <!-- Customer & Bill Meta -->
        <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; background: #f9fafb; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #f3f4f6;">
          <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">కస్టమర్ వివరాలు / Bill To:</div>
            <div style="font-size: 15px; font-weight: 700; color: #111827;">${doc.customer_name_snapshot || doc.customer_name || 'Cash Customer'}</div>
            ${doc.customer_phone_snapshot || doc.customer_phone ? `<div style="font-size: 12px; color: #4b5563;">ఫోన్ / Phone: ${doc.customer_phone_snapshot || doc.customer_phone}</div>` : ''}
            ${doc.customer_address_snapshot || doc.customer_address ? `<div style="font-size: 12px; color: #4b5563;">చిరునామా: ${doc.customer_address_snapshot || doc.customer_address}</div>` : ''}
            ${doc.customer_gstin_snapshot || doc.customer_gstin ? `<div style="font-size: 12px; color: #047857; font-weight: 600;">GSTIN: ${doc.customer_gstin_snapshot || doc.customer_gstin}</div>` : ''}
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 12px; color: #6b7280;">స్టేటస్ / Status: <strong style="color: ${doc.payment_mode === 'credit' ? '#b45309' : '#059669'}; text-transform: uppercase;">${doc.payment_mode === 'credit' ? 'బాకీ / CREDIT' : (doc.status || 'PAID')}</strong></div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">చెల్లింపు విధానం / Mode: <strong style="color: #111827;">${(doc.payment_mode || 'cash').toUpperCase()}</strong></div>
            ${customerBalance > 0 ? `
              <div style="margin-top: 6px; padding: 4px 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; display: inline-block;">
                <span style="font-size: 11px; color: #b91c1c; font-weight: 700;">ఖాతా బాకీ / Total Balance: ${this.formatCurrency(customerBalance)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Line Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <thead>
            <tr style="background: #f3f4f6; border-top: 1px solid #e5e7eb; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 10px 8px; text-align: center; width: 40px; color: #374151;">#</th>
              <th style="padding: 10px 8px; text-align: left; color: #374151;">వస్తువు పేరు / Description</th>
              <th style="padding: 10px 8px; text-align: center; color: #374151;">HSN</th>
              <th style="padding: 10px 8px; text-align: right; color: #374151;">పరిమాణం / Qty</th>
              <th style="padding: 10px 8px; text-align: right; color: #374151;">ధర / Rate</th>
              <th style="padding: 10px 8px; text-align: right; color: #374151;">GST%</th>
              <th style="padding: 10px 8px; text-align: right; color: #374151;">మొత్తం / Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Totals & Bank & Dynamic UPI QR Section -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <div>
            <div style="display: flex; gap: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px;">
              <div style="text-align: center; flex-shrink: 0;">
                <img src="${upiQrUrl}" alt="UPI QR Code" style="width: 96px; height: 96px; border-radius: 4px; border: 1px solid #86efac; display: block;" />
                <span style="font-size: 9px; font-weight: 700; color: #166534; display: block; margin-top: 4px;">SCAN & PAY UPI</span>
              </div>
              <div style="font-size: 11px; color: #166534; line-height: 1.5;">
                <div style="font-weight: 700; margin-bottom: 2px; font-size: 12px;">బ్యాంక్ & UPI వివరాలు:</div>
                <div><strong>UPI ID:</strong> <span style="font-family: monospace; font-weight: 700;">${biz.upi_id}</span></div>
                <div><strong>బ్యాంక్:</strong> ${biz.bank_name}</div>
                <div><strong>A/c:</strong> ${biz.bank_account_no}</div>
                <div><strong>IFSC:</strong> ${biz.bank_ifsc}</div>
              </div>
            </div>
            ${doc.notes ? `<div style="margin-top: 10px; font-size: 11px; color: #6b7280;"><strong>గమనిక / Notes:</strong> ${doc.notes}</div>` : ''}
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #4b5563;">
              <span>సబ్ టోటల్ / Subtotal:</span>
              <span style="font-weight: 600;">${this.formatCurrency(doc.subtotal)}</span>
            </div>
            ${doc.discount_amount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #b91c1c;">
                <span>డిస్కౌంట్ / Discount (${doc.discount_percent}%):</span>
                <span>-${this.formatCurrency(doc.discount_amount)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #4b5563;">
              <span>పన్ను పరిధి మొత్తం / Taxable:</span>
              <span>${this.formatCurrency(doc.taxable_amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #4b5563;">
              <span>GST మొత్తం / Total GST:</span>
              <span style="font-weight: 600;">${this.formatCurrency(doc.gst_amount)}</span>
            </div>
            ${doc.round_off ? `
              <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: #9ca3af;">
                <span>రౌండ్ ఆఫ్ / Round off:</span>
                <span>${doc.round_off > 0 ? '+' : ''}${this.formatCurrency(doc.round_off)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 17px; font-weight: 800; color: #065f46; border-top: 2px solid #059669; margin-top: 6px;">
              <span>మొత్తం / Grand Total:</span>
              <span>${this.formatCurrency(doc.total)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 28px; border-top: 1px dashed #d1d5db; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
            ధన్యవాదములు! మళ్లీ విచ్చేయండి. / Thank You! Visit Again.<br>
            <em>* This is a computer generated document powered by Maatlaadi Bill.</em>
          </div>
          <div style="text-align: center; font-size: 11px; color: #4b5563;">
            <div style="height: 36px;"></div>
            <div style="border-top: 1px solid #9ca3af; padding-top: 4px; min-width: 140px; font-weight: 600;">Authorized Signatory</div>
          </div>
        </div>
      </div>
    `;
  }

  renderThermalHtml(doc) {
    const biz = this.store.getBusiness();
    const upiQrUrl = this.getUpiQrUrl(doc.total, doc.invoice_number);

    let itemsRows = '';
    (doc.items || []).forEach((item, index) => {
      itemsRows += `
        <div style="margin-bottom: 6px; font-size: 12px; border-bottom: 1px dotted #e5e7eb; padding-bottom: 4px;">
          <div style="font-weight: 600; color: #111;">${index + 1}. ${item.product_name_snapshot || item.name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #4b5563; margin-top: 2px;">
            <span>${item.quantity} ${item.unit} x ${this.formatCurrency(item.unit_price)}</span>
            <span style="font-weight: 700; color: #111;">${this.formatCurrency(item.line_total)}</span>
          </div>
        </div>
      `;
    });

    return `
      <div style="width: 280px; margin: 0 auto; padding: 12px; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="font-size: 16px; font-weight: 900;">${biz.name}</div>
          <div style="font-size: 12px;">${biz.name_te}</div>
          <div style="font-size: 10px; margin-top: 2px;">${biz.city} | Ph: ${biz.phone}</div>
          <div style="font-size: 10px;">GSTIN: ${biz.gstin}</div>
        </div>

        <div style="font-size: 11px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px;">
          <div>Bill: <strong>${doc.invoice_number || 'RECEIPT'}</strong></div>
          <div>Date: ${doc.date}</div>
          <div>Customer: ${doc.customer_name_snapshot || doc.customer_name || 'Cash'}</div>
          <div>Mode: <strong>${(doc.payment_mode || 'Cash').toUpperCase()}</strong></div>
        </div>

        <div style="margin-bottom: 8px;">
          ${itemsRows}
        </div>

        <div style="border-top: 1px dashed #000; padding-top: 6px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>${this.formatCurrency(doc.subtotal)}</span></div>
          ${doc.discount_amount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>-${this.formatCurrency(doc.discount_amount)}</span></div>` : ''}
          <div style="display: flex; justify-content: space-between;"><span>GST:</span><span>${this.formatCurrency(doc.gst_amount)}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
            <span>TOTAL:</span>
            <span>${this.formatCurrency(doc.total)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
          <img src="${upiQrUrl}" alt="UPI QR" style="width: 110px; height: 110px; display: inline-block; margin: 0 auto;" />
          <div style="font-size: 10px; margin-top: 4px; font-weight: 700;">SCAN WITH ANY UPI APP</div>
          <div style="font-size: 9px; color: #555;">UPI: ${biz.upi_id}</div>
        </div>

        <div style="text-align: center; font-size: 10px; margin-top: 12px;">
          ధన్యవాదములు! Visit Again 🙏<br>
          <em>Maatlaadi Bill</em>
        </div>
      </div>
    `;
  }

  printDocument(doc, isInvoice = true) {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const docHtml = this.renderDocumentHtml(doc, isInvoice);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isInvoice ? 'Invoice' : 'Quotation'} - ${isInvoice ? doc.invoice_number : doc.quotation_number}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { margin: 0; padding: 20px; font-family: 'Inter', 'Noto Sans Telugu', sans-serif; }
            @media print {
              body { padding: 0; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${docHtml}
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
  }

  printThermal(doc) {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const docHtml = this.renderThermalHtml(doc);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${doc.invoice_number || 'Slip'}</title>
          <style>
            body { margin: 0; padding: 10px; font-family: monospace; }
            @media print {
              body { padding: 0; margin: 0; }
              @page { size: 80mm auto; margin: 2mm; }
            }
          </style>
        </head>
        <body>
          ${docHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  downloadPdf(doc, isInvoice = true) {
    this.printDocument(doc, isInvoice);
  }

  shareOnWhatsApp(doc, isInvoice = true) {
    if (typeof window === 'undefined') return;
    const biz = this.store.getBusiness();
    const docType = isInvoice ? 'టాక్స్ ఇన్వాయిస్ / Tax Invoice' : 'కొటేషన్ / Quotation';
    const docNum = isInvoice ? doc.invoice_number : doc.quotation_number;
    const custName = doc.customer_name_snapshot || doc.customer_name || 'Customer';

    let itemLines = '';
    (doc.items || []).forEach((item, idx) => {
      const name = item.product_name_snapshot || item.name;
      itemLines += `\n${idx + 1}. *${name}* - ${item.quantity} ${item.unit} @ ${this.formatCurrency(item.unit_price)}`;
    });

    const paymentInfo = doc.payment_mode === 'credit'
      ? '⚠️ *చెల్లింపు / Mode: బాకీ / Udhaar Khata*'
      : `✅ *చెల్లింపు / Mode: ${(doc.payment_mode || 'Cash').toUpperCase()}*`;

    const message =
`🧾 *${biz.name}*
${biz.name_te}
${biz.city} | Ph: ${biz.phone}
━━━━━━━━━━━━━━━━━━
📄 *${docType}*
🔢 నంబర్ / No: *${docNum}*
📅 తేదీ / Date: *${doc.date}*
👤 కస్టమర్ / To: *${custName}*
${paymentInfo}
━━━━━━━━━━━━━━━━━━
*వస్తువులు / Items:*${itemLines}
━━━━━━━━━━━━━━━━━━
💵 *సబ్ టోటల్ / Subtotal:* ${this.formatCurrency(doc.subtotal)}
${doc.discount_amount > 0 ? `🏷️ *డిస్కౌంట్ / Discount:* -${this.formatCurrency(doc.discount_amount)}\n` : ''}🏛️ *GST:* ${this.formatCurrency(doc.gst_amount)}
💰 *మొత్తం / Grand Total: ${this.formatCurrency(doc.total)}*
━━━━━━━━━━━━━━━━━━
📲 *UPI Payment Link:*
upi://pay?pa=${biz.upi_id}&pn=${encodeURIComponent(biz.name)}&am=${doc.total.toFixed(2)}&cu=INR
ID: \`${biz.upi_id}\`

ధన్యవాదములు! Visit Again 🙏
_Generated via Maatlaadi Bill - మాట్లాడితే బిల్ రెడీ_`;

    const encoded = encodeURIComponent(message);
    const phone = (doc.customer_phone_snapshot || doc.customer_phone || '').replace(/[^0-9]/g, '');

    const whatsappUrl = phone
      ? `https://wa.me/91${phone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  }
}

export const documentGenerator = new DocumentGenerator();
