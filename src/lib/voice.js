/**
 * Maatlaadi Bill - Voice Capture, Speech Recognition & Waveform Visualizer (Next.js)
 * Supports MediaRecorder audio streaming, Web Speech API fallback, and Canvas Waveform
 */

import { store } from './store';
import { matcher, UNIT_SYNONYMS } from './matcher';
import { conversational } from './conversational';
import { DEMO_SCENARIOS } from './seed-data';

export class VoiceManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.animationId = null;
    this.stream = null;
    this.recognition = null;
    this.isRecording = false;
    this.liveTranscript = '';
    this.startTime = 0;
    this.lastSpeechTime = 0;
    this.speechDetected = false;

    // Callbacks
    this.onStateChange = null;
    this.onTranscriptUpdate = null;
    this.onAudioReady = null;
    this.onLiveAudioSegment = null;
    this.onSilenceDetected = null;

    if (typeof window !== 'undefined') {
      this.initSpeechRecognition();
    }
  }

  initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'te-IN';

      this.recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        this.liveTranscript = (final + ' ' + interim).trim();
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.liveTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
      };

      this.recognition.onend = () => {
        if (this.isRecording) {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    }
  }

  playFeedbackSound(type = 'start') {
    if (typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }

  async startRecording(canvasElement) {
    if (typeof window === 'undefined') return false;
    this.liveTranscript = '';
    this.audioChunks = [];
    this.startTime = Date.now();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const durationSeconds = (Date.now() - this.startTime) / 1000;
        if (this.onAudioReady) {
          this.onAudioReady(audioBlob, this.liveTranscript, durationSeconds);
        }
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.playFeedbackSound('start');

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {}
      }

      if (this.onStateChange) this.onStateChange('listening');

      if (canvasElement) {
        this.setupVisualizer(canvasElement);
      }

      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      this.playFeedbackSound('error');
      if (this.onStateChange) this.onStateChange('error', 'మైక్రోఫోన్ అనుమతి అవసరం. దయచేసి మైక్ యాక్సెస్ అనుమతించండి.');
      return false;
    }
  }

  setupVisualizer(canvas) {
    if (typeof window === 'undefined') return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const ctx = canvas.getContext('2d');

      let speechActive = false;
      let lastSpeechTimestamp = 0;
      let pauseHandled = true;
      let lastDispatchedChunkCount = 0;

      const draw = () => {
        if (!this.isRecording) return;
        this.animationId = requestAnimationFrame(draw);

        this.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;
        let volumeSum = 0;

        for (let i = 0; i < bufferLength; i++) {
          volumeSum += dataArray[i];
          barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#059669');
          gradient.addColorStop(0.5, '#10b981');
          gradient.addColorStop(1, '#34d399');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 3, barHeight, 4);
          ctx.fill();

          x += barWidth;
        }

        const avgVolume = volumeSum / bufferLength;
        const now = Date.now();

        if (avgVolume > 11) {
          speechActive = true;
          lastSpeechTimestamp = now;
          pauseHandled = false;
        } else if (speechActive && !pauseHandled && (now - lastSpeechTimestamp > 850)) {
          pauseHandled = true;
          speechActive = false;

          if (this.audioChunks.length > 0 && this.audioChunks.length !== lastDispatchedChunkCount) {
            lastDispatchedChunkCount = this.audioChunks.length;
            const segmentBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            if (this.onLiveAudioSegment) {
              this.onLiveAudioSegment(segmentBlob, this.liveTranscript);
            }
          }

          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }
      };

      draw();
    } catch (e) {
      console.warn('Waveform visualization init error:', e);
    }
  }

  getAudioSnapshot() {
    if (this.audioChunks && this.audioChunks.length > 0) {
      return new Blob(this.audioChunks, { type: 'audio/webm' });
    }
    return null;
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.playFeedbackSound('stop');

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    if (this.onStateChange) this.onStateChange('processing');
  }

  cancelRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }

    this.audioChunks = [];
    if (this.onStateChange) this.onStateChange('idle');
  }
}

export class GeminiService {
  constructor(customStore = null, customMatcher = null, customConversational = null) {
    this.store = customStore || store;
    this.matcher = customMatcher || matcher;
    this.conversational = customConversational || conversational;
  }

  async processVoiceInput(options = {}) {
    const startTime = Date.now();
    const settings = this.store.getSettings();
    const isDemo = options.isDemo !== undefined ? options.isDemo : settings.demo_mode;

    let transcript = options.text || '';
    let extractedData = null;

    if (options.scenarioId) {
      const scenario = DEMO_SCENARIOS.find(s => s.id === options.scenarioId);
      if (scenario) {
        transcript = scenario.speech;
        await new Promise(r => setTimeout(r, 450));
        extractedData = JSON.parse(JSON.stringify(scenario.expectedExtraction));
      }
    }

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

    if (!extractedData) {
      await new Promise(r => setTimeout(r, 350));
      extractedData = this.parseTranscriptLocally(transcript);
    }

    return this.buildTransactionFromExtraction(extractedData, transcript, startTime, isDemo);
  }

