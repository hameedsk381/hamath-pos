/**
 * Maatlaadi Bill - Conversational Transaction Editor & Calculator
 * Parses iterative voice commands to modify active transactions in real-time
 */

class ConversationalEditor {
  constructor() {
    this.matcher = window.ProductMatcher;
    this.store = window.Store;
  }

  /**
   * Recalculate financial totals for a transaction
   */
  calculateTotals(transaction) {
    let subtotal = 0;
    let totalGst = 0;

    const items = (transaction.items || []).map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.unit_price) || 0;
      const taxable = qty * rate;
      const gstRate = transaction.include_gst !== false ? (parseFloat(item.gst_percent) || 0) : 0;
      const gstAmount = (taxable * gstRate) / 100;
      const lineTotal = taxable + gstAmount;

      subtotal += taxable;
      totalGst += gstAmount;

      return {
        ...item,
        quantity: qty,
        unit_price: rate,
        taxable_value: Math.round(taxable * 100) / 100,
        gst_percent: gstRate,
        gst_amount: Math.round(gstAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100
      };
    });

    const discountPercent = parseFloat(transaction.discount_percent) || 0;
    const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
    const taxableAfterDiscount = Math.max(0, subtotal - discountAmount);

    // Adjust GST if discount applied proportionally
    const adjustedGst = transaction.include_gst !== false
      ? Math.round((totalGst * (1 - discountPercent / 100)) * 100) / 100
      : 0;

    const grandTotalBeforeRound = taxableAfterDiscount + adjustedGst;
    const roundedGrandTotal = Math.round(grandTotalBeforeRound);
    const roundOff = Math.round((roundedGrandTotal - grandTotalBeforeRound) * 100) / 100;

    return {
      ...transaction,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      taxable_amount: Math.round(taxableAfterDiscount * 100) / 100,
      cgst_amount: Math.round((adjustedGst / 2) * 100) / 100,
      sgst_amount: Math.round((adjustedGst / 2) * 100) / 100,
      gst_amount: adjustedGst,
      round_off: roundOff,
      total: roundedGrandTotal
    };
  }

  /**
   * Process a conversational voice command on an existing transaction
   * @param {Object} currentTx
   * @param {string} voiceCommand
   * @returns {Object} { success: boolean, transaction: Object, feedback: string }
   */
  processCommand(currentTx, voiceCommand) {
    if (!voiceCommand || typeof voiceCommand !== 'string') {
      return { success: false, transaction: currentTx, feedback: 'ఏమి మార్చాలో చెప్పండి.' };
    }

    const clean = voiceCommand.toLowerCase().trim();
    let tx = JSON.parse(JSON.stringify(currentTx));
    let feedback = '';

    // 1. Discount command ("10 percent discount పెట్టు", "5% discount")
    const discountMatch = clean.match(/(\d+(\.\d+)?)\s*(%|percent|శాతం)?\s*డిస్కౌంట్|discount/i);
    if (clean.includes('discount') || clean.includes('డిస్కౌంట్')) {
      const numMatch = clean.match(/(\d+(\.\d+)?)/);
      if (numMatch) {
        const disc = parseFloat(numMatch[1]);
        tx.discount_percent = disc;
        feedback = `${disc}% డిస్కౌంట్ వర్తింపజేయబడింది.`;
        return { success: true, transaction: this.calculateTotals(tx), feedback };
      }
    }

    // 2. Remove GST command ("GST తీసేయి", "no gst", "without gst")
    if (clean.includes('gst తీసేయి') || clean.includes('no gst') || clean.includes('విత్ అవుట్ gst') || clean.includes('remove gst')) {
      tx.include_gst = false;
      feedback = 'GST తీసివేయబడింది.';
      return { success: true, transaction: this.calculateTotals(tx), feedback };
    }

    // 3. Add / Enable GST ("GST పెట్టు", "with gst", "gstతో")
    if (clean.includes('gst పెట్టు') || clean.includes('with gst') || clean.includes('gstతో') || clean.includes('add gst')) {
      tx.include_gst = true;
      feedback = 'GST జోడించబడింది.';
      return { success: true, transaction: this.calculateTotals(tx), feedback };
    }

    // 4. Change Document Type to Quotation ("Quotationగా మార్చు", "quote చేయి")
    if (clean.includes('quotation') || clean.includes('కొటేషన్')) {
      tx.document_type = 'quotation';
      feedback = 'డాక్యుమెంట్ కొటేషన్‌గా మార్చబడింది.';
      return { success: true, transaction: this.calculateTotals(tx), feedback };
    }

    // 5. Change Document Type to Invoice ("Invoiceగా మార్చు", "billగా మార్చు")
    if (clean.includes('invoice') || clean.includes('ఇన్వాయిస్') || clean.includes('billగా') || clean.includes('బిల్లుగా')) {
      tx.document_type = 'invoice';
      feedback = 'డాక్యుమెంట్ ఇన్వాయిస్‌గా మార్చబడింది.';
      return { success: true, transaction: this.calculateTotals(tx), feedback };
    }

    // 6. Change Customer Name ("Customer name Sureshగా మార్చు", "కస్టమర్ సురేష్")
    if (clean.includes('customer') || clean.includes('కస్టమర్') || clean.includes('పేరు')) {
      const matchCust = this.matcher.matchCustomer(clean);
      if (matchCust) {
        tx.customer_id = matchCust.id;
        tx.customer_name = matchCust.name;
        tx.customer_phone = matchCust.phone;
        feedback = `కస్టమర్ పేరు ${matchCust.name}గా మార్చబడింది.`;
        return { success: true, transaction: this.calculateTotals(tx), feedback };
      }
    }

    // 7. Remove item ("ఈ item తీసేయి", "delete", "రిమూవ్")
    if (clean.includes('తీసేయి') || clean.includes('remove') || clean.includes('delete') || clean.includes('వద్దు')) {
      if (tx.items && tx.items.length > 0) {
        // Try finding matching product in items
        let removedIndex = tx.items.length - 1; // default to last item
        for (let i = 0; i < tx.items.length; i++) {
          const item = tx.items[i];
          if (clean.includes(item.name.toLowerCase()) || (item.name_te && clean.includes(item.name_te.toLowerCase()))) {
            removedIndex = i;
            break;
          }
        }
        const removedItem = tx.items.splice(removedIndex, 1)[0];
        feedback = `"${removedItem.name}" ఐటమ్ తీసివేయబడింది.`;
        return { success: true, transaction: this.calculateTotals(tx), feedback };
      }
    }

    // 8. Increase Quantity ("ఇంకో ఐదు పీసులు యాడ్ చెయ్యి", "add 5 more")
    if (clean.includes('ఇంకో') || clean.includes('more') || clean.includes('యాడ్ చెయ్యి') || clean.includes('పెంచు')) {
      let increment = 1;
      const numMatch = clean.match(/(\d+(\.\d+)?)/);
      if (numMatch) {
        increment = parseFloat(numMatch[1]);
      } else {
        increment = this.matcher.parseQuantity(clean);
      }

      if (tx.items && tx.items.length > 0) {
        // Check if a specific item is named
        let targetIndex = tx.items.length - 1;
        for (let i = 0; i < tx.items.length; i++) {
          const item = tx.items[i];
          if (clean.includes(item.name.toLowerCase()) || (item.name_te && clean.includes(item.name_te.toLowerCase()))) {
            targetIndex = i;
            break;
          }
        }
        tx.items[targetIndex].quantity += increment;
        feedback = `"${tx.items[targetIndex].name}" పరిమాణం ${increment} పెంచబడింది (మొత్తం: ${tx.items[targetIndex].quantity} ${tx.items[targetIndex].unit}).`;
        return { success: true, transaction: this.calculateTotals(tx), feedback };
      }
    }

    // 9. Change quantity directly ("Paint రెండు bucketsకి మార్చు", "quantity 10 పెట్టు")
    if (clean.includes('మార్చు') || clean.includes('change') || clean.includes('పెట్టు')) {
      if (tx.items && tx.items.length > 0) {
        let newQty = this.matcher.parseQuantity(clean);
        const numMatch = clean.match(/(\d+(\.\d+)?)/);
        if (numMatch) newQty = parseFloat(numMatch[1]);

        let targetIndex = tx.items.length - 1;
        for (let i = 0; i < tx.items.length; i++) {
          const item = tx.items[i];
          if (clean.includes(item.name.toLowerCase()) || (item.name_te && clean.includes(item.name_te.toLowerCase()))) {
            targetIndex = i;
            break;
          }
        }
        tx.items[targetIndex].quantity = newQty;
        feedback = `"${tx.items[targetIndex].name}" పరిమాణం ${newQty} ${tx.items[targetIndex].unit}కి మార్చబడింది.`;
        return { success: true, transaction: this.calculateTotals(tx), feedback };
      }
    }

    // Fallback: Check if user spoke a new product to add
    const matchResult = this.matcher.matchProduct(clean);
    if (matchResult.status === 'exact' && matchResult.product) {
      const p = matchResult.product;
      const qty = this.matcher.parseQuantity(clean);
      tx.items.push({
        id: 'item-' + Date.now(),
        product_id: p.id,
        name: p.name,
        name_te: p.name_te,
        hsn_code: p.hsn_code,
        quantity: qty,
        unit: p.unit,
        unit_price: p.selling_price,
        gst_percent: p.gst_percent
      });
      feedback = `"${p.name}" (${qty} ${p.unit}) జోడించబడింది.`;
      return { success: true, transaction: this.calculateTotals(tx), feedback };
    }

    return {
      success: false,
      transaction: currentTx,
      feedback: 'మీ మాట పూర్తిగా అర్థం కాలేదు. మళ్లీ చెప్పండి.'
    };
  }
}

window.ConversationalEditor = new ConversationalEditor();
