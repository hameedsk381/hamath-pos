/**
 * Maatlaadi Bill - Spoken Items List & Review View
 * Presents whatever the user spoke as an editable items list first.
 * Does NOT generate an invoice upfront until user reviews and clicks Generate.
 */

window.ConfirmView = {
  activeTransaction: null,
  metaResult: null,

  render(container, transaction, metaResult = {}) {
    this.activeTransaction = transaction;
    this.metaResult = metaResult;
    window.CurrentActiveTransaction = transaction;

    const tx = this.activeTransaction;
    const isQuotation = tx.document_type === 'quotation';
    const items = tx.items || [];

    container.innerHTML = `
      <div class="view-container">
        <!-- Top Back Navigation -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <button class="btn btn-outline btn-sm" onclick="window.App.navigateTo('home')">
            ← మైక్ వద్దకు (Back to Mic)
          </button>
          <div style="font-size: 12px; color: var(--text-secondary);">
            వస్తువులు: <strong>${items.length}</strong>
          </div>
        </div>

        <!-- Spoken Transcript Banner -->
        ${metaResult.transcript ? `
          <div style="background: var(--bg-subtle); border-left: 3px solid var(--primary); padding: 10px 14px; border-radius: 6px; font-size: 13px; color: var(--text-main); margin-bottom: 14px; line-height: 1.4;">
            🗣️ <strong>మీరు మాట్లాడినది:</strong> “${metaResult.transcript}”
          </div>
        ` : ''}

        <!-- Conversational Feedback (if any edit occurred) -->
        ${metaResult.feedback ? `
          <div style="background: #ecfdf5; border: 1px solid var(--primary-border); padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #065f46; margin-bottom: 14px; font-weight: 600;">
            ✓ ${metaResult.feedback}
          </div>
        ` : ''}

        <!-- Spoken Items List Card -->
        <div class="confirm-card">
          <div class="confirm-header">
            <div>
              <div class="confirm-title">📋 మాట్లాడిన వస్తువుల జాబితా (Items List)</div>
              <div style="font-size: 12px; color: var(--text-secondary);">వస్తువులు, పరిమాణాలు & ధరలను సరిచూసుకోండి</div>
            </div>
            <div class="confirm-type-pill ${tx.document_type}">
              ${isQuotation ? 'కొటేషన్ (Quotation)' : 'ఇన్వాయిస్ (Invoice)'}
            </div>
          </div>

          <!-- Customer Selection / Info -->
          <div class="customer-info-box" style="margin-bottom: 14px;">
            <div>
              <div class="customer-label">కస్టమర్ / Customer</div>
              <div class="customer-name-val">${tx.customer_name || 'Cash Customer / రిటైల్'}</div>
              ${tx.customer_phone ? `<div style="font-size: 11px; color: var(--text-secondary);">Ph: ${tx.customer_phone}</div>` : ''}
            </div>
            <button class="btn btn-outline btn-sm" id="btn-change-customer">
              మార్చు (Change)
            </button>
          </div>

          <!-- Spoken Items Responsive List -->
          <div class="spoken-items-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
            ${items.length === 0 ? `
              <div style="text-align: center; padding: 28px 14px; background: var(--bg-subtle); border-radius: 12px; color: var(--text-secondary);">
                వస్తువులు ఏవీ లేవు. క్రింద ఉన్న బటన్ ద్వారా జోడించండి.
              </div>
            ` : items.map((item, idx) => `
              <div class="spoken-item-card" style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 12px 14px; box-shadow: var(--shadow-subtle); display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s ease;">
                <!-- Row 1: Item Name (editable) & Line Total -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <div style="flex: 1;">
                    <input 
                      type="text" 
                      value="${item.name || ''}" 
                      placeholder="వస్తువు పేరు"
                      style="width: 100%; font-weight: 800; font-size: 15px; color: var(--text-primary); border: 1px solid transparent; background: transparent; padding: 2px 4px; border-radius: 4px; outline: none;"
                      onfocus="this.style.borderColor='var(--primary)'; this.style.background='var(--bg-main)';"
                      onblur="this.style.borderColor='transparent'; this.style.background='transparent';"
                      onchange="window.ConfirmView.updateItemName(${idx}, this.value)"
                    >
                    <div style="font-size: 11px; color: var(--text-muted); padding-left: 4px;">
                      యూనిట్: <strong>${item.unit || 'pcs'}</strong> ${item.gst_percent ? `| GST: ${item.gst_percent}%` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; white-space: nowrap;">
                    <div style="font-size: 17px; font-weight: 900; color: var(--primary);">
                      ${window.DocumentGenerator.formatCurrency(item.line_total)}
                    </div>
                  </div>
                </div>

                <!-- Row 2: Stepper, Rate, Delete -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 8px; flex-wrap: wrap; gap: 8px;">
                  <!-- Qty Stepper -->
                  <div class="qty-stepper">
                    <button type="button" class="stepper-btn" onclick="window.ConfirmView.updateItemQty(${idx}, -1)">-</button>
                    <span class="stepper-val">${item.quantity} ${item.unit || ''}</span>
                    <button type="button" class="stepper-btn" onclick="window.ConfirmView.updateItemQty(${idx}, 1)">+</button>
                  </div>

                  <!-- Rate / Price Input -->
                  <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">ధర: ₹</span>
                    <input 
                      type="number" 
                      min="0" 
                      step="any"
                      value="${item.unit_price || 0}" 
                      style="width: 76px; text-align: right; padding: 4px 6px; font-size: 13px; font-weight: 800; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-main);" 
                      onchange="window.ConfirmView.updateItemPrice(${idx}, this.value)"
                    >
                    <span style="font-size: 11px; color: var(--text-muted);">/${item.unit || 'pcs'}</span>
                  </div>

                  <!-- Delete button -->
                  <button 
                    type="button" 
                    style="border: none; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 13px; font-weight: 700; padding: 6px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" 
                    onclick="window.ConfirmView.removeItem(${idx})" 
                    title="వస్తువును తొలగించండి"
                  >
                    🗑️ తీసేయి
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Quick Add / Speak More Action Row -->
          <div style="display: flex; gap: 8px; margin: 12px 0 16px 0;">
            <button class="btn btn-outline btn-sm" style="flex: 1; font-size: 12px;" onclick="window.ConfirmView.promptAddItem()">
              + ఇంకో వస్తువు చేర్చండి (+ Add Item)
            </button>
            <button class="btn btn-outline btn-sm" style="flex: 1; font-size: 12px;" id="btn-conversational-mic">
              🎤 ఇంకా మాట్లాడండి (+ Speak More)
            </button>
          </div>

          <!-- Totals Breakdown -->
          <div class="totals-summary-box">
            <div class="total-row">
              <span>సబ్ టోటల్ / Subtotal:</span>
              <span>${window.DocumentGenerator.formatCurrency(tx.subtotal)}</span>
            </div>

            <div class="total-row">
              <span style="display: flex; align-items: center; gap: 6px;">
                డిస్కౌంట్ / Discount:
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value="${tx.discount_percent || 0}" 
                  style="width: 45px; padding: 2px 4px; font-size: 11px;" 
                  onchange="window.ConfirmView.updateDiscount(this.value)"
                > %
              </span>
              <span style="color: ${tx.discount_amount > 0 ? 'var(--danger)' : 'inherit'};">
                -${window.DocumentGenerator.formatCurrency(tx.discount_amount || 0)}
              </span>
            </div>

            <div class="total-row">
              <span style="display: flex; align-items: center; gap: 6px;">
                GST (CGST + SGST):
                <label style="font-size: 11px; cursor: pointer; margin-left: 4px;">
                  <input type="checkbox" ${tx.include_gst !== false ? 'checked' : ''} onchange="window.ConfirmView.toggleGst(this.checked)"> Apply GST
                </label>
              </span>
              <span>${window.DocumentGenerator.formatCurrency(tx.gst_amount || 0)}</span>
            </div>

            <div class="total-row grand-total">
              <span>మొత్తం / Grand Total:</span>
              <span style="color: var(--primary); font-size: 18px;">${window.DocumentGenerator.formatCurrency(tx.total)}</span>
            </div>
          </div>

          <!-- Final Generation Action Buttons -->
          <div style="margin-top: 18px; display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" id="btn-generate-invoice" style="font-size: 15px; padding: 14px; font-weight: 700;">
              📄 ఇన్వాయిస్ రూపొందించండి (Generate Final Invoice)
            </button>
            <button class="btn btn-secondary" id="btn-generate-quotation" style="font-size: 14px; padding: 10px;">
              📋 కొటేషన్ రూపొందించండి (Generate Final Quotation)
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  updateItemName(index, name) {
    if (this.activeTransaction.items[index]) {
      this.activeTransaction.items[index].name = name.trim() || 'వస్తువు';
      const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
      this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
    }
  },

  updateItemQty(index, change) {
    if (this.activeTransaction.items[index]) {
      const current = parseFloat(this.activeTransaction.items[index].quantity) || 0;
      const updated = Math.max(1, current + change);
      this.activeTransaction.items[index].quantity = updated;
      const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
      this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
    }
  },

  updateItemPrice(index, price) {
    if (this.activeTransaction.items[index]) {
      this.activeTransaction.items[index].unit_price = parseFloat(price) || 0;
      const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
      this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
    }
  },

  removeItem(index) {
    if (this.activeTransaction.items[index]) {
      const removed = this.activeTransaction.items.splice(index, 1);
      const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
      window.App.showToast(`"${removed[0]?.name || 'Item'}" తొలగించబడింది.`, 'info');
      this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
    }
  },

  updateDiscount(val) {
    this.activeTransaction.discount_percent = parseFloat(val) || 0;
    const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
    this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
  },

  toggleGst(apply) {
    this.activeTransaction.include_gst = apply;
    const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
    this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
  },

  promptAddItem() {
    const name = prompt('వస్తువు పేరు / Item Name:', 'నూనె ప్యాకెట్');
    if (!name) return;
    const qty = parseFloat(prompt('పరిమాణం / Quantity:', '1')) || 1;
    const unit = prompt('యూనిట్ / Unit (kg, bag, pcs, packet, litre):', 'packet') || 'pcs';
    const price = parseFloat(prompt('ధర / Rate (₹):', '120')) || 0;

    this.activeTransaction.items.push({
      id: 'item-' + Date.now(),
      name: name.trim(),
      name_te: name.trim(),
      quantity: qty,
      unit: unit.trim(),
      unit_price: price,
      gst_percent: this.activeTransaction.include_gst ? 5.0 : 0
    });

    const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
    window.App.showToast(`"${name}" జోడించబడింది.`, 'success');
    this.render(document.getElementById('app-view-container'), recalculated, this.metaResult);
  },

  bindEvents(container) {
    // 1. Generate Final Invoice
    const invoiceBtn = container.querySelector('#btn-generate-invoice');
    if (invoiceBtn) {
      invoiceBtn.addEventListener('click', () => {
        if (!this.activeTransaction.items || this.activeTransaction.items.length === 0) {
          window.App.showToast('జాబితాలో కనీసం ఒక వస్తువు ఉండాలి.', 'error');
          return;
        }
        this.activeTransaction.document_type = 'invoice';
        const savedInvoice = window.Store.saveInvoice(this.activeTransaction);
        window.App.showToast('ఇన్వాయిస్ విజయవంతంగా రూపొందించబడింది!', 'success');
        window.App.viewDocument(savedInvoice.id, 'invoice');
      });
    }

    // 2. Generate Final Quotation
    const quotationBtn = container.querySelector('#btn-generate-quotation');
    if (quotationBtn) {
      quotationBtn.addEventListener('click', () => {
        if (!this.activeTransaction.items || this.activeTransaction.items.length === 0) {
          window.App.showToast('జాబితాలో కనీసం ఒక వస్తువు ఉండాలి.', 'error');
          return;
        }
        this.activeTransaction.document_type = 'quotation';
        const savedQuotation = window.Store.saveQuotation(this.activeTransaction);
        window.App.showToast('కొటేషన్ విజయవంతంగా రూపొందించబడింది!', 'success');
        window.App.viewDocument(savedQuotation.id, 'quotation');
      });
    }

    // 3. Change Customer Dialog
    const changeCustBtn = container.querySelector('#btn-change-customer');
    if (changeCustBtn) {
      changeCustBtn.addEventListener('click', () => {
        const customers = window.Store.getCustomers();
        const namesList = customers.map((c, i) => `${i + 1}. ${c.name} (${c.name_te || ''})`).join('\n');
        const selection = prompt(`కస్టమర్‌ని ఎంచుకోండి (నంబర్ నమోదు చేయండి):\n${namesList}\nలేదా కొత్త పేరు టైప్ చేయండి:`);
        if (!selection) return;

        const num = parseInt(selection);
        if (!isNaN(num) && customers[num - 1]) {
          const sel = customers[num - 1];
          this.activeTransaction.customer_id = sel.id;
          this.activeTransaction.customer_name = sel.name;
          this.activeTransaction.customer_phone = sel.phone;
        } else {
          this.activeTransaction.customer_id = null;
          this.activeTransaction.customer_name = selection;
        }
        this.render(container, this.activeTransaction, this.metaResult);
      });
    }

    // 4. Conversational Voice Editing / Speak More Button
    const convMicBtn = container.querySelector('#btn-conversational-mic');
    if (convMicBtn) {
      convMicBtn.addEventListener('click', async () => {
        const sample = prompt('ఇంకా మాట్లాడండి లేదా మార్పులు చెప్పండి:\nఉదా: “ఇంకో రెండు కిలోలు టమాటాలు”, “5% డిస్కౌంట్ ఇవ్వు”, “ఉల్లిపాయలు తీసేయి”', '');
        if (sample) {
          const result = window.ConversationalEditor.processCommand(this.activeTransaction, sample);
          if (result.success) {
            window.App.showToast(result.feedback, 'success');
            this.metaResult.feedback = result.feedback;
            this.render(container, result.transaction, this.metaResult);
          } else {
            // If conversational editor didn't match an edit rule, treat it as a new product request
            window.GeminiService.processVoiceInput({ text: sample, isDemo: false }).then(voiceRes => {
              if (voiceRes.success && voiceRes.transaction?.items?.length > 0) {
                this.activeTransaction.items.push(...voiceRes.transaction.items);
                const recalculated = window.ConversationalEditor.calculateTotals(this.activeTransaction);
                window.App.showToast('కొత్త వస్తువులు జాబితాకు చేర్చబడ్డాయి!', 'success');
                this.render(container, recalculated, this.metaResult);
              } else {
                window.App.showToast('వాయిస్ అర్థం కాలేదు.', 'error');
              }
            });
          }
        }
      });
    }
  }
};
