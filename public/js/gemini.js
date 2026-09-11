/**
 * Maatlaadi Bill - Gemini AI Client & Structured Transaction Processor
 * Calls server-side /api/voice route securely or runs Demo Engine without API keys
 */

class GeminiService {
  constructor() {
    this.store = window.Store;
    this.matcher = window.ProductMatcher;
    this.conversational = window.ConversationalEditor;
  }

  /**
   * Process spoken audio / text into structured transaction
   * @param {Object} options { audioBlob, text, isDemo, scenarioId }
   */
  async processVoiceInput(options = {}) {
    const startTime = Date.now();
    const settings = this.store.getSettings();
    const isDemo = options.isDemo !== undefined ? options.isDemo : settings.demo_mode;

    let transcript = options.text || '';
    let extractedData = null;
    let isConversational = false;

    // 1. If explicit Demo Scenario is selected
    if (options.scenarioId) {
      const scenario = DEMO_SCENARIOS.find(s => s.id === options.scenarioId);
      if (scenario) {
        transcript = scenario.speech;

        // Simulate realistic network/AI inference delay (400ms)
        await new Promise(r => setTimeout(r, 450));

        if (scenario.type === 'conversational_edit') {
          isConversational = true;
          return this.handleConversationalDemo(scenario, startTime);
        }

        extractedData = JSON.parse(JSON.stringify(scenario.expectedExtraction));
      }
    }

    // 2. Real Backend /api/voice call (if not demo or audio blob provided)
    if (!extractedData && !isDemo && (options.audioBlob || options.text)) {
      try {
        const catalogueSummary = this.store.getActiveProducts().map(p => ({
          id: p.id,
          name: p.name,
          name_te: p.name_te,
          aliases: p.aliases,
          category: p.category,
          unit: p.unit
        }));

        let audioBase64 = null;
        let mimeType = 'audio/webm';
        if (options.audioBlob && options.audioBlob.size > 0) {
          try {
            audioBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const res = reader.result;
                resolve(typeof res === 'string' && res.includes(',') ? res.split(',')[1] : null);
              };
              reader.readAsDataURL(options.audioBlob);
            });
            mimeType = options.audioBlob.type || 'audio/webm';
          } catch (e) {}
        }

        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: options.text || transcript,
            audioBase64,
            mimeType,
            catalogue: catalogueSummary
          })
        });

        if (res.ok) {
          const json = await res.json();
          transcript = json.transcript || transcript;
          extractedData = json.extraction;
        } else {
          console.warn('Backend /api/voice returned status:', res.status, '- Falling back to client parser');
        }
      } catch (err) {
        console.warn('Network call to /api/voice failed:', err, '- Using local intelligent parser');
      }
    }

    // 3. Fallback Client-side Intelligent Telugu Rule-Engine & Parser
    if (!extractedData) {
      // Simulate brief processing time
      await new Promise(r => setTimeout(r, 350));
      extractedData = this.parseTranscriptLocally(transcript);
    }

    // 4. Validate & Match Entities against Catalogue
    const matchedTransaction = this.buildTransactionFromExtraction(extractedData, transcript, startTime, isDemo);
    return matchedTransaction;
  }

  /**
   * Client-side Telugu Rule-Engine & Matcher for offline/local extraction
   */
  parseTranscriptLocally(transcript) {
    if (!transcript) return null;
    const clean = transcript.trim();

    // Determine document type
    let docType = 'invoice';
    if (clean.includes('కోట్') || clean.includes('quotation') || clean.includes('కొటేషన్') || clean.includes('quote')) {
      docType = 'quotation';
    }

    // Customer detection
    let customerName = null;
    const customerMatch = this.matcher.matchCustomer(clean);
    if (customerMatch) {
      customerName = customerMatch.name;
    }

    // Check discount
    let discountPercent = 0;
    const discMatch = clean.match(/(\d+)\s*(%|శాతం|percent)?\s*డిస్కౌంట్|discount/i);
    if (discMatch) {
      discountPercent = parseFloat(discMatch[1]);
    }

    // Check GST
    let includeGst = true;
    if (clean.includes('gst తీసేయి') || clean.includes('without gst') || clean.includes('no gst')) {
      includeGst = false;
    }

    // Extract items by scanning against active products and aliases
    const products = this.store.getActiveProducts();
    const items = [];
    const unitSynonyms = window.UNIT_SYNONYMS || UNIT_SYNONYMS;
    const segments = clean.split(/[,،\n]+|\s+మరియు\s+|\s+ఇంకా\s+|\s+and\s+|\+/i);

    for (const segment of segments) {
      const seg = segment.trim();
      if (!seg) continue;

      // Check each product
      for (const p of products) {
        const matchesName = seg.toLowerCase().includes(p.name.toLowerCase()) || (p.name_te && seg.includes(p.name_te));
        const matchesAlias = p.aliases && p.aliases.some(a => seg.toLowerCase().includes(a.toLowerCase()));

        if (matchesName || matchesAlias) {
          // Extract quantity
          const qty = this.matcher.parseQuantity(seg);
          // Extract unit
          let unit = p.unit;
          for (const [canonical, syns] of Object.entries(unitSynonyms)) {
            if (syns.some(s => seg.toLowerCase().includes(s))) {
              unit = canonical;
              break;
            }
          }

          // Avoid duplicates in the same extraction
          if (!items.some(i => i.matched_product_id === p.id)) {
            items.push({
              spoken_name: p.name_te || p.name,
              matched_product_id: p.id,
              quantity: qty,
              unit: unit,
              confidence: 0.92
            });
            break;
          }
        }
      }
    }

    // If no direct matches found, try general tokenizer
    if (items.length === 0) {
      const match = this.matcher.matchProduct(clean);
      if (match.status === 'exact' && match.product) {
        items.push({
          spoken_name: clean,
          matched_product_id: match.product.id,
          quantity: this.matcher.parseQuantity(clean),
          unit: match.product.unit,
          confidence: match.confidence
        });
      } else if (match.status === 'ambiguous') {
        items.push({
          spoken_name: clean,
          matched_product_id: null,
          quantity: this.matcher.parseQuantity(clean),
          unit: 'pcs',
          confidence: match.confidence,
          is_ambiguous: true,
          ambiguity_options: match.candidates.map(c => c.id),
          ambiguityPrompt: match.ambiguityPrompt
        });
      } else {
        items.push({
          spoken_name: clean,
          matched_product_id: null,
          quantity: 1,
          unit: 'pcs',
          confidence: 0.4,
          is_unknown: true,
          errorPrompt: 'ఈ product catalogueలో లేదు. Product add చేయాలా?'
        });
      }
    }

    return {
      document_type: docType,
      customer_name: customerName,
      items,
      discount_percent: discountPercent,
      include_gst: includeGst,
      notes: null,
      confidence: items.length > 0 ? 0.90 : 0.40
    };
  }

  /**
   * Build complete financial transaction from structured extraction
   */
  buildTransactionFromExtraction(extracted, transcript, startTime, isDemo = false) {
    if (!extracted || !extracted.items || extracted.items.length === 0) {
      return {
        success: false,
        error: 'మీ మాట పూర్తిగా అర్థం కాలేదు. మళ్లీ చెప్పండి.',
        transcript
      };
    }

    let customer = null;
    if (extracted.customer_name) {
      customer = this.matcher.matchCustomer(extracted.customer_name);
    }

    const processedItems = [];

    for (const rawItem of (extracted.items || [])) {
      if (!rawItem.spoken_name && !rawItem.name) continue;

      let spokenName = (rawItem.spoken_name || rawItem.name || 'వస్తువు')
        .replace(/[\uFFFD\uFFFE]/g, '')
        .trim();

      // Normalize common dialectal / transcription quirks
      if (spokenName.includes('మనప') || spokenName.includes('మినప')) {
        spokenName = 'మినప గుళ్ళు';
      }

      let product = null;

      // Convenient default price/GST from catalogue if available
      if (rawItem.matched_product_id) {
        product = this.store.getProductById(rawItem.matched_product_id);
      }
      if (!product) {
        const match = this.matcher.matchProduct(spokenName);
        if (match.product) {
          product = match.product;
        } else if (match.candidates && match.candidates.length > 0) {
          product = match.candidates[0];
        }
      }

      const qty = parseFloat(rawItem.quantity) || 1;
      const unit = rawItem.unit || (product ? product.unit : 'pcs');
      
      // Determine rate: spoken price > catalogue price > fallback 0
      let rate = 0;
      if (typeof rawItem.unit_price === 'number' && rawItem.unit_price > 0) {
        rate = rawItem.unit_price;
      } else if (product && product.selling_price > 0) {
        rate = product.selling_price;
      }

      const gstRate = (product && extracted.include_gst !== false) ? (product.gst_percent || 0) : 0;
      const taxable = qty * rate;
      const gstAmount = (taxable * gstRate) / 100;

      // Always keep whatever the user spoke as the primary item name!
      processedItems.push({
        id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 4),
        product_id: product ? product.id : null,
        name: spokenName,
        name_te: product ? product.name_te : spokenName,
        hsn_code: product ? product.hsn_code : '',
        quantity: qty,
        unit: unit,
        unit_price: rate,
        gst_percent: gstRate,
        taxable_value: taxable,
        gst_amount: gstAmount,
        line_total: taxable + gstAmount
      });
    }

    const draftTx = {
      document_type: extracted.document_type || 'invoice',
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : (extracted.customer_name || 'Cash Customer / రిటైల్'),
      customer_phone: customer ? customer.phone : '',
      customer_address: customer ? customer.address : '',
      customer_gstin: customer ? customer.gstin : '',
      items: processedItems,
      discount_percent: extracted.discount_percent || 0,
      include_gst: extracted.include_gst !== false,
      notes: extracted.notes || '',
      date: new Date().toISOString().split('T')[0]
    };

    const calculatedTx = this.conversational.calculateTotals(draftTx);

    // Observability logging
    const processingTimeMs = Date.now() - startTime;
    this.store.logVoiceTransaction({
      raw_audio_duration_seconds: 3.5,
      transcript,
      extracted_json: extracted,
      matched_products: processedItems.map(i => ({ id: i.product_id, name: i.name, qty: i.quantity })),
      overall_confidence: extracted.confidence || 0.9,
      processing_time_ms: processingTimeMs,
      final_document_type: calculatedTx.document_type,
      is_demo: isDemo
    });

    return {
      success: true,
      transaction: calculatedTx,
      transcript,
      ambiguousItems: [],
      unknownItems: [],
      confidence: extracted.confidence || 0.95,
      processingTimeMs
    };
  }

  /**
   * Handle Conversational Demo Edit Scenario
   */
  handleConversationalDemo(scenario, startTime) {
    // Get last active transaction or seed quotation
    let activeTx = window.CurrentActiveTransaction;
    if (!activeTx || !activeTx.items || activeTx.items.length === 0) {
      activeTx = SEED_QUOTATIONS[0];
    }

    const result = this.conversational.processCommand(activeTx, scenario.speech);
    const processingTimeMs = Date.now() - startTime;

    this.store.logVoiceTransaction({
      transcript: scenario.speech,
      extracted_json: scenario.expectedAction,
      matched_products: result.transaction.items.map(i => ({ id: i.product_id, name: i.name, qty: i.quantity })),
      overall_confidence: 0.98,
      processing_time_ms: processingTimeMs,
      final_document_type: result.transaction.document_type,
      is_demo: true
    });

    return {
      success: result.success,
      transaction: result.transaction,
      transcript: scenario.speech,
      feedback: result.feedback,
      isConversationalEdit: true,
      ambiguousItems: [],
      unknownItems: [],
      confidence: 0.98,
      processingTimeMs
    };
  }
}

window.GeminiService = new GeminiService();