  parseTranscriptLocally(transcript) {
    if (!transcript) return null;
    const clean = transcript.trim();

    let docType = 'invoice';
    if (clean.includes('కోట్') || clean.includes('quotation') || clean.includes('కొటేషన్') || clean.includes('quote')) {
      docType = 'quotation';
    }

    let customerName = null;
    const customerMatch = this.matcher.matchCustomer(clean);
    if (customerMatch) {
      customerName = customerMatch.name;
    }

    let discountPercent = 0;
    const discMatch = clean.match(/(\d+)\s*(%|శాతం|percent)?\s*డిస్కౌంట్|discount/i);
    if (discMatch) {
      discountPercent = parseFloat(discMatch[1]);
    }

    let includeGst = true;
    if (clean.includes('gst తీసేయి') || clean.includes('without gst') || clean.includes('no gst')) {
      includeGst = false;
    }

    const products = this.store.getActiveProducts();
    const items = [];
    const unitSynonyms = UNIT_SYNONYMS;
    const segments = clean.split(/[,،\n]+|\s+మరియు\s+|\s+ఇంకా\s+|\s+and\s+|\+/i);

    for (const segment of segments) {
      const seg = segment.trim();
      if (!seg) continue;

      for (const p of products) {
        const matchesName = seg.toLowerCase().includes(p.name.toLowerCase()) || (p.name_te && seg.includes(p.name_te));
        const matchesAlias = p.aliases && p.aliases.some(a => seg.toLowerCase().includes(a.toLowerCase()));

        if (matchesName || matchesAlias) {
          const qty = this.matcher.parseQuantity(seg);
          let unit = p.unit;
          for (const [canonical, syns] of Object.entries(unitSynonyms)) {
            if (syns.some(s => seg.toLowerCase().includes(s))) {
              unit = canonical;
              break;
            }
          }

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
      customer = this.matcher.matchCustomer(extracted.customer_name) || {
        name: extracted.customer_name,
        phone: '',
        address: '',
        gstin: ''
      };
    }

    const docType = extracted.document_type || 'invoice';
    const rawItems = extracted.items || [];
    const transactionItems = [];
    const matchedProductsLog = [];
    let overallConfidenceSum = 0;

    rawItems.forEach(item => {
      let product = null;
      let matchStatus = 'unknown';

      if (item.matched_product_id) {
        product = this.store.getProductById(item.matched_product_id);
        if (product) matchStatus = 'exact';
      }

      if (!product && item.spoken_name) {
        const matchResult = this.matcher.matchProduct(item.spoken_name);
        matchStatus = matchResult.status;
        product = matchResult.product;
      }

      const qty = item.quantity || 1;
      const unit = item.unit || (product ? product.unit : 'pcs');
      const rate = (product && product.selling_price) ? product.selling_price : (item.unit_price || 50);
      const gstRate = (product && extracted.include_gst !== false) ? (product.gst_percent || 0) : 0;
      const taxable = qty * rate;
      const gstAmt = (taxable * gstRate) / 100;

      transactionItems.push({
        id: 'item-' + Date.now() + Math.random().toString(36).substr(2, 4),
        product_id: product ? product.id : null,
        name: item.spoken_name || (product ? product.name : 'వస్తువు'),
        name_te: product ? product.name_te : item.spoken_name,
        hsn_code: product ? product.hsn_code : '',
        quantity: qty,
        unit: unit,
        unit_price: rate,
        gst_percent: gstRate,
        taxable_value: taxable,
        gst_amount: gstAmt,
        line_total: taxable + gstAmt
      });

      matchedProductsLog.push({
        spoken: item.spoken_name,
        matched_id: product ? product.id : null,
        status: matchStatus,
        confidence: item.confidence || 0.85
      });
      overallConfidenceSum += item.confidence || 0.85;
    });

    const tx = {
      id: (docType === 'quotation' ? 'qt-' : 'inv-') + Date.now(),
      document_type: docType,
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : 'Cash Customer / రిటైల్',
      customer_phone: customer ? customer.phone : '',
      customer_address: customer ? customer.address : '',
      customer_gstin: customer ? customer.gstin : '',
      items: transactionItems,
      discount_percent: extracted.discount_percent || 0,
      include_gst: extracted.include_gst !== false,
      notes: extracted.notes || null,
      date: new Date().toISOString().split('T')[0]
    };

    const calculated = this.conversational.calculateTotals(tx);
    const procTime = Date.now() - startTime;
    const avgConfidence = rawItems.length > 0 ? overallConfidenceSum / rawItems.length : 0.85;

    this.store.logVoiceTransaction({
      raw_audio_duration_seconds: 2.5,
      transcript,
      extracted_json: extracted,
      matched_products: matchedProductsLog,
      overall_confidence: avgConfidence,
      processing_time_ms: procTime,
      final_document_type: docType,
      is_demo: isDemo
    });

    return {
      success: true,
      transaction: calculated,
      confidence: avgConfidence,
      processing_time_ms: procTime,
      transcript
    };
  }
}

export const voiceManager = new VoiceManager();
export const geminiService = new GeminiService();
