'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { matcher } from '@/lib/matcher';
import { voiceManager, geminiService } from '@/lib/voice';
import { documentGenerator } from '@/lib/pdf-generator';
import {
  MicIcon,
  MicOffIcon,
  PrinterIcon,
  QrCodeIcon,
  WhatsAppIcon,
  PlusIcon,
  TrashIcon,
  RefreshCwIcon,
  CashIcon,
  CreditCardIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PackageIcon,
  UsersIcon,
  FileTextIcon,
  BarChartIcon
} from '@/components/Icons';

export default function HomePage() {
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('తెలుగులో మాట్లాడండి... (ఉదా: “పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు”)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [cashTendered, setCashTendered] = useState('');
  const [showUpiModal, setShowUpiModal] = useState(false);

  const canvasRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Initialize fresh active invoice
  const initInvoice = () => {
    const nextNum = store.getNextInvoiceNumber();
    const newInv = {
      id: 'inv-' + Date.now(),
      invoice_number: nextNum,
      document_type: 'invoice',
      customer_id: null,
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
      payment_mode: 'cash',
      payment_status: 'paid',
      amount_paid: 0
    };
    setActiveInvoice(newInv);
    setCashTendered('');
    return newInv;
  };

  useEffect(() => {
    initInvoice();
    setCustomersList(store.getCustomers());
  }, []);

  // Desktop Keyboard Shortcuts: F2 = Mic, F4 = Print, F8 = New Bill
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        toggleRecording();
      } else if (e.key === 'F4') {
        e.preventDefault();
        printLiveBill();
      } else if (e.key === 'F8') {
        e.preventDefault();
        startNewBill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Recalculate totals helper
  const calculateInvoiceTotals = (inv) => {
    let subtotal = 0;
    let gstAmount = 0;

    const items = (inv.items || []).map(item => {
      const taxable = item.quantity * item.unit_price;
      const gstAmt = inv.include_gst ? (taxable * (item.gst_percent || 0)) / 100 : 0;
      const lineTotal = taxable + gstAmt;
      subtotal += taxable;
      gstAmount += gstAmt;
      return {
        ...item,
        taxable_value: taxable,
        gst_amount: gstAmt,
        line_total: lineTotal
      };
    });

    const discountAmount = (subtotal * (inv.discount_percent || 0)) / 100;
    const grandTotal = Math.round((subtotal - discountAmount + gstAmount) * 100) / 100;

    return {
      ...inv,
      items,
      subtotal,
      discount_amount: discountAmount,
      taxable_amount: subtotal - discountAmount,
      gst_amount: gstAmount,
      total: grandTotal
    };
  };

  // Merge locally or remote extracted items
  const mergeExtractedItems = (extracted) => {
    if (!extracted || !extracted.items) return;

    setActiveInvoice(prev => {
      if (!prev) return prev;
      let nextInv = { ...prev };

      if (extracted.customer_name && prev.customer_name === 'Cash Customer / రిటైల్') {
        nextInv.customer_name = extracted.customer_name;
      }
      if (extracted.document_type) {
        nextInv.document_type = extracted.document_type;
      }

      const currentItems = [...nextInv.items];

      for (const rawItem of extracted.items) {
        const spokenName = (rawItem.spoken_name || 'వస్తువు').replace(/[\uFFFD\uFFFE]/g, '').trim();
        let product = null;

        if (rawItem.matched_product_id) {
          product = store.getProductById(rawItem.matched_product_id);
        }
        if (!product) {
          const match = matcher.matchProduct(spokenName);
          if (match && match.product) product = match.product;
        }

        const qty = parseFloat(rawItem.quantity) || 1;
        const unit = rawItem.unit || (product ? product.unit : 'pcs');
        const rate = (product && product.selling_price > 0) ? product.selling_price : (rawItem.unit_price || 50);
        const gstRate = (product && nextInv.include_gst) ? (product.gst_percent || 0) : 0;
        const taxable = qty * rate;
        const gstAmt = (taxable * gstRate) / 100;

        const existingIdx = currentItems.findIndex(i =>
          (product && i.product_id === product.id) ||
          i.name.toLowerCase() === spokenName.toLowerCase()
        );

        if (existingIdx >= 0) {
          currentItems[existingIdx] = {
            ...currentItems[existingIdx],
            quantity: qty,
            unit: unit,
            unit_price: rate,
            taxable_value: qty * rate,
            gst_amount: gstAmt,
            line_total: taxable + gstAmt
          };
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
            gst_amount: gstAmt,
            line_total: taxable + gstAmt
          });
        }
      }

      nextInv.items = currentItems;
      const calculated = calculateInvoiceTotals(nextInv);
      autoSave(calculated);
      return calculated;
    });
  };

  const autoSave = (inv) => {
    if (inv && inv.items && inv.items.length > 0) {
      if (inv.document_type === 'quotation') {
        store.saveQuotation(inv);
      } else {
        store.saveInvoice(inv);
      }
    }
  };

  const refineWithGemini = async (speechText, audioBlob = null) => {
    setIsAnalyzing(true);
    try {
      const result = await geminiService.processVoiceInput({
        text: speechText,
        audioBlob,
        isDemo: false
      });

      if (result && result.success && result.transaction) {
        const geminiTx = result.transaction;
        if (geminiTx.items && geminiTx.items.length > 0) {
          setActiveInvoice(prev => {
            if (!prev) return prev;
            let nextInv = { ...prev };
            if (geminiTx.customer_name && geminiTx.customer_name !== 'Cash Customer / రిటైల్') {
              nextInv.customer_name = geminiTx.customer_name;
            }
            if (geminiTx.document_type) {
              nextInv.document_type = geminiTx.document_type;
            }

            const currentItems = [...nextInv.items];
            for (const item of geminiTx.items) {
              const existingIdx = currentItems.findIndex(i =>
                (item.product_id && i.product_id === item.product_id) ||
                i.name.toLowerCase() === item.name.toLowerCase()
              );
              if (existingIdx >= 0) {
                currentItems[existingIdx].quantity = item.quantity;
                currentItems[existingIdx].unit = item.unit;
              } else {
                currentItems.push(item);
              }
            }
            nextInv.items = currentItems;
            const calculated = calculateInvoiceTotals(nextInv);
            autoSave(calculated);
            return calculated;
          });
          voiceManager.playFeedbackSound('success');
        }
      }
    } catch (err) {
      console.warn('Gemini live refine error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Continuous Listening
  const toggleRecording = async () => {
    if (voiceManager.isRecording) {
      voiceManager.stopRecording();
      setIsRecording(false);
    } else {
      const started = await voiceManager.startRecording(canvasRef.current);
      if (started) {
        setIsRecording(true);
        setTranscript('వింటున్నాను... మాట్లాడండి (Live Audio Stream Active)');
      }
    }
  };

  // Wire VoiceManager Callbacks
  useEffect(() => {
    voiceManager.onTranscriptUpdate = (liveText) => {
      setTranscript(liveText || 'వింటున్నాను...');
      if (liveText && liveText.trim().length > 2) {
        // Fast local extraction
        try {
          const localExtracted = geminiService.parseTranscriptLocally(liveText.trim());
          if (localExtracted && localExtracted.items && localExtracted.items.length > 0) {
            mergeExtractedItems(localExtracted);
          }
        } catch (e) {}

        // Debounced Gemini refinement
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
          await refineWithGemini(liveText.trim(), voiceManager.getAudioSnapshot());
        }, 700);
      }
    };

    voiceManager.onLiveAudioSegment = async (blob, liveText) => {
      await refineWithGemini(liveText || '', blob);
    };

    voiceManager.onStateChange = (state, errMsg) => {
      if (state === 'listening') {
        setIsRecording(true);
      } else if (state === 'idle') {
        setIsRecording(false);
      } else if (state === 'error') {
        setIsRecording(false);
        showToast(errMsg || 'మైక్రోఫోన్ సమస్య ఏర్పడింది.');
      }
    };

    return () => {
      if (voiceManager.isRecording) {
        voiceManager.stopRecording();
      }
    };
  }, []);

  // Simulate spoken phrase (Sample chips)
  const simulateSpokenText = async (text) => {
    setTranscript(text);
    voiceManager.playFeedbackSound('start');

    const localExtracted = geminiService.parseTranscriptLocally(text);
    if (localExtracted) {
      mergeExtractedItems(localExtracted);
    }

    await refineWithGemini(text);
    voiceManager.playFeedbackSound('success');
    showToast('వస్తువులు బిల్లులో చేర్చబడ్డాయి!');
  };

  // Item modifications
  const updateItemQty = (idx, delta) => {
    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      const newQty = Math.max(0.25, Math.round((items[idx].quantity + delta) * 100) / 100);
      items[idx] = { ...items[idx], quantity: newQty };
      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });
  };

  const updateItemPrice = (idx, newPrice) => {
    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[idx] = { ...items[idx], unit_price: Math.max(0, parseFloat(newPrice) || 0) };
      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });
  };

  const updateItemName = (idx, newName) => {
    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[idx] = { ...items[idx], name: newName.trim() };
      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });
  };

  const removeItem = (idx) => {
    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = prev.items.filter((_, i) => i !== idx);
      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });
  };

  const promptAddItem = () => {
    const name = window.prompt('వస్తువు పేరు నమోదు చేయండి (Enter Item Name):');
    if (!name || !name.trim()) return;
    const qty = parseFloat(window.prompt('పరిమాణం (Quantity):', '1')) || 1;
    const unit = window.prompt('యూనిట్ (kg / bag / pcs / pkt):', 'kg') || 'kg';
    const rate = parseFloat(window.prompt('ధర / Rate (₹):', '100')) || 100;

    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = [...prev.items, {
        id: 'item-' + Date.now(),
        name: name.trim(),
        name_te: name.trim(),
        quantity: qty,
        unit: unit.trim(),
        unit_price: rate,
        gst_percent: prev.include_gst ? 5 : 0
      }];
      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });
  };

  const startNewBill = () => {
    initInvoice();
    showToast('కొత్త బిల్లు ప్రారంభించబడింది.');
  };

  const printLiveBill = () => {
    if (!activeInvoice) return;
    autoSave(activeInvoice);
    documentGenerator.printDocument(activeInvoice, activeInvoice.document_type !== 'quotation');
  };

  const shareLiveBill = () => {
    if (!activeInvoice) return;
    autoSave(activeInvoice);
    documentGenerator.shareOnWhatsApp(activeInvoice, activeInvoice.document_type !== 'quotation');
  };

  if (!activeInvoice) return null;
  const items = activeInvoice.items || [];
  const isQuotation = activeInvoice.document_type === 'quotation';
  const biz = store.getBusiness();

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
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircleIcon size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* POS Top Station Bar */}
      <div className="pos-command-bar">
        <div className="shortcut-group">
          <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>Desktop Shortcuts:</span>
          <span><kbd className="kbd-badge">F2</kbd> Mic Toggle</span>
          <span>•</span>
          <span><kbd className="kbd-badge">F4</kbd> Print Bill</span>
          <span>•</span>
          <span><kbd className="kbd-badge">F8</kbd> New Register</span>
        </div>
        <div className="terminal-id-tag">
          <span>Terminal 01</span>
          <span>•</span>
          <span>Store: {biz.name}</span>
        </div>
      </div>

      {/* Workstation 2-Column Responsive Layout */}
      <div className="live-studio-layout">

        {/* ================= LEFT COLUMN: AUDIO INPUT & VOICE CONSOLE ================= */}
        <div className="voice-studio-panel">

          {/* Console Audio Deck Card */}
          <div className="console-card">
            <div className="console-card-header">
              <div className="console-title-group">
                <div className="console-title">Voice Recognition Console</div>
                <div className="console-subtitle">వాయిస్ బిల్లింగ్ నియంత్రణ డెక్</div>
              </div>
              <div className={`audio-state-pill ${isRecording ? 'listening' : 'idle'}`}>
                {isRecording && <span className="live-indicator-dot"></span>}
                <span>{isRecording ? 'Listening...' : 'Ready'}</span>
              </div>
            </div>

            {/* Microphone Interaction Deck */}
            <div className="mic-control-deck">
              <button
                type="button"
                id="main-mic-btn"
                className={`mic-toggle-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? 'Pause Audio Input' : 'Start Audio Input [F2]'}
              >
                {isRecording ? <MicOffIcon size={22} /> : <MicIcon size={22} />}
              </button>
              <div className="mic-status-copy">
                <div className="mic-primary-text">
                  {isRecording ? 'Listening continuously (హ్యాండ్స్-ఫ్రీ)' : 'Click to Speak (లేదా F2 నొక్కండి)'}
                </div>
                <div className="mic-secondary-text">
                  Speak items naturally in Telugu. Quantities and prices parse live into the register.
                </div>
              </div>
            </div>

            {/* Audio Waveform Canvas */}
            <div className="audio-visualizer-box" style={{ display: isRecording ? 'flex' : 'none' }}>
              <canvas ref={canvasRef} className="waveform-canvas" width="360" height="36"></canvas>
              <div className="visualizer-meta">
                <span>INPUT: ACTIVE MIC</span>
                <span>STREAM: 16KHZ PCM</span>
              </div>
            </div>

            {/* Transcript Monitor */}
            <div className="transcript-terminal">
              <div className="transcript-terminal-header">
                <span>Real-Time Speech Stream</span>
                {isAnalyzing && (
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>● Processing...</span>
                )}
              </div>
              <div className="transcript-content-body">
                {transcript}
              </div>
            </div>
          </div>

          {/* Customer & Document Mode Card */}
          <div className="console-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Document Type / పత్రం రకం
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`cat-tab ${!isQuotation ? 'active' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setActiveInvoice(prev => {
                      const next = { ...prev, document_type: 'invoice' };
                      autoSave(next);
                      return next;
                    });
                  }}
                >
                  Tax Invoice
                </button>
                <button
                  type="button"
                  className={`cat-tab ${isQuotation ? 'active' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setActiveInvoice(prev => {
                      const next = { ...prev, document_type: 'quotation' };
                      autoSave(next);
                      return next;
                    });
                  }}
                >
                  Quotation
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Customer Directory / కస్టమర్
                </label>
                {activeInvoice.customer_id && (
                  <Link href={`/customer/${activeInvoice.customer_id}`} style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                    Khata Ledger →
                  </Link>
                )}
              </div>

              {/* Customer Select Dropdown */}
              <select
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12px', marginBottom: '6px' }}
                value={activeInvoice.customer_id || ''}
                onChange={(e) => {
                  const custId = e.target.value;
                  if (!custId) {
                    setActiveInvoice(prev => {
                      const next = {
                        ...prev,
                        customer_id: null,
                        customer_name: 'Cash Customer / రిటైల్',
                        customer_phone: '',
                        customer_address: '',
                        customer_gstin: ''
                      };
                      autoSave(next);
                      return next;
                    });
                  } else {
                    const cust = customersList.find(c => c.id === custId);
                    if (cust) {
                      setActiveInvoice(prev => {
                        const next = {
                          ...prev,
                          customer_id: cust.id,
                          customer_name: cust.name,
                          customer_phone: cust.phone,
                          customer_address: cust.address,
                          customer_gstin: cust.gstin
                        };
                        autoSave(next);
                        return next;
                      });
                    }
                  }
                }}
              >
                <option value="">👤 Walk-in / Cash Customer</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.current_balance > 0 ? `(బాకీ: ₹${c.current_balance})` : ''} - {c.phone}
                  </option>
                ))}
              </select>

              {/* Manual Name Override */}
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={activeInvoice.customer_name}
                placeholder="కస్టమర్ పేరు టైప్ చేయండి..."
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveInvoice(prev => {
                    const next = { ...prev, customer_name: val };
                    autoSave(next);
                    return next;
                  });
                }}
              />

              {/* Customer Khata Balance Alert */}
              {activeInvoice.customer_id && (() => {
                const cust = customersList.find(c => c.id === activeInvoice.customer_id);
                if (!cust) return null;
                const bal = cust.current_balance || 0;
                return (
                  <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: bal > 0 ? 'var(--accent-red-light)' : 'var(--primary-light)', border: `1px solid ${bal > 0 ? 'var(--accent-red-border)' : 'var(--primary-border)'}`, fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: bal > 0 ? 'var(--accent-red)' : 'var(--primary-dark)', fontWeight: 700 }}>
                      {bal > 0 ? `⚠️ మునుపటి బాకీ: ₹${bal.toLocaleString('en-IN')}` : '✓ ఖాతా క్లియర్ (No Dues)'}
                    </span>
                    <span style={{ color: 'var(--slate-500)' }}>
                      పరిమితి: ₹{(cust.credit_limit || 10000).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Voice Simulation Presets */}
          <div className="console-card">
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', letterSpacing: '0.3px' }}>
              Sample Spoken Prompts / పరీక్ష వాక్యాలు
            </div>
            <div className="preset-prompt-list">
              <div className="preset-prompt-item" onClick={() => simulateSpokenText('రమేష్కి పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు')}>
                <span>“రమేష్కి 10 బస్తాల సిమెంట్, 2 పెయింట్ బకెట్లు”</span>
                <span className="preset-chip-action">Simulate</span>
              </div>
              <div className="preset-prompt-item" onClick={() => simulateSpokenText('వంద గ్రాములు లవంగాలు, వంద గ్రాములు గసగసాలు, ఒక ప్యాకెట్ బాస్మతి బియ్యం, ఒక కిలో పంచదార')}>
                <span>“100g లవంగాలు, 100g గసగసాలు, 1 pkt బాస్మతి”</span>
                <span className="preset-chip-action">Simulate</span>
              </div>
              <div className="preset-prompt-item" onClick={() => simulateSpokenText('ఐదు కిలోల బియ్యం, రెండు కిలోల కందిపప్పు, ఒక కిలో మినప గుళ్ళు')}>
                <span>“5 kg rice, 2 kg కందిపప్పు, 1 kg మినప గుళ్ళు”</span>
                <span className="preset-chip-action">Simulate</span>
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: REGISTER / ACTIVE INVOICE TERMINAL ================= */}
        <div className="pos-register-panel">
          
          {/* Register Top Bar */}
          <div className="register-top-bar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {activeInvoice.invoice_number}
                </span>
                <span className="invoice-badge-status saved">
                  ● Auto-Saved
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px' }}>
                {isQuotation ? 'Quotation Register' : 'Tax Invoice Register'} • {activeInvoice.date}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-700)' }}>
                👤 {activeInvoice.customer_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                Items: {items.length} line items
              </div>
            </div>
          </div>

          {/* Spoken Items Register Table / Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: 1 }}>
                <MicIcon size={32} style={{ color: 'var(--slate-400)' }} />
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-800)' }}>
                  Register Empty • Ready for Voice Input
                </div>
                <div style={{ fontSize: '12px', maxWidth: '340px', lineHeight: 1.4 }}>
                  Speak items into the microphone on the left, or add manual line items below.
                </div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '6px' }} onClick={promptAddItem}>
                  <PlusIcon size={14} /> + Add Item Manually
                </button>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id || idx} className="pos-item-card">
                  {/* Row 1: Item Name, Rate, Stock Badge */}
                  <div className="item-top-row">
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.name || ''}
                        placeholder="Item Description"
                        className="item-name-input"
                        onChange={(e) => updateItemName(idx, e.target.value)}
                      />
                      <div className="item-sub-meta">
                        <span>Unit: <strong>{item.unit || 'pcs'}</strong></span>
                        {item.gst_percent ? <span>• GST: {item.gst_percent}%</span> : null}
                        
                        {/* Real-time Inventory Stock Badge */}
                        {(() => {
                          const prod = item.product_id ? store.getProductById(item.product_id) : null;
                          if (!prod) return null;
                          const stock = prod.current_stock || 0;
                          const reorder = prod.reorder_level || 5;
                          if (stock <= 0) {
                            return <span className="stock-pill out">● Out of Stock (0 {prod.unit})</span>;
                          } else if (stock <= reorder) {
                            return <span className="stock-pill low">● Low: {stock} {prod.unit}</span>;
                          } else {
                            return <span className="stock-pill in-stock">● In Stock: {stock} {prod.unit}</span>;
                          }
                        })()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>
                        {documentGenerator.formatCurrency(item.line_total)}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Stepper, Price Input, Delete */}
                  <div className="item-bottom-controls">
                    <div className="qty-stepper-control">
                      <button type="button" className="stepper-btn" onClick={() => updateItemQty(idx, -1)}>-</button>
                      <span className="stepper-value-display">{item.quantity} {item.unit || ''}</span>
                      <button type="button" className="stepper-btn" onClick={() => updateItemQty(idx, 1)}>+</button>
                    </div>

                    <div className="rate-input-box">
                      <span>Rate: ₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price || 0}
                        className="rate-input"
                        onChange={(e) => updateItemPrice(idx, e.target.value)}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>/{item.unit || 'pcs'}</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => removeItem(idx)}
                      title="Remove item"
                    >
                      <TrashIcon size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <>
              {/* Add / Reset Action Bar */}
              <div style={{ display: 'flex', gap: '8px', margin: '10px 0 12px 0' }}>
                <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={promptAddItem}>
                  <PlusIcon size={14} /> + Add Item
                </button>
                <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--accent-red)' }} onClick={startNewBill}>
                  <RefreshCwIcon size={14} /> Reset Register [F8]
                </button>
              </div>

              {/* Totals Summary Ledger */}
              <div className="totals-ledger-box">
                <div className="totals-line-row">
                  <span>Subtotal / సబ్ టోటల్:</span>
                  <span style={{ fontWeight: 600 }}>{documentGenerator.formatCurrency(activeInvoice.subtotal)}</span>
                </div>

                <div className="totals-line-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Discount / డిస్కౌంట్:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={activeInvoice.discount_percent || 0}
                      style={{ width: '45px', padding: '2px 4px', fontSize: '11px', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        setActiveInvoice(prev => {
                          const next = calculateInvoiceTotals({ ...prev, discount_percent: val });
                          autoSave(next);
                          return next;
                        });
                      }}
                    /> %
                  </span>
                  <span style={{ color: activeInvoice.discount_amount > 0 ? 'var(--accent-red)' : 'inherit' }}>
                    -{documentGenerator.formatCurrency(activeInvoice.discount_amount || 0)}
                  </span>
                </div>

                <div className="totals-line-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    GST (CGST + SGST):
                    <label style={{ fontSize: '11px', cursor: 'pointer', marginLeft: '4px' }}>
                      <input
                        type="checkbox"
                        checked={activeInvoice.include_gst !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setActiveInvoice(prev => {
                            const next = calculateInvoiceTotals({ ...prev, include_gst: checked });
                            autoSave(next);
                            return next;
                          });
                        }}
                      /> Apply GST
                    </label>
                  </span>
                  <span style={{ fontWeight: 600 }}>{documentGenerator.formatCurrency(activeInvoice.gst_amount || 0)}</span>
                </div>

                <div className="totals-line-row grand-total-row">
                  <span>Grand Total / మొత్తం:</span>
                  <span className="grand-total-val">{documentGenerator.formatCurrency(activeInvoice.total)}</span>
                </div>
              </div>

              {/* Payment Mode Selector Strip */}
              <div style={{ marginTop: '12px' }}>
                <label className="form-label" style={{ marginBottom: '4px' }}>
                  Payment Method / చెల్లింపు విధానం
                </label>
                <div className="payment-selector-strip">
                  <button
                    type="button"
                    className={`payment-chip ${activeInvoice.payment_mode === 'cash' ? 'selected' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'cash', payment_status: 'paid' };
                        autoSave(next);
                        return next;
                      });
                    }}
                  >
                    <CashIcon size={17} />
                    <span>Cash (నగదు)</span>
                  </button>

                  <button
                    type="button"
                    className={`payment-chip ${activeInvoice.payment_mode === 'upi' ? 'selected' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'upi', payment_status: 'paid' };
                        autoSave(next);
                        return next;
                      });
                      setShowUpiModal(true);
                    }}
                  >
                    <QrCodeIcon size={17} />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    className={`payment-chip credit ${activeInvoice.payment_mode === 'credit' ? 'selected credit' : ''}`}
                    onClick={() => {
                      if (!activeInvoice.customer_id) {
                        showToast('బాకీ కోసం కస్టమర్‌ను సెలెక్ట్ చేయండి.');
                      }
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'credit', payment_status: 'credit' };
                        autoSave(next);
                        return next;
                      });
                    }}
                  >
                    <CreditCardIcon size={17} />
                    <span>Udhaar (బాకీ)</span>
                  </button>

                  <button
                    type="button"
                    className={`payment-chip ${activeInvoice.payment_mode === 'partial' ? 'selected' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'partial', payment_status: 'partial' };
                        autoSave(next);
                        return next;
                      });
                    }}
                  >
                    <RefreshCwIcon size={17} />
                    <span>Split (పాక్షికం)</span>
                  </button>
                </div>

                {/* Cash Tender & Change Return Calculator */}
                {activeInvoice.payment_mode === 'cash' && (
                  <div className="tender-console">
                    <div className="tender-calc-row">
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)' }}>
                        Cash Tendered / ఇచ్చిన నగదు:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700 }}>₹</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '110px', padding: '4px 8px', fontWeight: 800, textAlign: 'right' }}
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder={String(Math.ceil(activeInvoice.total))}
                        />
                      </div>
                    </div>
                    <div className="tender-quick-buttons">
                      <button type="button" className="tender-chip-button" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total)))}>Exact</button>
                      <button type="button" className="tender-chip-button" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 100))}>+ ₹100</button>
                      <button type="button" className="tender-chip-button" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 200))}>+ ₹200</button>
                      <button type="button" className="tender-chip-button" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 500))}>+ ₹500</button>
                      <button type="button" className="tender-chip-button" onClick={() => setCashTendered('2000')}>₹2000 Note</button>
                    </div>
                    {parseFloat(cashTendered) >= activeInvoice.total && (
                      <div className="change-due-box">
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
                          Return Change / చిల్లర:
                        </span>
                        <span style={{ fontSize: '17px', fontWeight: 900, color: '#065f46' }}>
                          ₹{(parseFloat(cashTendered) - activeInvoice.total).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Credit Notice */}
                {activeInvoice.payment_mode === 'credit' && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-amber-light)', border: '1px solid var(--accent-amber-border)', fontSize: '12px', color: 'var(--accent-amber)' }}>
                    <strong>Udhaar Record:</strong> Invoice total of ₹{activeInvoice.total.toFixed(2)} will be debited to customer Khata.
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="action-grid-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={printLiveBill}
                  title="Print Standard A4 Invoice [Shortcut: F4]"
                >
                  <PrinterIcon size={16} /> Print Bill [F4]
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (!activeInvoice) return;
                    autoSave(activeInvoice);
                    documentGenerator.printThermal(activeInvoice);
                  }}
                  title="Print 80mm/58mm Thermal Receipt Slip"
                >
                  <FileTextIcon size={16} /> Thermal Slip
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUpiModal(true)}
                  style={{ color: 'var(--primary-dark)', borderColor: 'var(--primary-border)', background: 'var(--primary-light)' }}
                  title="Display UPI QR Code on Counter Screen"
                >
                  <QrCodeIcon size={16} /> UPI QR Screen
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={shareLiveBill}
                >
                  <WhatsAppIcon size={16} /> WhatsApp
                </button>
              </div>
            </>
          )}

        </div>

      </div>

      {/* Dynamic Bharat UPI QR Counter Modal */}
      {showUpiModal && activeInvoice && (
        <div className="modal-backdrop-overlay" onClick={() => setShowUpiModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--slate-900)' }}>
                Bharat UPI Counter Terminal
              </div>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'inline-block', margin: '0 auto 12px', boxShadow: 'var(--shadow-xs)' }}>
              <img
                src={documentGenerator.getUpiQrUrl(activeInvoice.total, activeInvoice.invoice_number)}
                alt="UPI QR Code"
                style={{ width: '200px', height: '200px', display: 'block', borderRadius: '4px' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--slate-600)', marginBottom: '4px' }}>
              Scan with Google Pay, PhonePe, Paytm or Any UPI App
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '4px' }}>
              {documentGenerator.formatCurrency(activeInvoice.total)}
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--slate-500)', marginBottom: '18px' }}>
              UPI ID: <strong>{biz.upi_id}</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  setShowUpiModal(false);
                  showToast('చెల్లింపు ధృవీకరించబడింది!');
                }}
              >
                <CheckCircleIcon size={16} /> Mark as Received
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowUpiModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
