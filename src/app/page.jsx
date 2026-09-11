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
  SearchIcon,
  UserIcon
} from '@/components/Icons';

export default function HomePage() {
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('తెలుగులో మాట్లాడండి... (ఉదా: “పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు”)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [showUpiModal, setShowUpiModal] = useState(false);

  const canvasRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const categories = ['All', 'Cement', 'Paint', 'Hardware', 'Electrical', 'Plumbing', 'Grocery'];

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
    setProductsList(store.getProducts());
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
      total: grandTotal,
      amount_paid: inv.payment_status === 'paid' ? grandTotal : inv.amount_paid || 0
    };
  };

  const autoSave = (inv) => {
    if (!inv || !inv.id) return;
    if (inv.document_type === 'quotation') {
      store.saveQuotation(inv);
    } else {
      store.saveInvoice(inv);
    }
  };

  // 1-Click Quick Add Product to Active Bill
  const addProductToBill = (product) => {
    setActiveInvoice(prev => {
      if (!prev) return prev;
      const items = [...(prev.items || [])];
      const existingIdx = items.findIndex(i => i.product_id === product.id);

      if (existingIdx >= 0) {
        items[existingIdx] = {
          ...items[existingIdx],
          quantity: items[existingIdx].quantity + 1
        };
      } else {
        items.push({
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          product_id: product.id,
          name: product.name,
          name_te: product.name_te || '',
          quantity: 1,
          unit: product.unit || 'pcs',
          unit_price: product.selling_price || 0,
          gst_percent: product.gst_percent !== undefined ? product.gst_percent : 18
        });
      }

      const calculated = calculateInvoiceTotals({ ...prev, items });
      autoSave(calculated);
      return calculated;
    });

    voiceManager.playFeedbackSound('click');
  };

  // Process live spoken Telugu text into bill items
  const mergeExtractedItems = (extractedData) => {
    if (!extractedData || !extractedData.items || extractedData.items.length === 0) return;

    setActiveInvoice(prev => {
      if (!prev) return prev;

      let currentItems = [...(prev.items || [])];

      extractedData.items.forEach(rawItem => {
        const matchedProduct = matcher.findBestMatch(rawItem.product_name, productsList);

        const productName = matchedProduct ? matchedProduct.name : (rawItem.product_name || 'వస్తువు');
        const unitPrice = matchedProduct
          ? matchedProduct.selling_price
          : (rawItem.unit_price || 100);
        const unit = rawItem.unit || (matchedProduct ? matchedProduct.unit : 'pcs');
        const gst = matchedProduct ? matchedProduct.gst_percent : 18;
        const qty = rawItem.quantity || 1;

        const existingIdx = currentItems.findIndex(i =>
          i.name.toLowerCase() === productName.toLowerCase() ||
          (matchedProduct && i.product_id === matchedProduct.id)
        );

        if (existingIdx >= 0) {
          currentItems[existingIdx] = {
            ...currentItems[existingIdx],
            quantity: currentItems[existingIdx].quantity + qty
          };
        } else {
          currentItems.push({
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            product_id: matchedProduct ? matchedProduct.id : null,
            name: productName,
            name_te: rawItem.product_name_te || (matchedProduct ? matchedProduct.name_te : ''),
            quantity: qty,
            unit: unit,
            unit_price: unitPrice,
            gst_percent: gst
          });
        }
      });

      let updatedCustomer = {
        customer_id: prev.customer_id,
        customer_name: prev.customer_name,
        customer_phone: prev.customer_phone,
        customer_address: prev.customer_address
      };

      if (extractedData.customer_name && (!prev.customer_id || prev.customer_name.includes('Cash Customer'))) {
        const matchedCust = matcher.findCustomer(extractedData.customer_name, customersList);
        if (matchedCust) {
          updatedCustomer = {
            customer_id: matchedCust.id,
            customer_name: matchedCust.name,
            customer_phone: matchedCust.phone || '',
            customer_address: matchedCust.address || ''
          };
        } else {
          updatedCustomer = {
            customer_id: null,
            customer_name: extractedData.customer_name,
            customer_phone: '',
            customer_address: ''
          };
        }
      }

      const updated = {
        ...prev,
        items: currentItems,
        ...updatedCustomer,
        document_type: extractedData.document_type || prev.document_type,
        payment_mode: extractedData.payment_mode || prev.payment_mode
      };

      const calculated = calculateInvoiceTotals(updated);
      autoSave(calculated);
      return calculated;
    });

    voiceManager.playFeedbackSound('success');
  };

  const refineWithGemini = async (currentTranscript, audioBlob = null) => {
    if (!currentTranscript || currentTranscript.trim().length < 3) return;
    setIsAnalyzing(true);

    try {
      const result = await geminiService.parseTeluguBillingVoice(currentTranscript, productsList, audioBlob);
      if (result && result.items && result.items.length > 0) {
        mergeExtractedItems(result);
        store.logVoiceTransaction({
          transcript: currentTranscript,
          extracted_json: result,
          processing_time_ms: result.latency_ms || 280,
          overall_confidence: result.confidence || 0.96
        });
      }
    } catch (err) {
      console.warn('Gemini streaming parse error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      voiceManager.stopRecording();
      setIsRecording(false);
      showToast('వాయిస్ రికార్డింగ్ ఆపబడింది.');
    } else {
      try {
        await voiceManager.startRecording(canvasRef.current);
        setIsRecording(true);
        showToast('మైక్రోఫోన్ ఆన్ అయింది. తెలుగులో మాట్లాడండి...');
      } catch (err) {
        console.error('Failed to start recording:', err);
        showToast('మైక్రోఫోన్ ప్రారంభించడం విఫలమైంది: ' + err.message);
      }
    }
  };

  // Wire Voice Callbacks
  useEffect(() => {
    voiceManager.onTranscript = (liveText) => {
      setTranscript(liveText);
      const localExtracted = geminiService.parseTranscriptLocally(liveText);
      if (localExtracted && localExtracted.items && localExtracted.items.length > 0) {
        mergeExtractedItems(localExtracted);
      }

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        refineWithGemini(liveText);
      }, 700);
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
  }, [productsList, customersList]);

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
        gst_percent: prev.include_gst ? 18 : 0
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
    if (!activeInvoice || activeInvoice.items.length === 0) {
      showToast('బిల్లు ప్రింట్ చేయడానికి కనీసం ఒక వస్తువును చేర్చండి.');
      return;
    }
    autoSave(activeInvoice);
    documentGenerator.printDocument(activeInvoice, activeInvoice.document_type !== 'quotation');
  };

  const shareLiveBill = () => {
    if (!activeInvoice || activeInvoice.items.length === 0) {
      showToast('బిల్లు షేర్ చేయడానికి కనీసం ఒక వస్తువును చేర్చండి.');
      return;
    }
    autoSave(activeInvoice);
    documentGenerator.shareOnWhatsApp(activeInvoice, activeInvoice.document_type !== 'quotation');
  };

  if (!activeInvoice) return null;
  const items = activeInvoice.items || [];
  const isQuotation = activeInvoice.document_type === 'quotation';
  const biz = store.getBusiness();

  // Filter Catalog Products
  const filteredCatalog = productsList.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const q = catalogSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.name_te && p.name_te.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="view-container" style={{ padding: '16px 20px' }}>
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
          <CheckCircleIcon size={16} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Workstation 2-Column Responsive Layout */}
      <div className="live-studio-layout">

        {/* ================= LEFT COLUMN: VOICE COMMAND & QUICK CATALOG ================= */}
        <div className="voice-studio-panel">

          {/* Voice Input Deck Card */}
          <div className="console-card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--slate-900)' }}>
                  Telugu Voice Command Terminal
                </div>
                <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                  (మాట్లాడితే బిల్ రెడీ)
                </div>
              </div>
              <div className={`audio-state-pill ${isRecording ? 'listening' : 'idle'}`}>
                {isRecording && <span className="live-indicator-dot"></span>}
                <span>{isRecording ? '● Listening...' : 'Ready'}</span>
              </div>
            </div>

            {/* Microphone Toggle Deck */}
            <div className="mic-control-deck" style={{ padding: '10px 14px' }}>
              <button
                type="button"
                id="main-mic-btn"
                className={`mic-toggle-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? 'Pause Voice Recording' : 'Start Voice Input [F2]'}
                style={{ width: '46px', height: '46px' }}
              >
                {isRecording ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
              </button>
              <div className="mic-status-copy">
                <div className="mic-primary-text" style={{ fontSize: '13px' }}>
                  {isRecording ? 'Listening continuously (హ్యాండ్స్-ఫ్రీ మోడ్)' : 'Click to Speak (లేదా కీబోర్డులో F2 నొక్కండి)'}
                </div>
                <div className="mic-secondary-text" style={{ fontSize: '11px' }}>
                  Speak items naturally in Telugu. Quantities and prices parse live into the active register.
                </div>
              </div>
            </div>

            {/* Visualizer Canvas */}
            <div className="audio-visualizer-box" style={{ display: isRecording ? 'flex' : 'none', marginTop: '8px', padding: '6px 10px' }}>
              <canvas ref={canvasRef} className="waveform-canvas" width="360" height="28"></canvas>
            </div>

            {/* Transcript Stream Pill */}
            <div style={{ marginTop: '10px', background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Live Stream:</span>
              <span style={{ color: 'var(--slate-800)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {transcript}
              </span>
              {isAnalyzing && <span style={{ fontSize: '10px', color: 'var(--primary-dark)', fontWeight: 700 }}>● Processing...</span>}
            </div>

            {/* Quick Test Voice Chips */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '10px', paddingBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--slate-400)', alignSelf: 'center', whiteSpace: 'nowrap' }}>Test:</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                onClick={() => simulateSpokenText('రమేష్కి పది బస్తాల సిమెంట్, రెండు పెయింట్ బకెట్లు')}
              >
                10 బస్తాల సిమెంట్, 2 పెయింట్
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                onClick={() => simulateSpokenText('వంద గ్రాములు లవంగాలు, వంద గ్రాములు గసగసాలు, ఒక ప్యాకెట్ బాస్మతి బియ్యం')}
              >
                100g లవంగాలు, 1 pkt బాస్మతి
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                onClick={() => simulateSpokenText('ఐదు కిలోల బియ్యం, రెండు కిలోల కందిపప్పు')}
              >
                5 kg rice, 2 kg కందిపప్పు
              </button>
            </div>
          </div>

          {/* Quick-Add Product Catalogue Section */}
          <div className="quick-catalog-section">
            <div className="quick-catalog-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--slate-900)' }}>
                  Quick-Add Catalogue
                </div>
                <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                  Click item to add directly to the active bill
                </div>
              </div>

              {/* Instant Filter Search */}
              <div style={{ position: 'relative', width: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '5px 8px 5px 28px', fontSize: '12px', height: '30px' }}
                  placeholder="Search catalog..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
                <SearchIcon size={14} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--slate-400)' }} />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="category-pill-strip">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
                  style={{ padding: '3px 10px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Quick-Add Grid */}
            <div className="quick-catalog-grid">
              {filteredCatalog.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: 'var(--slate-400)', fontSize: '12px' }}>
                  No items match this search.
                </div>
              ) : (
                filteredCatalog.map(p => {
                  const stock = p.current_stock !== undefined ? p.current_stock : 0;
                  const reorder = p.reorder_level || 5;
                  return (
                    <div
                      key={p.id}
                      className="product-quick-card"
                      onClick={() => addProductToBill(p)}
                      title={`Add 1 ${p.unit} of ${p.name} to bill`}
                    >
                      <div>
                        <div className="product-card-title">{p.name}</div>
                        {p.name_te && <div className="product-card-te">{p.name_te}</div>}
                      </div>
                      <div className="product-card-footer">
                        <div className="product-card-price">
                          ₹{p.selling_price}
                          <span className="product-card-unit">/{p.unit}</span>
                        </div>
                        {stock <= 0 ? (
                          <span className="stock-pill out" style={{ fontSize: '9px', padding: '1px 4px' }}>0 {p.unit}</span>
                        ) : stock <= reorder ? (
                          <span className="stock-pill low" style={{ fontSize: '9px', padding: '1px 4px' }}>{stock} {p.unit}</span>
                        ) : (
                          <span className="stock-pill in-stock" style={{ fontSize: '9px', padding: '1px 4px' }}>{stock}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: REGISTER BILL & TENDER TERMINAL ================= */}
        <div className="pos-register-panel">
          
          {/* Register Top Bar */}
          <div className="register-top-bar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--slate-900)', fontVariantNumeric: 'tabular-nums' }}>
                  {activeInvoice.invoice_number}
                </span>
                <span className="invoice-badge-status saved">
                  ● Saved
                </span>
                <div style={{ display: 'inline-flex', gap: '2px', marginLeft: '6px' }}>
                  <button
                    type="button"
                    className={`cat-tab ${!isQuotation ? 'active' : ''}`}
                    style={{ padding: '2px 8px', fontSize: '10px' }}
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
                    style={{ padding: '2px 8px', fontSize: '10px' }}
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
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '3px' }}>
                {isQuotation ? 'Price Quotation' : 'GST Tax Invoice'} • Date: {activeInvoice.date}
              </div>
            </div>

            {/* Customer Selector Dropdown */}
            <div style={{ minWidth: '190px' }}>
              <select
                className="form-input"
                style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
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
                <option value="">Walk-in / Cash Customer</option>
                {customersList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.current_balance > 0 ? `(బాకీ: ₹${c.current_balance})` : ''}
                  </option>
                ))}
              </select>

              {/* Customer Khata Balance Alert if customer selected */}
              {(() => {
                if (!activeInvoice.customer_id) return null;
                const cust = customersList.find(c => c.id === activeInvoice.customer_id);
                if (!cust) return null;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontSize: '10px' }}>
                    <span style={{ color: cust.current_balance > 0 ? 'var(--accent-red)' : '#16a34a', fontWeight: 700 }}>
                      {cust.current_balance > 0 ? `బాకీ: ₹${cust.current_balance.toLocaleString('en-IN')}` : '₹0 Due'}
                    </span>
                    <Link href={`/customer/${cust.id}`} style={{ color: 'var(--primary-dark)', textDecoration: 'none', fontWeight: 600 }}>
                      Khata Ledger →
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Line Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '140px', maxHeight: '310px', overflowY: 'auto', paddingRight: '2px' }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <PackageIcon size={26} style={{ color: 'var(--slate-400)' }} />
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--slate-700)' }}>
                  Bill is empty • Ready for items
                </div>
                <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                  Speak in Telugu or click any product tile on the left
                </div>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: '4px', fontSize: '11px', padding: '3px 8px' }} onClick={promptAddItem}>
                  <PlusIcon size={12} /> Custom Line Item
                </button>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={item.id || idx} className="pos-item-card" style={{ padding: '8px 10px', margin: 0 }}>
                  <div className="item-top-row">
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.name || ''}
                        placeholder="Item Description"
                        className="item-name-input"
                        style={{ fontSize: '13px', padding: '1px 2px' }}
                        onChange={(e) => updateItemName(idx, e.target.value)}
                      />
                      <div className="item-sub-meta" style={{ fontSize: '10px' }}>
                        <span>Unit: <strong>{item.unit || 'pcs'}</strong></span>
                        {item.gst_percent ? <span>• GST: {item.gst_percent}%</span> : null}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)', fontVariantNumeric: 'tabular-nums' }}>
                        {documentGenerator.formatCurrency(item.line_total)}
                      </div>
                    </div>
                  </div>

                  <div className="item-bottom-controls" style={{ padding: '4px 0 0 0', marginTop: '4px' }}>
                    <div className="qty-stepper-control">
                      <button type="button" className="stepper-btn" style={{ width: '24px', height: '24px' }} onClick={() => updateItemQty(idx, -1)}>-</button>
                      <span className="stepper-value-display" style={{ fontSize: '12px', minWidth: '40px', padding: '0 6px' }}>{item.quantity} {item.unit || ''}</span>
                      <button type="button" className="stepper-btn" style={{ width: '24px', height: '24px' }} onClick={() => updateItemQty(idx, 1)}>+</button>
                    </div>

                    <div className="rate-input-box" style={{ fontSize: '11px' }}>
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price || 0}
                        className="rate-input"
                        style={{ width: '70px', padding: '2px 4px', fontSize: '12px' }}
                        onChange={(e) => updateItemPrice(idx, e.target.value)}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--slate-400)' }}>/{item.unit || 'pcs'}</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: '2px 6px', fontSize: '10px', color: 'var(--accent-red)', borderColor: '#fca5a5' }}
                      onClick={() => removeItem(idx)}
                      title="Remove item"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={promptAddItem}>
                <PlusIcon size={12} /> Add Custom Item
              </button>
            </div>
          )}

          {/* Permanently Anchored Totals Summary Ledger */}
          <div className="totals-ledger-box" style={{ padding: '10px 14px', marginTop: '10px' }}>
            <div className="totals-line-row">
              <span style={{ fontSize: '12px' }}>Subtotal / సబ్ టోటల్:</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{documentGenerator.formatCurrency(activeInvoice.subtotal)}</span>
            </div>

            <div className="totals-line-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                Discount:
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={activeInvoice.discount_percent || 0}
                  style={{ width: '40px', padding: '1px 3px', fontSize: '11px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}
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
              <span style={{ color: activeInvoice.discount_amount > 0 ? 'var(--accent-red)' : 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                -{documentGenerator.formatCurrency(activeInvoice.discount_amount || 0)}
              </span>
            </div>

            <div className="totals-line-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
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
                  /> Apply
                </label>
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{documentGenerator.formatCurrency(activeInvoice.gst_amount || 0)}</span>
            </div>

            <div className="totals-line-row grand-total-row" style={{ marginTop: '6px', paddingTop: '6px' }}>
              <span style={{ fontSize: '15px' }}>Grand Total / మొత్తం:</span>
              <span className="grand-total-val" style={{ fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>
                {documentGenerator.formatCurrency(activeInvoice.total)}
              </span>
            </div>
          </div>

          {/* Payment Tender Console */}
          <div style={{ marginTop: '10px' }}>
            <div className="payment-selector-strip" style={{ marginTop: 0 }}>
              <button
                type="button"
                className={`payment-chip ${activeInvoice.payment_mode === 'cash' ? 'selected' : ''}`}
                style={{ padding: '6px 8px', fontSize: '11px' }}
                onClick={() => {
                  setActiveInvoice(prev => {
                    const next = { ...prev, payment_mode: 'cash', payment_status: 'paid' };
                    autoSave(next);
                    return next;
                  });
                }}
              >
                <CashIcon size={15} />
                <span>Cash (నగదు)</span>
              </button>

              <button
                type="button"
                className={`payment-chip ${activeInvoice.payment_mode === 'upi' ? 'selected' : ''}`}
                style={{ padding: '6px 8px', fontSize: '11px' }}
                onClick={() => {
                  setActiveInvoice(prev => {
                    const next = { ...prev, payment_mode: 'upi', payment_status: 'paid' };
                    autoSave(next);
                    return next;
                  });
                  if (activeInvoice.total > 0) {
                    setShowUpiModal(true);
                  }
                }}
              >
                <QrCodeIcon size={15} />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                className={`payment-chip credit ${activeInvoice.payment_mode === 'credit' ? 'selected credit' : ''}`}
                style={{ padding: '6px 8px', fontSize: '11px' }}
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
                <CreditCardIcon size={15} />
                <span>Udhaar (బాకీ)</span>
              </button>

              <button
                type="button"
                className={`payment-chip ${activeInvoice.payment_mode === 'partial' ? 'selected' : ''}`}
                style={{ padding: '6px 8px', fontSize: '11px' }}
                onClick={() => {
                  setActiveInvoice(prev => {
                    const next = { ...prev, payment_mode: 'partial', payment_status: 'partial' };
                    autoSave(next);
                    return next;
                  });
                }}
              >
                <RefreshCwIcon size={15} />
                <span>Split / ఇతర</span>
              </button>
            </div>

            {/* Cash Tender & Change Return Calculator */}
            {activeInvoice.payment_mode === 'cash' && activeInvoice.total > 0 && (
              <div className="tender-console" style={{ padding: '8px 10px', marginTop: '8px' }}>
                <div className="tender-calc-row">
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-700)' }}>
                    Cash Tendered:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>₹</span>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '90px', padding: '3px 6px', fontWeight: 800, textAlign: 'right', fontSize: '12px' }}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={String(Math.ceil(activeInvoice.total))}
                    />
                  </div>
                </div>
                <div className="tender-quick-buttons" style={{ marginTop: '4px' }}>
                  <button type="button" className="tender-chip-button" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total)))}>Exact</button>
                  <button type="button" className="tender-chip-button" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 100))}>+₹100</button>
                  <button type="button" className="tender-chip-button" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setCashTendered(String(Math.ceil(activeInvoice.total) + 500))}>+₹500</button>
                  <button type="button" className="tender-chip-button" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setCashTendered('2000')}>₹2000 Note</button>
                </div>
                {parseFloat(cashTendered) >= activeInvoice.total && (
                  <div className="change-due-box" style={{ padding: '4px 8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#065f46' }}>
                      Return Change / చిల్లర:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{(parseFloat(cashTendered) - activeInvoice.total).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="action-grid-buttons" style={{ marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={printLiveBill}
              title="Print Standard A4 Invoice [Shortcut: F4]"
              style={{ fontWeight: 800 }}
              disabled={items.length === 0}
            >
              <PrinterIcon size={15} /> Complete & Print [F4]
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (!activeInvoice || items.length === 0) return;
                autoSave(activeInvoice);
                documentGenerator.printThermal(activeInvoice);
              }}
              title="Print Thermal Receipt Slip"
              disabled={items.length === 0}
            >
              Thermal Slip
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowUpiModal(true)}
              style={{ color: 'var(--primary-dark)', borderColor: 'var(--primary-border)', background: 'var(--primary-light)' }}
              title="Display UPI QR Code on Counter Screen"
              disabled={activeInvoice.total === 0}
            >
              <QrCodeIcon size={15} /> UPI QR
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={shareLiveBill}
              disabled={items.length === 0}
              style={{ background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' }}
            >
              <WhatsAppIcon size={15} /> WhatsApp
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={startNewBill}
              title="Clear register for next customer [F8]"
              style={{ color: 'var(--accent-red)', borderColor: '#fecaca' }}
            >
              <RefreshCwIcon size={13} /> Reset [F8]
            </button>
          </div>

        </div>

      </div>

      {/* Dynamic Bharat UPI QR Counter Modal */}
      {showUpiModal && activeInvoice && (
        <div className="modal-backdrop-overlay" onClick={() => setShowUpiModal(false)}>
          <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--slate-900)' }}>
                Scan to Pay via UPI
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
            <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
              UPI ID: <strong>{biz.upi_id}</strong> • Bill #{activeInvoice.invoice_number}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowUpiModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowUpiModal(false);
                  showToast('UPI చెల్లింపు ధృవీకరించబడింది.');
                  printLiveBill();
                }}
              >
                Paid & Print Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
