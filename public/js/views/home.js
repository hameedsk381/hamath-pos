/**
 * Maatlaadi Bill - Home View (Live Hands-Free Speaking & Real-Time Auto-Generated Invoice)
 * - Continuous live listening with Voice Activity Detection (no 'Done' button needed)
 * - Real-time auto-generated and auto-saved invoice (no 'Generate' button needed)
 * - Instant Print, WhatsApp share, and PDF ready on the fly
 */

window.HomeView = {
  activeInvoice: null,
  debounceTimer: null,
  isProcessingLive: false,

  initInvoice() {
    const nextNum = window.Store.getNextInvoiceNumber();
    this.activeInvoice = {
      id: 'inv-' + Date.now(),
      invoice_number: nextNum,
      document_type: 'invoice',
      customer_name: 'Cash Customer / రిటైల్',
      customer_phone: '',
      customer_address: '',
      customer_gstin: '',
      items: [],
      discount_percent: 0,
      include_gst: true,
      subtotal: 0,
      discount_amount: 0,
      taxable_amount: 0,
      gst_amount: 0,
      total: 0,
      date: new Date().toISOString().split('T')[0],
      payment_status: 'paid'
    };
  },

  render(container) {
    if (!this.activeInvoice) {
      this.initInvoice();
    }

    container.innerHTML = `
      <div class="view-container">
        <!-- Live Hands-Free Studio Layout -->
        <div class="live-studio-layout">
          
          <!-- ================= LEFT COLUMN: HANDS-FREE VOICE STUDIO ================= -->
          <div class="voice-studio-panel">
            <!-- Voice Hero Card -->
            <div class="voice-hero-card">
              <div class="voice-hero-title">Maatlaadi Bill</div>
              <div class="voice-hero-tagline">“మాట్లాడితే బిల్ రెడీ.” (Speak naturally - Live Bill)</div>

              <div class="mic-action-container">
                <div class="mic-halo-ring"></div>
                <button id="main-mic-btn" class="mic-button" title="వాయిస్ రికార్డింగ్ ప్రారంభించండి">
                  🎙️
                </button>
                <div id="mic-label-main" class="mic-label-main">మాట్లాడండి</div>
                <div id="mic-label-sub" class="mic-label-sub">మైక్ నొక్కి మాట్లాడండి - లైవ్‌గా బిల్ రెడీ అవుతుంది</div>
              </div>

              <!-- Active Waveform & Status Indicator -->
              <div id="voice-active-box" class="voice-active-box" style="display: none;">
                <canvas id="waveform-canvas" class="waveform-canvas" width="320" height="48"></canvas>
                <div id="voice-status-indicator" class="voice-status-text">
                  <span class="pulse-dot" style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                  <span id="voice-status-label">🔴 ఎల్లప్పుడూ వింటున్నాను (Live Listening...)</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); text-align: center;">
                  ✓ బటన్ నొక్కాల్సిన పనిలేదు. మీరు మాట్లాడే ప్రతి వస్తువు కుడివైపు బిల్లులో లైవ్‌గా చేరుతుంది.
                </div>
                <div class="voice-action-controls" style="margin-top: 6px;">
                  <button id="btn-voice-pause" class="btn btn-outline btn-sm">
                    ⏸️ మైక్ పాజ్ (Mute Mic)
                  </button>
                </div>
              </div>

              <!-- Live Speech-to-Text Transcript Preview -->
              <div style="margin-top: 14px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
                    🗣️ మీరు మాట్లాడినది (Live Transcript):
                  </span>
                  <span id="live-nlp-status" style="font-size: 10px; color: var(--primary); font-weight: 700; display: none;">
                    ● లైవ్‌గా గుర్తిస్తున్నాము...
                  </span>
                </div>
                <div id="voice-live-transcript" class="voice-transcript-preview" style="min-height: 48px; text-align: left; font-size: 13px;">
                  తెలుగులో మాట్లాడండి... (ఉదా: “పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు”)
                </div>
              </div>
            </div>

            <!-- Customer & Document Type Controls -->
            <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; box-shadow: var(--shadow-subtle);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
                  పత్రం రకం / Mode:
                </label>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="cat-tab ${this.activeInvoice.document_type === 'invoice' ? 'active' : ''}" id="tab-type-invoice" style="padding: 4px 10px; font-size: 11px;">
                    ఇన్వాయిస్ (Invoice)
                  </button>
                  <button type="button" class="cat-tab ${this.activeInvoice.document_type === 'quotation' ? 'active' : ''}" id="tab-type-quotation" style="padding: 4px 10px; font-size: 11px;">
                    కొటేషన్ (Quotation)
                  </button>
                </div>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px;">
                  కస్టమర్ / Customer Name:
                </label>
                <input type="text" id="live-customer-input" class="form-input" style="padding: 6px 10px; font-size: 13px;" value="${this.activeInvoice.customer_name}" placeholder="కస్టమర్ పేరు లేదా Cash Customer">
              </div>
            </div>

            <!-- Interactive Sample Telugu Voice Prompts (Click to Speak Live) -->
            <div style="background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">
                💡 నమూనా వాక్యాలు (Click to simulate live voice):
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div class="sample-prompt-chip" onclick="window.HomeView.simulateSpokenText('రమేష్కి పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు')">
                  <span>🗣️</span> <span>“రమేష్కి 10 బస్తాల సిమెంట్, 2 పెయింట్ బకెట్లు”</span>
                </div>
                <div class="sample-prompt-chip" onclick="window.HomeView.simulateSpokenText('వంద గ్రాములు లవంగాలు, వంద గ్రాములు గసగసాలు, ఒక ప్యాకెట్ బాస్మతి బియ్యం, ఒక కిలో పంచదార')">
                  <span>🗣️</span> <span>“100g లవంగాలు, 100g గసగసాలు, 1 pkt బాస్మతి, 1 kg పంచదార”</span>
                </div>
                <div class="sample-prompt-chip" onclick="window.HomeView.simulateSpokenText('ఐదు కిలోల బియ్యం, రెండు కిలోల కందిపప్పు, ఒక కిలో మినప గుళ్ళు')">
                  <span>🗣️</span> <span>“5 kg rice, 2 kg కందిపప్పు, 1 kg మినప గుళ్ళు”</span>
                </div>
                <div class="sample-prompt-chip" onclick="window.HomeView.simulateSpokenText('సురేష్‌కి మూడు స్విచ్ బోర్డులు, ఇరవై మీటర్ల వైర్ కోట్ చెయ్యి')">
                  <span>🗣️</span> <span>“సురేష్‌కి 3 స్విచ్ బోర్డులు, 20m వైర్ కోట్ చెయ్యి”</span>
                </div>
              </div>
            </div>

            <!-- Quick Navigation Shortcuts -->
            <div class="quick-actions-grid" style="margin-bottom: 0;">
              <div class="quick-action-card" onclick="window.App.navigateTo('products')">
                <div class="quick-action-icon" style="background: #ecfdf5; color: #059669;">📦</div>
                <div>
                  <div class="quick-action-title">ఉత్పత్తులు</div>
                  <div class="quick-action-sub">Items Catalogue</div>
                </div>
              </div>
              <div class="quick-action-card" onclick="window.App.navigateTo('customers')">
                <div class="quick-action-icon" style="background: #eff6ff; color: #2563eb;">👥</div>
                <div>
                  <div class="quick-action-title">కస్టమర్లు</div>
                  <div class="quick-action-sub">Directory</div>
                </div>
              </div>
              <div class="quick-action-card" onclick="window.App.navigateTo('documents')">
                <div class="quick-action-icon" style="background: #fef3c7; color: #d97706;">📄</div>
                <div>
                  <div class="quick-action-title">బిల్లులు</div>
                  <div class="quick-action-sub">Bills History</div>
                </div>
              </div>
              <div class="quick-action-card" onclick="window.App.navigateTo('dashboard')">
                <div class="quick-action-icon" style="background: #f5f3ff; color: #7c3aed;">📊</div>
                <div>
                  <div class="quick-action-title">రిపోర్ట్</div>
                  <div class="quick-action-sub">Dashboard</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= RIGHT COLUMN: THE LIVE AUTO-GENERATED INVOICE ================= -->
          <div class="live-items-panel" id="live-items-panel">
            <!-- Dynamic Right Side Live Invoice renders here -->
          </div>

        </div>
      </div>
    `;

    this.renderLiveInvoicePanel();
    this.bindEvents(container);
  },

  /**
   * Render the Right Side Live Auto-Generated Invoice Panel
   */
  renderLiveInvoicePanel() {
    const panel = document.getElementById('live-items-panel');
    if (!panel) return;

    const inv = this.activeInvoice;
    const items = inv.items || [];
    const isQuotation = inv.document_type === 'quotation';
    const biz = window.Store.getBusiness();

    panel.innerHTML = `
      <!-- Live Invoice Header -->
      <div style="border-bottom: 2px solid var(--primary); padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
              <span class="pulse-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
              ${isQuotation ? '📋 లైవ్ కొటేషన్ (LIVE QUOTATION)' : '🧾 లైవ్ టాక్స్ ఇన్వాయిస్ (LIVE TAX INVOICE)'}
            </div>
            <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
              ${inv.invoice_number || 'INV-LIVE'}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              <strong>${biz.name}</strong> • ${biz.city}
            </div>
          </div>

          <div style="text-align: right;">
            <div style="background: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0; display: inline-block; margin-bottom: 4px;">
              ✓ ఆటో-సేవ్ అయింది (Auto-Saved)
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              📅 ${inv.date}
            </div>
          </div>
        </div>

        <!-- Customer Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 8px 12px; border-radius: 6px; margin-top: 10px; font-size: 13px;">
          <div>
            👤 కస్టమర్: <strong>${inv.customer_name || 'Cash Customer'}</strong>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary);">
            వస్తువులు: <strong>${items.length}</strong>
          </div>
        </div>
      </div>

      <!-- Spoken Items List Container -->
      <div class="spoken-items-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; flex: 1;">
        ${items.length === 0 ? `
          <div style="text-align: center; padding: 44px 16px; background: var(--bg-subtle); border-radius: 12px; border: 1.5px dashed var(--border-color); color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; flex: 1;">
            <div style="font-size: 38px;">🎙️ ⚡</div>
            <div style="font-weight: 800; font-size: 16px; color: var(--text-primary);">
              వాయిస్ వినడానికి సిద్ధంగా ఉంది (Ready for Speech)
            </div>
            <div style="font-size: 12px; max-width: 320px; line-height: 1.5;">
              ఎడమవైపు మైక్ ఆన్ చేసి వస్తువులు చెప్పండి. ఏ బటన్ నొక్కకుండానే ప్రతి వస్తువు ఇక్కడ లైవ్‌గా చేరి బిల్లు తయారవుతుంది!
            </div>
            <button type="button" class="btn btn-outline btn-sm" style="margin-top: 8px;" onclick="window.HomeView.promptAddItem()">
              + మాన్యువల్‌గా చేర్చండి (+ Add Item)
            </button>
          </div>
        ` : items.map((item, idx) => `
          <div class="spoken-item-card" style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 12px 14px; box-shadow: var(--shadow-subtle); display: flex; flex-direction: column; gap: 8px;">
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
                  onchange="window.HomeView.updateItemName(${idx}, this.value)"
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
                <button type="button" class="stepper-btn" onclick="window.HomeView.updateItemQty(${idx}, -1)">-</button>
                <span class="stepper-val">${item.quantity} ${item.unit || ''}</span>
                <button type="button" class="stepper-btn" onclick="window.HomeView.updateItemQty(${idx}, 1)">+</button>
              </div>

              <!-- Rate / Price Input -->
              <div style="display: flex; align-items: center; gap: 3px;">
                <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">ధర: ₹</span>
                <input 
                  type="number" 
                  min="0" 
                  step="any"
                  value="${item.unit_price || 0}" 
                  style="width: 78px; text-align: right; padding: 4px 6px; font-size: 13px; font-weight: 800; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-main);" 
                  onchange="window.HomeView.updateItemPrice(${idx}, this.value)"
                >
                <span style="font-size: 11px; color: var(--text-muted);">/${item.unit || 'pcs'}</span>
              </div>

              <!-- Delete button -->
              <button 
                type="button" 
                style="border: none; background: #fef2f2; color: #dc2626; cursor: pointer; font-size: 12px; font-weight: 700; padding: 5px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px;" 
                onclick="window.HomeView.removeItem(${idx})" 
                title="వస్తువును తొలగించండి"
              >
                🗑️ తీసేయి
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      ${items.length > 0 ? `
        <!-- Add Item Quick Action -->
        <div style="margin-bottom: 14px; display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-sm" style="flex: 1;" onclick="window.HomeView.promptAddItem()">
            + మాన్యువల్ వస్తువు (+ Add Item)
          </button>
          <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger);" onclick="window.HomeView.startNewBill()">
            🔄 కొత్త బిల్లు (New Bill)
          </button>
        </div>

        <!-- Totals Breakdown Box -->
        <div class="totals-summary-box">
          <div class="total-row">
            <span>సబ్ టోటల్ / Subtotal:</span>
            <span>${window.DocumentGenerator.formatCurrency(inv.subtotal)}</span>
          </div>

          <div class="total-row">
            <span style="display: flex; align-items: center; gap: 6px;">
              డిస్కౌంట్ / Discount:
              <input 
                type="number" 
                min="0" 
                max="100" 
                value="${inv.discount_percent || 0}" 
                style="width: 45px; padding: 2px 4px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px;" 
                onchange="window.HomeView.updateDiscount(this.value)"
              > %
            </span>
            <span style="color: ${inv.discount_amount > 0 ? 'var(--danger)' : 'inherit'};">
              -${window.DocumentGenerator.formatCurrency(inv.discount_amount || 0)}
            </span>
          </div>

          <div class="total-row">
            <span style="display: flex; align-items: center; gap: 6px;">
              GST (CGST + SGST):
              <label style="font-size: 11px; cursor: pointer; margin-left: 4px;">
                <input type="checkbox" ${inv.include_gst !== false ? 'checked' : ''} onchange="window.HomeView.toggleGst(this.checked)"> Apply GST
              </label>
            </span>
            <span>${window.DocumentGenerator.formatCurrency(inv.gst_amount || 0)}</span>
          </div>

          <div class="total-row grand-total">
            <span>మొత్తం / Grand Total:</span>
            <span style="color: var(--primary); font-size: 22px;">${window.DocumentGenerator.formatCurrency(inv.total)}</span>
          </div>
        </div>

        <!-- Instant Actions: The invoice is ALREADY live! Print, Share, PDF immediately! -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;">
          <button type="button" class="btn btn-primary" onclick="window.HomeView.printLiveBill()" style="font-size: 14px; padding: 12px; font-weight: 800;">
            🖨️ ప్రింట్ (Print Bill)
          </button>
          <button type="button" class="btn btn-secondary" onclick="window.HomeView.shareLiveBill()" style="background: #25d366; border-color: #25d366; font-size: 14px; padding: 12px; font-weight: 800;">
            💬 WhatsApp బిల్లు
          </button>
        </div>
      ` : ''}
    `;
  },

  /**
   * Bind event listeners
   */
  bindEvents(container) {
    const micBtn = container.querySelector('#main-mic-btn');
    const voiceBox = container.querySelector('#voice-active-box');
    const canvas = container.querySelector('#waveform-canvas');
    const statusLabel = container.querySelector('#voice-status-label');
    const transcriptPreview = container.querySelector('#voice-live-transcript');
    const pauseBtn = container.querySelector('#btn-voice-pause');
    const customerInput = container.querySelector('#live-customer-input');
    const tabInvoice = container.querySelector('#tab-type-invoice');
    const tabQuotation = container.querySelector('#tab-type-quotation');

    // Customer Name Input
    if (customerInput) {
      customerInput.addEventListener('input', (e) => {
        this.activeInvoice.customer_name = e.target.value;
        this.autoSaveLiveInvoice();
      });
    }

    // Document Type Tabs
    if (tabInvoice && tabQuotation) {
      tabInvoice.addEventListener('click', () => {
        this.activeInvoice.document_type = 'invoice';
        tabInvoice.classList.add('active');
        tabQuotation.classList.remove('active');
        this.autoSaveLiveInvoice();
        this.renderLiveInvoicePanel();
      });
      tabQuotation.addEventListener('click', () => {
        this.activeInvoice.document_type = 'quotation';
        tabQuotation.classList.add('active');
        tabInvoice.classList.remove('active');
        this.autoSaveLiveInvoice();
        this.renderLiveInvoicePanel();
      });
    }

    // Continuous Microphone Toggle
    micBtn.addEventListener('click', async () => {
      if (window.VoiceManager.isRecording) {
        window.VoiceManager.stopRecording();
        voiceBox.style.display = 'none';
        micBtn.classList.remove('recording');
        statusLabel.textContent = 'మైక్ ఆగిపోయింది';
      } else {
        voiceBox.style.display = 'flex';
        micBtn.classList.add('recording');
        statusLabel.textContent = '🔴 ఎల్లప్పుడూ వింటున్నాను (Live Listening Always On)';
        transcriptPreview.textContent = 'తెలుగులో మాట్లాడండి... వస్తువులు లైవ్‌గా చేరుతాయి';

        const started = await window.VoiceManager.startRecording(canvas);
        if (!started) {
          voiceBox.style.display = 'none';
          micBtn.classList.remove('recording');
        }
      }
    });

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (window.VoiceManager.isRecording) {
          window.VoiceManager.stopRecording();
          voiceBox.style.display = 'none';
          micBtn.classList.remove('recording');
          window.App.showToast('మైక్ తాత్కాలికంగా ఆపబడింది.', 'info');
        }
      });
    }

    // Live Streaming Speech Updates (fired on every recognized word)
    window.VoiceManager.onTranscriptUpdate = (text) => {
      if (transcriptPreview) {
        transcriptPreview.textContent = text || 'వింటున్నాను...';
      }
      if (text && text.trim().length > 2) {
        this.processLiveTranscript(text);
      }
    };

    // Auto-Dispatched Speech Segment on Voice Pause (VAD detected silence)
    window.VoiceManager.onLiveAudioSegment = async (audioBlob, transcript) => {
      if (transcript && transcript.trim()) {
        await this.refineWithGemini(transcript, audioBlob);
      } else if (audioBlob) {
        // Send audio directly even if web speech was silent
        await this.refineWithGemini('', audioBlob);
      }
    };

    // Voice State Changes
    window.VoiceManager.onStateChange = (state, errMsg) => {
      if (state === 'listening') {
        micBtn.classList.add('recording');
        statusLabel.textContent = '🔴 ఎల్లప్పుడూ వింటున్నాను (Live Listening...)';
      } else if (state === 'idle') {
        micBtn.classList.remove('recording');
        voiceBox.style.display = 'none';
      } else if (state === 'error') {
        micBtn.classList.remove('recording');
        voiceBox.style.display = 'none';
        window.App.showToast(errMsg || 'మైక్రోఫోన్ సమస్య ఏర్పడింది.', 'error');
      }
    };
  },

  /**
   * Process live streaming transcript in real-time
   */
  processLiveTranscript(text) {
    const clean = text.trim();
    if (!clean) return;

    const nlpStatus = document.getElementById('live-nlp-status');
    if (nlpStatus) nlpStatus.style.display = 'inline-block';

    // 1. Instant 0ms local extraction
    try {
      const localExtracted = window.GeminiService.parseTranscriptLocally(clean);
      if (localExtracted && localExtracted.items && localExtracted.items.length > 0) {
        this.mergeExtractedItems(localExtracted);
      }
    } catch (e) {
      console.warn('Local parse warning:', e);
    }

    // 2. Debounce call to backend Gemini (700ms pause)
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      await this.refineWithGemini(clean, window.VoiceManager.getAudioSnapshot());
      if (nlpStatus) nlpStatus.style.display = 'none';
    }, 700);
  },

  /**
   * Simulate speaking a text (e.g. from sample prompts or testing)
   */
  async simulateSpokenText(text) {
    const transcriptPreview = document.getElementById('voice-live-transcript');
    if (transcriptPreview) {
      transcriptPreview.textContent = text;
    }

    // Play feedback tone
    window.VoiceManager.playFeedbackSound('start');

    // Immediate local extraction
    const localExtracted = window.GeminiService.parseTranscriptLocally(text);
    if (localExtracted) {
      this.mergeExtractedItems(localExtracted);
    }

    // Refine with Gemini backend
    await this.refineWithGemini(text);
    window.VoiceManager.playFeedbackSound('success');
    window.App.showToast('వస్తువులు లైవ్‌గా బిల్లులో చేర్చబడ్డాయి!', 'success');
  },

  /**
   * Refine extracted items using Gemini API in background without interrupting mic
   */
  async refineWithGemini(transcript, audioBlob = null) {
    try {
      const result = await window.GeminiService.processVoiceInput({
        text: transcript,
        audioBlob,
        isDemo: false
      });

      if (result && result.success && result.transaction) {
        const geminiTx = result.transaction;
        if (geminiTx.items && geminiTx.items.length > 0) {
          // Update customer if detected
          if (geminiTx.customer_name && geminiTx.customer_name !== 'Cash Customer / రిటైల్') {
            this.activeInvoice.customer_name = geminiTx.customer_name;
            const custInput = document.getElementById('live-customer-input');
            if (custInput) custInput.value = geminiTx.customer_name;
          }

          if (geminiTx.document_type) {
            this.activeInvoice.document_type = geminiTx.document_type;
          }

          // Merge items smartly
          for (const item of geminiTx.items) {
            const existingIdx = this.activeInvoice.items.findIndex(i => 
              (item.product_id && i.product_id === item.product_id) ||
              i.name.toLowerCase() === item.name.toLowerCase()
            );
            if (existingIdx >= 0) {
              this.activeInvoice.items[existingIdx].quantity = item.quantity;
              this.activeInvoice.items[existingIdx].unit = item.unit;
            } else {
              this.activeInvoice.items.push(item);
            }
          }

          this.recalculateTotals();
          this.autoSaveLiveInvoice();
          this.renderLiveInvoicePanel();
          window.VoiceManager.playFeedbackSound('success');
        }
      }
    } catch (err) {
      console.warn('Gemini live refine error:', err);
    }
  },

  /**
   * Merge locally extracted items into active invoice immediately
   */
  mergeExtractedItems(extracted) {
    if (!extracted || !extracted.items) return;

    if (extracted.customer_name && this.activeInvoice.customer_name === 'Cash Customer / రిటైల్') {
      this.activeInvoice.customer_name = extracted.customer_name;
      const custInput = document.getElementById('live-customer-input');
      if (custInput) custInput.value = extracted.customer_name;
    }

    if (extracted.document_type) {
      this.activeInvoice.document_type = extracted.document_type;
    }

    const currentItems = [...this.activeInvoice.items];

    for (const rawItem of extracted.items) {
      const spokenName = (rawItem.spoken_name || 'వస్తువు').replace(/[\uFFFD\uFFFE]/g, '').trim();
      let product = null;

      if (rawItem.matched_product_id) {
        product = window.Store.getProductById(rawItem.matched_product_id);
      }
      if (!product) {
        const match = window.Matcher.matchProduct(spokenName);
        if (match && match.product) product = match.product;
      }

      const qty = parseFloat(rawItem.quantity) || 1;
      const unit = rawItem.unit || (product ? product.unit : 'pcs');
      const rate = (product && product.selling_price > 0) ? product.selling_price : 50;
      const gstRate = (product && this.activeInvoice.include_gst) ? (product.gst_percent || 0) : 0;
      const taxable = qty * rate;
      const gstAmount = (taxable * gstRate) / 100;

      const existingIdx = currentItems.findIndex(i => 
        (product && i.product_id === product.id) || 
        i.name.toLowerCase() === spokenName.toLowerCase()
      );

      if (existingIdx >= 0) {
        currentItems[existingIdx].quantity = qty;
        currentItems[existingIdx].unit = unit;
        currentItems[existingIdx].taxable_value = qty * currentItems[existingIdx].unit_price;
        currentItems[existingIdx].gst_amount = (currentItems[existingIdx].taxable_value * currentItems[existingIdx].gst_percent) / 100;
        currentItems[existingIdx].line_total = currentItems[existingIdx].taxable_value + currentItems[existingIdx].gst_amount;
      } else {
        currentItems.push({
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
    }

    this.activeInvoice.items = currentItems;
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  /**
   * Recalculate invoice totals and auto-save
   */
  recalculateTotals() {
    let subtotal = 0;
    let gstAmount = 0;

    for (const item of this.activeInvoice.items) {
      item.taxable_value = item.quantity * item.unit_price;
      item.gst_amount = this.activeInvoice.include_gst ? (item.taxable_value * (item.gst_percent || 0)) / 100 : 0;
      item.line_total = item.taxable_value + item.gst_amount;
      subtotal += item.taxable_value;
      gstAmount += item.gst_amount;
    }

    const discountAmount = (subtotal * (this.activeInvoice.discount_percent || 0)) / 100;
    const total = Math.round((subtotal - discountAmount + gstAmount) * 100) / 100;

    this.activeInvoice.subtotal = subtotal;
    this.activeInvoice.discount_amount = discountAmount;
    this.activeInvoice.taxable_amount = subtotal - discountAmount;
    this.activeInvoice.gst_amount = gstAmount;
    this.activeInvoice.total = total;
  },

  /**
   * Auto-save active invoice to Store continuously
   */
  autoSaveLiveInvoice() {
    if (this.activeInvoice.items && this.activeInvoice.items.length > 0) {
      if (this.activeInvoice.document_type === 'quotation') {
        window.Store.saveQuotation(this.activeInvoice);
      } else {
        window.Store.saveInvoice(this.activeInvoice);
      }
    }
  },

  updateItemQty(index, delta) {
    const item = this.activeInvoice.items[index];
    if (!item) return;
    const newQty = Math.max(0.25, Math.round((item.quantity + delta) * 100) / 100);
    item.quantity = newQty;
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  updateItemPrice(index, newPrice) {
    const item = this.activeInvoice.items[index];
    if (!item) return;
    item.unit_price = Math.max(0, parseFloat(newPrice) || 0);
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  updateItemName(index, newName) {
    const item = this.activeInvoice.items[index];
    if (!item) return;
    item.name = newName.trim();
    this.autoSaveLiveInvoice();
  },

  removeItem(index) {
    this.activeInvoice.items.splice(index, 1);
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  startNewBill() {
    this.initInvoice();
    window.App.showToast('కొత్త బిల్లు ప్రారంభించబడింది.', 'info');
    this.renderLiveInvoicePanel();
  },

  updateDiscount(val) {
    this.activeInvoice.discount_percent = Math.min(100, Math.max(0, parseFloat(val) || 0));
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  toggleGst(checked) {
    this.activeInvoice.include_gst = !!checked;
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  promptAddItem() {
    const name = prompt('వస్తువు పేరు నమోదు చేయండి (Enter Item Name):');
    if (!name || !name.trim()) return;
    const qty = parseFloat(prompt('పరిమాణం (Quantity):', '1')) || 1;
    const unit = prompt('యూనిట్ (kg / bag / pcs / pkt):', 'kg') || 'kg';
    const rate = parseFloat(prompt('ధర / Rate (₹):', '100')) || 100;

    this.activeInvoice.items.push({
      id: 'item-' + Date.now(),
      name: name.trim(),
      name_te: name.trim(),
      quantity: qty,
      unit: unit.trim(),
      unit_price: rate,
      gst_percent: this.activeInvoice.include_gst ? 5 : 0,
      taxable_value: qty * rate,
      gst_amount: this.activeInvoice.include_gst ? (qty * rate * 0.05) : 0,
      line_total: qty * rate * (this.activeInvoice.include_gst ? 1.05 : 1)
    });

    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    this.renderLiveInvoicePanel();
  },

  /**
   * Instant Print of the live bill
   */
  printLiveBill() {
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    window.DocumentGenerator.printDocument(this.activeInvoice, this.activeInvoice.document_type !== 'quotation');
  },

  /**
   * Instant WhatsApp share of the live bill
   */
  shareLiveBill() {
    this.recalculateTotals();
    this.autoSaveLiveInvoice();
    window.DocumentGenerator.shareOnWhatsApp(this.activeInvoice, this.activeInvoice.document_type !== 'quotation');
  }
};
