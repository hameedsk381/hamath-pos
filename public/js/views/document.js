/**
 * Maatlaadi Bill - Document Viewer View
 * High-fidelity quotation / invoice display, PDF export, Print & WhatsApp sharing
 */

window.DocumentView = {
  render(container, docId, docType = 'invoice') {
    let doc = null;
    const isInvoice = docType === 'invoice';

    if (isInvoice) {
      doc = window.Store.getInvoiceById(docId);
    } else {
      doc = window.Store.getQuotationById(docId);
    }

    if (!doc) {
      container.innerHTML = `
        <div class="view-container" style="text-align: center; padding: 40px 20px;">
          <h2>డాక్యుమెంట్ కనుగొనబడలేదు (Document Not Found)</h2>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.App.navigateTo('documents')">
            పత్రాల జాబితాకు వెళ్లండి (Back to Documents)
          </button>
        </div>
      `;
      return;
    }

    const docHtml = window.DocumentGenerator.renderDocumentHtml(doc, isInvoice);

    container.innerHTML = `
      <div class="view-container">
        <!-- Top Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: gap; gap: 8px;">
          <button class="btn btn-outline btn-sm" onclick="window.App.navigateTo('documents')">
            ← పత్రాల జాబితా (Documents)
          </button>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" id="btn-print-doc">
              🖨️ ప్రింట్ (Print)
            </button>
            <button class="btn btn-outline btn-sm" id="btn-download-pdf">
              📥 PDF
            </button>
            <button class="btn btn-primary btn-sm" id="btn-whatsapp-share" style="background: #25d366; border-color: #25d366;">
              💬 WhatsApp
            </button>
          </div>
        </div>

        <!-- Convert to Invoice button for Quotations -->
        ${!isInvoice && doc.status !== 'converted_to_invoice' ? `
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: #1e40af; font-size: 14px;">కొటేషన్ నుండి ఇన్వాయిస్ రూపొందించండి</div>
              <div style="font-size: 11px; color: #3b82f6;">Convert this Quotation into a Tax Invoice</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-convert-invoice">
              ⚡ Convert to Invoice
            </button>
          </div>
        ` : ''}

        ${!isInvoice && doc.status === 'converted_to_invoice' ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #065f46; font-weight: 600;">
            ✓ ఈ కొటేషన్ ఇప్పటికే ఇన్వాయిస్‌గా మార్చబడింది.
          </div>
        ` : ''}

        <!-- Printable Document Render Frame -->
        <div style="box-shadow: var(--shadow-card); border-radius: 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border-color); background: #ffffff;">
          ${docHtml}
        </div>

        <!-- Bottom Actions -->
        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <button class="btn btn-outline btn-sm" onclick="window.App.navigateTo('home')">
            🎙️ కొత్త బిల్లు కోసం మాట్లాడండి (New Voice Bill)
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.App.duplicateDocument('${doc.id}', '${docType}')">
            📋 డూప్లికేట్ చేయండి (Duplicate)
          </button>
        </div>
      </div>
    `;

    this.bindEvents(container, doc, isInvoice);
  },

  bindEvents(container, doc, isInvoice) {
    const printBtn = container.querySelector('#btn-print-doc');
    const pdfBtn = container.querySelector('#btn-download-pdf');
    const whatsappBtn = container.querySelector('#btn-whatsapp-share');
    const convertBtn = container.querySelector('#btn-convert-invoice');

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.DocumentGenerator.printDocument(doc, isInvoice);
      });
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        window.DocumentGenerator.downloadPdf(doc, isInvoice);
      });
    }

    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', () => {
        window.DocumentGenerator.shareOnWhatsApp(doc, isInvoice);
      });
    }

    if (convertBtn) {
      convertBtn.addEventListener('click', () => {
        const invoice = window.Store.convertQuotationToInvoice(doc.id);
        if (invoice) {
          window.App.showToast('కొటేషన్ ఇన్వాయిస్‌గా విజయవంతంగా మార్చబడింది!', 'success');
          window.App.viewDocument(invoice.id, 'invoice');
        }
      });
    }
  }
};
