/**
 * Maatlaadi Bill - Local Data Store & Mock Auth Layer (Next.js Compatible)
 * Robust persistent storage with LocalStorage and fallback for SSR.
 * Includes: Real-Time Stock Tracking, Khata / Customer Udhaar Ledger, and Multi-Mode Payments.
 */

import { SEED_BUSINESS, SEED_CUSTOMERS, SEED_PRODUCTS, SEED_PAYMENTS } from './seed-data';

export const STORAGE_KEYS = {
  AUTH_USER: 'maatlaadi_auth_user',
  BUSINESS: 'maatlaadi_business',
  PRODUCTS: 'maatlaadi_products',
  CUSTOMERS: 'maatlaadi_customers',
  QUOTATIONS: 'maatlaadi_quotations',
  INVOICES: 'maatlaadi_invoices',
  PAYMENTS: 'maatlaadi_payments',
  STOCK_LOGS: 'maatlaadi_stock_logs',
  VOICE_TXS: 'maatlaadi_voice_transactions',
  SETTINGS: 'maatlaadi_settings',
  LAST_INV_NUM: 'maatlaadi_last_inv_num',
  LAST_QT_NUM: 'maatlaadi_last_qt_num'
};

class DataStore {
  constructor() {
    this.memoryFallback = {};
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    if (typeof window === 'undefined') return;

    // 1. Mock Auth & Business
    if (!this.get(STORAGE_KEYS.AUTH_USER)) {
      this.set(STORAGE_KEYS.AUTH_USER, {
        id: 'user-001',
        name: 'వెంకట రమణ (Venkata Ramana)',
        role: 'owner',
        phone: '9848022334',
        email: 'srilakshmi.vja@gmail.com',
        business_id: 'biz-001',
        is_authenticated: true
      });
    }

    if (!this.get(STORAGE_KEYS.BUSINESS)) {
      this.set(STORAGE_KEYS.BUSINESS, SEED_BUSINESS);
    }

    // 2. Initialize Products with stock tracking
    const existingProducts = this.get(STORAGE_KEYS.PRODUCTS) || [];
    const existingMap = new Map(existingProducts.map(p => [p.id, p]));
    const mergedProducts = [];

    SEED_PRODUCTS.forEach(sp => {
      const existing = existingMap.get(sp.id);
      const defaultStock = sp.category === 'Cement' ? 120 : (sp.category === 'Grocery' ? 60 : 35);
      const defaultCost = Math.round((sp.selling_price * 0.82) * 100) / 100;

      if (existing) {
        const mergedAliases = Array.from(new Set([
          ...(sp.aliases || []),
          ...(existing.aliases || [])
        ]));
        mergedProducts.push({
          ...sp,
          ...existing,
          aliases: mergedAliases,
          name_te: sp.name_te || existing.name_te,
          unit_te: sp.unit_te || existing.unit_te,
          current_stock: existing.current_stock !== undefined ? existing.current_stock : defaultStock,
          reorder_level: existing.reorder_level !== undefined ? existing.reorder_level : 10,
          cost_price: existing.cost_price !== undefined ? existing.cost_price : defaultCost
        });
        existingMap.delete(sp.id);
      } else {
        mergedProducts.push({
          ...sp,
          current_stock: defaultStock,
          reorder_level: 10,
          cost_price: defaultCost
        });
      }
    });

    for (const [_, customProd] of existingMap.entries()) {
      if (customProd.name) {
        customProd.name = customProd.name.replace(/[\uFFFD\uFFFE]/g, '').trim();
        if (customProd.name.includes('మనప') || customProd.name.includes('మినప')) {
          customProd.name = 'మినప గుళ్ళు (Urad Dal)';
        }
      }
      if (customProd.name_te) {
        customProd.name_te = customProd.name_te.replace(/[\uFFFD\uFFFE]/g, '').trim();
        if (customProd.name_te.includes('మనప') || customProd.name_te.includes('మినప')) {
          customProd.name_te = 'మినప గుళ్ళు (కేజీ)';
        }
      }
      if (customProd.current_stock === undefined) customProd.current_stock = 30;
      if (customProd.reorder_level === undefined) customProd.reorder_level = 5;
      mergedProducts.push(customProd);
    }

    this.set(STORAGE_KEYS.PRODUCTS, mergedProducts);

    // 3. Initialize Customers with Khata Balances
    const existingCustomers = this.get(STORAGE_KEYS.CUSTOMERS) || [];
    if (existingCustomers.length === 0) {
      this.set(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    } else {
      // Ensure balance fields are present
      const updatedCustomers = existingCustomers.map(c => {
        const seed = SEED_CUSTOMERS.find(sc => sc.id === c.id);
        return {
          ...c,
          current_balance: c.current_balance !== undefined ? c.current_balance : (seed?.current_balance || 0),
          credit_limit: c.credit_limit !== undefined ? c.credit_limit : (seed?.credit_limit || 15000)
        };
      });
      this.set(STORAGE_KEYS.CUSTOMERS, updatedCustomers);
    }

    // 4. Initialize Payments / Khata Ledger
    if (!this.get(STORAGE_KEYS.PAYMENTS)) {
      this.set(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
    }

    // 5. Initialize Stock Logs
    if (!this.get(STORAGE_KEYS.STOCK_LOGS)) {
      this.set(STORAGE_KEYS.STOCK_LOGS, []);
    }

    // 6. Initialize Quotations & Invoices
    if (!this.get(STORAGE_KEYS.QUOTATIONS) || this.get('mock_data_cleaned') !== 'v2') {
      this.set(STORAGE_KEYS.QUOTATIONS, []);
    }
    if (!this.get(STORAGE_KEYS.INVOICES) || this.get('mock_data_cleaned') !== 'v2') {
      this.set(STORAGE_KEYS.INVOICES, []);
      this.set('mock_data_cleaned', 'v2');
    }

    // 7. Voice Transactions Log
    if (!this.get(STORAGE_KEYS.VOICE_TXS)) {
      this.set(STORAGE_KEYS.VOICE_TXS, []);
    }

    // 8. Settings
    if (!this.get(STORAGE_KEYS.SETTINGS) || this.get(STORAGE_KEYS.SETTINGS).demo_mode === true) {
      const current = this.get(STORAGE_KEYS.SETTINGS) || {};
      this.set(STORAGE_KEYS.SETTINGS, {
        ...current,
        demo_mode: false,
        use_telugu_ui: true,
        gemini_api_key_configured: true,
        voice_rate: 1.0,
        enable_audio_feedback: true,
        default_gst_percent: 18.0
      });
    }
  }

  // --- Storage Helpers ---
  get(key) {
    if (typeof window === 'undefined') {
      return this.memoryFallback[key] || null;
    }
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return this.memoryFallback[key] || null;
    }
  }

  set(key, value) {
    if (typeof window === 'undefined') {
      this.memoryFallback[key] = value;
      return true;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
      this.memoryFallback[key] = value;
      return false;
    }
  }

  resetToDefault() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.QUOTATIONS);
      localStorage.removeItem(STORAGE_KEYS.INVOICES);
      localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
      localStorage.removeItem(STORAGE_KEYS.STOCK_LOGS);
      localStorage.removeItem(STORAGE_KEYS.VOICE_TXS);
    }
    this.memoryFallback = {};
    this.init();
  }

  // --- Auth & Business ---
  getCurrentUser() {
    return this.get(STORAGE_KEYS.AUTH_USER);
  }

  getBusiness() {
    return this.get(STORAGE_KEYS.BUSINESS) || SEED_BUSINESS;
  }

  updateBusiness(updated) {
    const current = this.getBusiness() || {};
    const merged = { ...current, ...updated, updated_at: new Date().toISOString() };
    this.set(STORAGE_KEYS.BUSINESS, merged);
    return merged;
  }

  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS) || {};
  }

  updateSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // --- Products & Inventory ---
  getProducts() {
    return this.get(STORAGE_KEYS.PRODUCTS) || SEED_PRODUCTS;
  }

  getActiveProducts() {
    return this.getProducts().filter(p => p.is_active !== false);
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id) || null;
  }

  addProduct(product) {
    const products = this.getProducts();
    const newProduct = {
      ...product,
      id: product.id || 'prod-' + Date.now(),
      current_stock: product.current_stock !== undefined ? parseFloat(product.current_stock) : 40,
      reorder_level: product.reorder_level !== undefined ? parseFloat(product.reorder_level) : 10,
      cost_price: product.cost_price !== undefined ? parseFloat(product.cost_price) : Math.round(parseFloat(product.selling_price || 0) * 0.8),
      created_at: new Date().toISOString(),
      is_active: product.is_active !== false
    };
    products.unshift(newProduct);
    this.set(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  }

  updateProduct(id, updates) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updates, updated_at: new Date().toISOString() };
      this.set(STORAGE_KEYS.PRODUCTS, products);
      return products[idx];
    }
    return null;
  }

  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, products);
    return true;
  }

  adjustStock(productId, deltaQuantity, reason = 'Stock adjustment') {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return null;

    const oldStock = products[idx].current_stock || 0;
    const newStock = Math.max(0, Math.round((oldStock + deltaQuantity) * 100) / 100);
    products[idx].current_stock = newStock;
    products[idx].updated_at = new Date().toISOString();
    this.set(STORAGE_KEYS.PRODUCTS, products);

    // Log stock change
    const logs = this.get(STORAGE_KEYS.STOCK_LOGS) || [];
    logs.unshift({
      id: 'stk-' + Date.now(),
      product_id: productId,
      product_name: products[idx].name,
      old_stock: oldStock,
      delta: deltaQuantity,
      new_stock: newStock,
      reason,
      date: new Date().toISOString()
    });
    if (logs.length > 200) logs.length = 200;
    this.set(STORAGE_KEYS.STOCK_LOGS, logs);

    return products[idx];
  }

  getStockLogs() {
    return this.get(STORAGE_KEYS.STOCK_LOGS) || [];
  }

  // --- Customers & Khata (Udhaar) Ledger ---
  getCustomers() {
    return this.get(STORAGE_KEYS.CUSTOMERS) || SEED_CUSTOMERS;
  }

  getCustomerById(id) {
    return this.getCustomers().find(c => c.id === id) || null;
  }

  addCustomer(customer) {
    const customers = this.getCustomers();
    const newCustomer = {
      ...customer,
      id: customer.id || 'cust-' + Date.now(),
      current_balance: parseFloat(customer.current_balance) || 0,
      credit_limit: parseFloat(customer.credit_limit) || 15000,
      created_at: new Date().toISOString()
    };
    customers.unshift(newCustomer);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  updateCustomer(id, updates) {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...updates, updated_at: new Date().toISOString() };
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
      return customers[idx];
    }
    return null;
  }

  updateCustomerBalance(customerId, deltaAmount) {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx !== -1) {
      const oldBal = customers[idx].current_balance || 0;
      const newBal = Math.round((oldBal + deltaAmount) * 100) / 100;
      customers[idx].current_balance = newBal;
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
      return newBal;
    }
    return 0;
  }

  // Payments / Receipts
  getPayments() {
    return this.get(STORAGE_KEYS.PAYMENTS) || [];
  }

  recordPayment({ customerId, amount, paymentMode = 'cash', reference = '', notes = '', date = null }) {
    const payments = this.getPayments();
    const customer = this.getCustomerById(customerId);
    const amt = parseFloat(amount) || 0;

    const paymentRecord = {
      id: 'pay-' + Date.now(),
      customer_id: customerId,
      customer_name: customer ? customer.name : 'Customer',
      amount: amt,
      payment_mode: paymentMode,
      reference,
      notes,
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    payments.unshift(paymentRecord);
    this.set(STORAGE_KEYS.PAYMENTS, payments);

    // Decrease customer's credit balance
    if (customerId) {
      this.updateCustomerBalance(customerId, -amt);
    }

    return paymentRecord;
  }

  getCustomerLedger(customerId) {
    const invoices = this.getInvoices().filter(i => i.customer_id === customerId);
    const payments = this.getPayments().filter(p => p.customer_id === customerId);

    const entries = [];

    invoices.forEach(inv => {
      entries.push({
        id: inv.id,
        date: inv.date || inv.created_at?.split('T')[0],
        type: 'invoice',
        type_label: 'ఇన్వాయిస్ (Bill)',
        reference: inv.invoice_number,
        debit: inv.total,       // Customer owes this
        credit: 0,
        payment_mode: inv.payment_mode || 'credit',
        notes: inv.notes || '',
        timestamp: new Date(inv.date || inv.created_at).getTime()
      });
    });

    payments.forEach(pay => {
      entries.push({
        id: pay.id,
        date: pay.date,
        type: 'payment',
        type_label: 'చెల్లింపు (Payment Received)',
        reference: pay.reference || 'REC-' + pay.id.slice(-4),
        debit: 0,
        credit: pay.amount,     // Customer paid this
        payment_mode: pay.payment_mode,
        notes: pay.notes || '',
        timestamp: new Date(pay.date).getTime()
      });
    });

    // Sort chronologically ascending to compute running balance
    entries.sort((a, b) => a.timestamp - b.timestamp);

    let running = 0;
    const ledger = entries.map(e => {
      running += (e.debit - e.credit);
      return {
        ...e,
        balance_after: Math.round(running * 100) / 100
      };
    });

    // Return in reverse chronological order for UI display
    return ledger.reverse();
  }

  // --- Numbering System ---
  getNextInvoiceNumber() {
    const invoices = this.getInvoices();
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = invoices.length + 1;
    return `${prefix}${String(count).padStart(4, '0')}`;
  }

  getNextQuotationNumber() {
    const quotations = this.getQuotations();
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const count = quotations.length + 1;
    return `${prefix}${String(count).padStart(4, '0')}`;
  }

  // --- Quotations ---
  getQuotations() {
    return this.get(STORAGE_KEYS.QUOTATIONS) || [];
  }

  getQuotationById(id) {
    return this.getQuotations().find(q => q.id === id) || null;
  }

  saveQuotation(quotation) {
    const quotations = this.getQuotations();
    const newQuotation = {
      ...quotation,
      id: quotation.id || 'qt-' + Date.now(),
      quotation_number: quotation.quotation_number || this.getNextQuotationNumber(),
      date: quotation.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      status: quotation.status || 'pending'
    };
    quotations.unshift(newQuotation);
    this.set(STORAGE_KEYS.QUOTATIONS, quotations);
    return newQuotation;
  }

  updateQuotation(id, updates) {
    const quotations = this.getQuotations();
    const idx = quotations.findIndex(q => q.id === id);
    if (idx !== -1) {
      quotations[idx] = { ...quotations[idx], ...updates, updated_at: new Date().toISOString() };
      this.set(STORAGE_KEYS.QUOTATIONS, quotations);
      return quotations[idx];
    }
    return null;
  }

  // --- Invoices ---
  getInvoices() {
    return this.get(STORAGE_KEYS.INVOICES) || [];
  }

  getInvoiceById(id) {
    return this.getInvoices().find(i => i.id === id) || null;
  }

  saveInvoice(invoice) {
    const invoices = this.getInvoices();
    const isNew = !invoice.id || !invoices.some(i => i.id === invoice.id);

    const invoiceNumber = invoice.invoice_number || this.getNextInvoiceNumber();
    const paymentMode = invoice.payment_mode || 'cash';
    const paymentStatus = invoice.payment_status || (paymentMode === 'credit' ? 'credit' : 'paid');

    const newInvoice = {
      ...invoice,
      id: invoice.id || 'inv-' + Date.now(),
      invoice_number: invoiceNumber,
      date: invoice.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      payment_mode: paymentMode,
      payment_status: paymentStatus
    };

    if (isNew) {
      invoices.unshift(newInvoice);

      // 1. Auto-decrement Inventory Stock
      if (Array.isArray(newInvoice.items)) {
        for (const it of newInvoice.items) {
          if (it.product_id) {
            this.adjustStock(it.product_id, -(parseFloat(it.quantity) || 0), `Sale: ${invoiceNumber}`);
          }
        }
      }

      // 2. Update Customer Khata Balance if Credit
      if (newInvoice.customer_id && (paymentMode === 'credit' || paymentStatus === 'credit')) {
        this.updateCustomerBalance(newInvoice.customer_id, newInvoice.total);
      } else if (newInvoice.customer_id && paymentStatus === 'partial') {
        const unpaid = newInvoice.total - (parseFloat(newInvoice.amount_paid) || 0);
        if (unpaid > 0) {
          this.updateCustomerBalance(newInvoice.customer_id, unpaid);
        }
      }
    } else {
      const idx = invoices.findIndex(i => i.id === invoice.id);
      invoices[idx] = { ...invoices[idx], ...newInvoice, updated_at: new Date().toISOString() };
    }

    this.set(STORAGE_KEYS.INVOICES, invoices);
    return newInvoice;
  }

  convertQuotationToInvoice(quotationId) {
    const quotation = this.getQuotationById(quotationId);
    if (!quotation) return null;

    const invoiceNumber = this.getNextInvoiceNumber();
    const invoice = {
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      customer_name_snapshot: quotation.customer_name_snapshot,
      customer_phone_snapshot: quotation.customer_phone_snapshot,
      customer_gstin_snapshot: quotation.customer_gstin_snapshot || '',
      customer_address_snapshot: quotation.customer_address_snapshot || '',
      invoice_number: invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      subtotal: quotation.subtotal,
      discount_percent: quotation.discount_percent,
      discount_amount: quotation.discount_amount,
      taxable_amount: quotation.taxable_amount,
      cgst_amount: quotation.gst_amount / 2,
      sgst_amount: quotation.gst_amount / 2,
      igst_amount: 0.00,
      gst_amount: quotation.gst_amount,
      round_off: quotation.round_off || 0.00,
      total: quotation.total,
      payment_mode: 'cash',
      payment_status: 'paid',
      amount_paid: quotation.total,
      balance_due: 0.00,
      notes: `Converted from Quotation ${quotation.quotation_number}. ` + (quotation.notes || ''),
      items: (quotation.items || []).map(item => ({
        ...item,
        id: 'ini-' + Date.now() + Math.random().toString(36).substr(2, 4)
      }))
    };

    const savedInvoice = this.saveInvoice(invoice);
    this.updateQuotation(quotationId, {
      status: 'converted_to_invoice',
      converted_invoice_id: savedInvoice.id
    });

    return savedInvoice;
  }

  // --- Voice Observability Logging ---
  logVoiceTransaction(entry) {
    const logs = this.get(STORAGE_KEYS.VOICE_TXS) || [];
    const logItem = {
      id: 'vtx-' + Date.now(),
      created_at: new Date().toISOString(),
      raw_audio_duration_seconds: entry.raw_audio_duration_seconds || 0,
      transcript: entry.transcript || '',
      extracted_json: entry.extracted_json || {},
      matched_products: entry.matched_products || [],
      overall_confidence: entry.overall_confidence || 0.9,
      processing_time_ms: entry.processing_time_ms || 350,
      user_corrections_count: entry.user_corrections_count || 0,
      user_corrections_log: entry.user_corrections_log || [],
      final_document_type: entry.final_document_type || null,
      final_document_id: entry.final_document_id || null,
      is_demo: entry.is_demo || false
    };
    logs.unshift(logItem);
    if (logs.length > 100) logs.length = 100;
    this.set(STORAGE_KEYS.VOICE_TXS, logs);
    return logItem;
  }

  getVoiceTransactions() {
    return this.get(STORAGE_KEYS.VOICE_TXS) || [];
  }
}

export const store = new DataStore();
if (typeof window !== 'undefined') {
  window.Store = store;
}
