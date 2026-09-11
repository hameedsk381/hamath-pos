'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { matcher } from '@/lib/matcher';
import { voiceManager, geminiService } from '@/lib/voice';
import { documentGenerator } from '@/lib/pdf-generator';

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
        setTranscript('వింటున్నాను... మాట్లాడండి (Live Listening Active)');
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
    showToast('వస్తువులు లైవ్‌గా బిల్లులో చేర్చబడ్డాయి!');
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
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ {toastMessage}
        </div>
      )}

      {/* Desktop Fast Keys Ribbon */}
      <div className="shortcut-ribbon" style={{ marginBottom: '14px' }}>
        <span>⌨️ <strong>డెస్క్‌టాప్ కౌంటర్ కీలు:</strong></span>
        <span><kbd className="shortcut-badge">F2</kbd> మైక్ ఆన్/ఆఫ్ (Voice)</span>
        <span>•</span>
        <span><kbd className="shortcut-badge">F4</kbd> ప్రింట్ ఇన్వాయిస్ (Print)</span>
        <span>•</span>
        <span><kbd className="shortcut-badge">F8</kbd> కొత్త బిల్లు (New Bill)</span>
        <span style={{ marginLeft: 'auto', color: 'var(--primary-dark)', fontWeight: 700 }}>
          ⚡ Fast Counter Station
        </span>
      </div>

      {/* Live Hands-Free Studio 2-Column Responsive Layout */}
      <div className="live-studio-layout">
        
        {/* ================= LEFT COLUMN: HANDS-FREE VOICE STUDIO ================= */}
        <div className="voice-studio-panel">
          <div className="voice-hero-card">
            <div className="voice-hero-title">Maatlaadi Bill</div>
            <div className="voice-hero-tagline">“మాట్లాడితే బిల్ రెడీ.” (Speak naturally - Live Bill)</div>

            <div className="mic-action-container">
              <div className={`mic-halo-ring ${isRecording ? 'recording' : ''}`}></div>
              <button
                type="button"
                id="main-mic-btn"
                className={`mic-button ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? 'రికార్డింగ్ ఆపండి' : 'వాయిస్ రికార్డింగ్ ప్రారంభించండి'}
              >
                🎙️
              </button>
              <div className="mic-label-main">
                {isRecording ? 'వింటున్నాను... (Listening)' : 'మాట్లాడండి'}
              </div>
              <div className="mic-label-sub">
                {isRecording
                  ? 'మీరు మాట్లాడే ప్రతి వస్తువు కుడివైపు బిల్లులో లైవ్‌గా చేరుతుంది'
                  : 'మైక్ నొక్కి మాట్లాడండి - లైవ్‌గా బిల్ రెడీ అవుతుంది'}
              </div>
            </div>

            {/* Active Waveform & Status Indicator */}
            <div className="voice-active-box" style={{ display: isRecording ? 'flex' : 'none' }}>
              <canvas ref={canvasRef} className="waveform-canvas" width="320" height="48"></canvas>
              <div className="voice-status-text">
                <span className="pulse-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                <span>🔴 ఎల్లప్పుడూ వింటున్నాను (Live Hands-Free Listening)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                ✓ బటన్ నొక్కాల్సిన పనిలేదు. మాట్లాడటం ఆపగానే బిల్లు ఆటో-అప్‌డేట్ అవుతుంది.
              </div>
              <div className="voice-action-controls" style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={toggleRecording}
                >
                  ⏸️ మైక్ పాజ్ (Mute Mic)
                </button>
              </div>
            </div>

            {/* Live Speech-to-Text Transcript Preview */}
            <div style={{ marginTop: '14px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  🗣️ మీరు మాట్లాడినది (Live Transcript):
                </span>
                {isAnalyzing && (
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>
                    ● AI అప్‌డేట్ చేస్తోంది...
                  </span>
                )}
              </div>
              <div className="voice-transcript-preview" style={{ minHeight: '48px', textAlign: 'left', fontSize: '13px' }}>
                {transcript}
              </div>
            </div>
          </div>

          {/* Customer & Document Type Controls */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                పత్రం రకం / Mode:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`cat-tab ${!isQuotation ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setActiveInvoice(prev => {
                      const next = { ...prev, document_type: 'invoice' };
                      autoSave(next);
                      return next;
                    });
                  }}
                >
                  ఇన్వాయిస్ (Invoice)
                </button>
                <button
                  type="button"
                  className={`cat-tab ${isQuotation ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setActiveInvoice(prev => {
                      const next = { ...prev, document_type: 'quotation' };
                      autoSave(next);
                      return next;
                    });
                  }}
                >
                  కొటేషన్ (Quotation)
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  కస్టమర్ / Customer Directory:
                </label>
                {activeInvoice.customer_id && (
                  <Link href={`/customer/${activeInvoice.customer_id}`} style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                    ఖాతా లెడ్జర్ చూడండి →
                  </Link>
                )}
              </div>

              {/* Quick Customer Picker Dropdown */}
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
                <option value="">👤 రిటైల్ నగదు కస్టమర్ (Walk-in / Cash Customer)</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.current_balance > 0 ? `(బాకీ: ₹${c.current_balance})` : ''} - {c.phone}
                  </option>
                ))}
              </select>

              {/* Custom Name Override */}
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={activeInvoice.customer_name}
                placeholder="కస్టమర్ పేరు టైప్ చేయండి"
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveInvoice(prev => {
                    const next = { ...prev, customer_name: val };
                    autoSave(next);
                    return next;
                  });
                }}
              />

              {/* Khata Balance Notice if selected */}
              {activeInvoice.customer_id && (() => {
                const cust = customersList.find(c => c.id === activeInvoice.customer_id);
                if (!cust) return null;
                const bal = cust.current_balance || 0;
                return (
                  <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: bal > 0 ? '#fef2f2' : '#ecfdf5', border: `1px solid ${bal > 0 ? '#fecaca' : '#a7f3d0'}`, fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: bal > 0 ? '#b91c1c' : '#065f46', fontWeight: 700 }}>
                      {bal > 0 ? `⚠️ మునుపటి ఖాతా బాకీ: ₹${bal.toLocaleString('en-IN')}` : '✓ మునుపటి బాకీ ఏమీ లేదు (No Due)'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      పరిమితి: ₹{(cust.credit_limit || 10000).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Interactive Sample Telugu Prompts */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              💡 నమూనా వాక్యాలు (Click to simulate live voice):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="sample-prompt-chip" onClick={() => simulateSpokenText('రమేష్కి పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు')}>
                <span>🗣️</span> <span>“రమేష్కి 10 బస్తాల సిమెంట్, 2 పెయింట్ బకెట్లు”</span>
              </div>
              <div className="sample-prompt-chip" onClick={() => simulateSpokenText('వంద గ్రాములు లవంగాలు, వంద గ్రాములు గసగసాలు, ఒక ప్యాకెట్ బాస్మతి బియ్యం, ఒక కిలో పంచదార')}>
                <span>🗣️</span> <span>“100g లవంగాలు, 100g గసగసాలు, 1 pkt బాస్మతి, 1 kg పంచదార”</span>
              </div>
              <div className="sample-prompt-chip" onClick={() => simulateSpokenText('ఐదు కిలోల బియ్యం, రెండు కిలోల కందిపప్పు, ఒక కిలో మినప గుళ్ళు')}>
                <span>🗣️</span> <span>“5 kg rice, 2 kg కందిపప్పు, 1 kg మినప గుళ్ళు”</span>
              </div>
              <div className="sample-prompt-chip" onClick={() => simulateSpokenText('సురేష్‌కి మూడు స్విచ్ బోర్డులు, ఇరవై మీటర్ల వైర్ కోట్ చెయ్యి')}>
                <span>🗣️</span> <span>“సురేష్‌కి 3 స్విచ్ బోర్డులు, 20m వైర్ కోట్ చెయ్యి”</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation Shortcuts */}
          <div className="quick-actions-grid" style={{ marginBottom: 0 }}>
            <Link href="/products" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon" style={{ background: '#ecfdf5', color: '#059669' }}>📦</div>
              <div>
                <div className="quick-action-title">ఉత్పత్తులు</div>
                <div className="quick-action-sub">Items Catalogue</div>
              </div>
            </Link>
            <Link href="/customers" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>👥</div>
              <div>
                <div className="quick-action-title">కస్టమర్లు</div>
                <div className="quick-action-sub">Directory</div>
              </div>
            </Link>
            <Link href="/documents" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📄</div>
              <div>
                <div className="quick-action-title">బిల్లులు</div>
                <div className="quick-action-sub">Bills History</div>
              </div>
            </Link>
            <Link href="/dashboard" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📊</div>
              <div>
                <div className="quick-action-title">రిపోర్ట్</div>
                <div className="quick-action-sub">Dashboard</div>
              </div>
            </Link>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: THE LIVE AUTO-GENERATED INVOICE ================= */}
        <div className="live-items-panel">
          {/* Live Invoice Header */}
          <div style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  {isQuotation ? '📋 లైవ్ కొటేషన్ (LIVE QUOTATION)' : '🧾 లైవ్ టాక్స్ ఇన్వాయిస్ (LIVE TAX INVOICE)'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {activeInvoice.invoice_number || 'INV-LIVE'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>{biz.name}</strong> • {biz.city}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', border: '1px solid #a7f3d0', display: 'inline-block', marginBottom: '4px' }}>
                  ✓ ఆటో-సేవ్ అయింది (Auto-Saved)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  📅 {activeInvoice.date}
                </div>
              </div>
            </div>

            {/* Customer Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: '6px', marginTop: '10px', fontSize: '13px' }}>
              <div>
                👤 కస్టమర్: <strong>{activeInvoice.customer_name || 'Cash Customer'}</strong>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                వస్తువులు: <strong>{items.length}</strong>
              </div>
            </div>
          </div>

          {/* Spoken Items List */}
          <div className="spoken-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', flex: 1 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 16px', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1.5px dashed var(--border-color)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: 1 }}>
                <div style={{ fontSize: '38px' }}>🎙️ ⚡</div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                  వాయిస్ వినడానికి సిద్ధంగా ఉంది (Ready for Speech)
                </div>
                <div style={{ fontSize: '12px', maxWidth: '320px', lineHeight: 1.5 }}>
                  ఎడమవైపు మైక్ ఆన్ చేసి వస్తువులు చెప్పండి. ఏ బటన్ నొక్కకుండానే ప్రతి వస్తువు ఇక్కడ లైవ్‌గా చేరి బిల్లు తయారవుతుంది!
                </div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '8px' }} onClick={promptAddItem}>
                  + మాన్యువల్‌గా చేర్చండి (+ Add Item)
                </button>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id || idx} className="spoken-item-card" style={{ background: '#ffffff', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', boxShadow: 'var(--shadow-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Row 1: Name & Price & Stock Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.name || ''}
                        placeholder="వస్తువు పేరు"
                        style={{ width: '100%', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', border: '1px solid transparent', background: 'transparent', padding: '2px 4px', borderRadius: '4px', outline: 'none' }}
                        onChange={(e) => updateItemName(idx, e.target.value)}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', paddingLeft: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          యూనిట్: <strong>{item.unit || 'pcs'}</strong> {item.gst_percent ? `| GST: ${item.gst_percent}%` : ''}
                        </span>
                        {/* Real-time Inventory Stock Badge */}
                        {(() => {
                          const prod = item.product_id ? store.getProductById(item.product_id) : null;
                          if (!prod) return null;
                          const stock = prod.current_stock || 0;
                          const reorder = prod.reorder_level || 5;
                          if (stock <= 0) {
                            return <span className="stock-tag-pill out-stock">❌ స్టాక్ అయిపోయింది (0 {prod.unit})</span>;
                          } else if (stock <= reorder) {
                            return <span className="stock-tag-pill low-stock">⚠️ తక్కువ స్టాక్: {stock} {prod.unit}</span>;
                          } else {
                            return <span className="stock-tag-pill in-stock">✓ స్టాక్: {stock} {prod.unit}</span>;
                          }
                        })()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--primary)' }}>
                        {documentGenerator.formatCurrency(item.line_total)}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Stepper, Price Input, Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div className="qty-stepper">
                      <button type="button" className="stepper-btn" onClick={() => updateItemQty(idx, -1)}>-</button>
                      <span className="stepper-val">{item.quantity} {item.unit || ''}</span>
                      <button type="button" className="stepper-btn" onClick={() => updateItemQty(idx, 1)}>+</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>ధర: ₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price || 0}
                        style={{ width: '78px', textAlign: 'right', padding: '4px 6px', fontSize: '13px', fontWeight: 800, border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-main)' }}
                        onChange={(e) => updateItemPrice(idx, e.target.value)}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{item.unit || 'pcs'}</span>
                    </div>

                    <button
                      type="button"
                      style={{ border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '5px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => removeItem(idx)}
                      title="వస్తువును తొలగించండి"
                    >
                      🗑️ తీసేయి
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <>
              {/* Add Item Quick Action */}
              <div style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={promptAddItem}>
                  + మాన్యువల్ వస్తువు (+ Add Item)
                </button>
                <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }} onClick={startNewBill}>
                  🔄 కొత్త బిల్లు (New Bill [F8])
                </button>
              </div>

              {/* Totals Breakdown */}
              <div className="totals-summary-box">
                <div className="total-row">
                  <span>సబ్ టోటల్ / Subtotal:</span>
                  <span>{documentGenerator.formatCurrency(activeInvoice.subtotal)}</span>
                </div>

                <div className="total-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    డిస్కౌంట్ / Discount:
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={activeInvoice.discount_percent || 0}
                      style={{ width: '45px', padding: '2px 4px', fontSize: '11px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
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
                  <span style={{ color: activeInvoice.discount_amount > 0 ? 'var(--danger)' : 'inherit' }}>
                    -{documentGenerator.formatCurrency(activeInvoice.discount_amount || 0)}
                  </span>
                </div>

                <div className="total-row">
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
                  <span>{documentGenerator.formatCurrency(activeInvoice.gst_amount || 0)}</span>
                </div>

                <div className="total-row grand-total">
                  <span>మొత్తం / Grand Total:</span>
                  <span style={{ color: 'var(--primary)', fontSize: '22px' }}>{documentGenerator.formatCurrency(activeInvoice.total)}</span>
                </div>
              </div>

              {/* Payment Mode Selector Pills */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  చెల్లింపు విధానం / Payment Mode:
                </label>
                <div className="payment-mode-selector">
                  <button
                    type="button"
                    className={`payment-mode-pill ${activeInvoice.payment_mode === 'cash' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'cash', payment_status: 'paid' };
                        autoSave(next);
                        return next;
                      });
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>💵</span>
                    <span>నగదు (Cash)</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-mode-pill ${activeInvoice.payment_mode === 'upi' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'upi', payment_status: 'paid' };
                        autoSave(next);
                        return next;
                      });
                      setShowUpiModal(true);
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>📲</span>
                    <span>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-mode-pill credit ${activeInvoice.payment_mode === 'credit' ? 'active credit' : ''}`}
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
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span>బాకీ (Udhaar)</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-mode-pill ${activeInvoice.payment_mode === 'partial' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveInvoice(prev => {
                        const next = { ...prev, payment_mode: 'partial', payment_status: 'partial' };
                        autoSave(next);
                        return next;
                      });
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>🔀</span>
                    <span>స్ప్లిట్ (Split)</span>
                  </button>
                </div>

                {/* Cash Tender & Change Calculator (if mode is Cash) */}
                {activeInvoice.payment_mode === 'cash' && (
                  <div className="tender-calc-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>💵 ఇచ్చిన నగదు (Tendered Cash):</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700 }}>₹</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '110px', padding: '4px 8px', fontWeight: 800, textAlign: 'right', fontSize: '13px' }}
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder={String(Math.ceil(activeInvoice.total))}
                        />
                      </div>
                    </div>
                    <div className="tender-chips-row">
                      <button type="button" className="tender-chip-btn" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total)))}>Exact (సరిగ్గా)</button>
                      <button type="button" className="tender-chip-btn" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 100))}>+ ₹100</button>
                      <button type="button" className="tender-chip-btn" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 200))}>+ ₹200</button>
                      <button type="button" className="tender-chip-btn" onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 500))}>+ ₹500</button>
                      <button type="button" className="tender-chip-btn" onClick={() => setCashTendered('2000')}>₹2000 Note</button>
                    </div>
                    {parseFloat(cashTendered) >= activeInvoice.total && (
                      <div className="change-return-highlight">
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
                          🤝 తిరిగి ఇవ్వాల్సిన చిల్లర (Change to Return):
                        </span>
                        <span style={{ fontSize: '17px', fontWeight: 900, color: '#065f46' }}>
                          ₹{(parseFloat(cashTendered) - activeInvoice.total).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Credit / Udhaar Notice */}
                {activeInvoice.payment_mode === 'credit' && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                    ⚠️ <strong>బాకీ ఖాటా బిల్లు:</strong> ఈ బిల్లు మొత్తం (₹{activeInvoice.total.toFixed(2)}) కస్టమర్ లెడ్జర్‌లో జమ అవుతుంది.
                  </div>
                )}
              </div>

              {/* Instant Actions (Print A4, Thermal Slip, Show QR, WhatsApp) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={printLiveBill}
                  style={{ fontSize: '13px', padding: '10px 8px', fontWeight: 800 }}
                  title="Print Standard A4 Invoice [Shortcut: F4]"
                >
                  🖨️ A4 ప్రింట్ [F4]
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    if (!activeInvoice) return;
                    autoSave(activeInvoice);
                    documentGenerator.printThermal(activeInvoice);
                  }}
                  style={{ fontSize: '13px', padding: '10px 8px', fontWeight: 800 }}
                  title="Print 80mm/58mm Thermal Roll Slip"
                >
                  🧾 థర్మల్ రసీదు (Slip)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUpiModal(true)}
                  style={{ fontSize: '13px', padding: '10px 8px', fontWeight: 800, color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                  title="Display Dynamic UPI QR on Screen"
                >
                  📲 UPI QR స్క్రీన్
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={shareLiveBill}
                  style={{ background: '#25d366', borderColor: '#25d366', fontSize: '13px', padding: '10px 8px', fontWeight: 800 }}
                >
                  💬 WhatsApp
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
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                📲 Bharat UPI స్కాన్ & పే
              </div>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-block', margin: '0 auto 14px' }}>
              <img
                src={documentGenerator.getUpiQrUrl(activeInvoice.total, activeInvoice.invoice_number)}
                alt="UPI QR Code"
                style={{ width: '210px', height: '210px', display: 'block', borderRadius: '8px' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Google Pay, PhonePe, Paytm లేదా ఏదైనా UPI యాప్‌తో స్కాన్ చేయండి
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)', marginBottom: '6px' }}>
              {documentGenerator.formatCurrency(activeInvoice.total)}
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '18px' }}>
              UPI ID: <strong>{biz.upi_id}</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                onClick={() => {
                  setShowUpiModal(false);
                  showToast('చెల్లింపు ధృవీకరించబడింది!');
                }}
              >
                ✓ చెల్లింపు పూర్తయింది (Done)
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowUpiModal(false)}
              >
                మూసివేయి (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
