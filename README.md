# 🎙️ Maatlaadi Bill (మాట్లాడితే బిల్ రెడీ)
### Telugu-First Voice-Powered Quotation & Invoice Generator for Andhra Pradesh Retail & Wholesale

> **“రమేష్కి పది బస్తాల సిమెంట్, ఐదు కిలోల వైట్ సిమెంట్, రెండు పెయింట్ బకెట్లు కోట్ చెయ్యి.”**  
> → *Quote ready in seconds with accurate catalogue prices, GST, PDF & WhatsApp share.*

---

## 🌟 Key Features

1. **Telugu Voice-First Commerce**:
   - Large tactile microphone button on home screen.
   - Natural Andhra Telugu and Telugu-English code-switching understanding.
   - Real-time animated audio waveform visualizer.
   - Live speech transcription preview.

2. **Strict Schema & Anti-Hallucination Architecture**:
   - The AI **never invents** product IDs, prices, GST rates, or quantities.
   - The shop's catalogue is the single source of truth.
   - Multimodal Gemini AI system prompt with versioned rules (`v1.0.2-ap-retail`).
   - Ambiguity detection: when a user says generic "cement" or "paint", asks: **“ఏ Cement కావాలి?”** with brand options (ACC, UltraTech, Ramco).
   - Unknown product handling: **“ఈ product catalogueలో లేదు. Product add చేయాలా?”**.

3. **Conversational Voice Editing**:
   - Shopkeepers can iteratively refine drafts by speaking:
     - *“ఇంకో ఐదు పీసులు యాడ్ చెయ్యి”* (Add 5 more pcs)
     - *“Paint రెండు bucketsకి మార్చు”* (Change paint to 2 buckets)
     - *“10 percent discount పెట్టు”* (Set 10% discount)
     - *“GST తీసేయి”* (Remove GST)
     - *“Customer name Sureshగా మార్చు”* (Switch customer)
     - *“Quotationగా మార్చు”* (Switch to quotation)

4. **1-Click Demo Mode (No API Key Required)**:
   - Includes all **7 Acceptance Tests** ready to click on the home screen.
   - Works immediately out-of-the-box offline.

5. **Complete Business & Document Management**:
   - **Product Catalogue**: 28+ pre-seeded items across 7 categories (Cement, Paint, Electrical, Plumbing, Hardware, Grocery, Furniture) with Telugu & English names, voice aliases, units, and GST.
   - **Customer Directory**: Phone call & WhatsApp shortcuts, GSTIN support.
   - **Documents History**: Sequential invoice numbering (`INV-2026-0001`, `QT-2026-0001`).
   - **Quotation to Invoice Conversion**: 1-click upgrade.
   - **High-Fidelity Document Viewer**: Thermal / A4 Print, PDF Download, WhatsApp Deep Link sharing.
   - **Voice Observability**: Logs transcripts, latency (ms), confidence scores, and corrections.

---

## 🚀 How to Run

### Quick Start (Zero Dependencies)
The backend is built with native Node.js HTTP so you don't even need `npm install`:

```bash
# 1. Start the server
node server.js

# 2. Open in your browser
http://localhost:3000
```

### Optional: With Gemini API Key (Production)
```bash
# In PowerShell:
$env:GEMINI_API_KEY="your-gemini-api-key-here"
node server.js
```

---

## 🧪 Acceptance Test Coverage

| Test # | Voice Input | Expected Outcome | Status |
|---|---|---|---|
| **Test 1** | *“రెండు కిలోల బియ్యం, ఒక కిలో పంచదార వేయి”* | Rice 2 kg + Sugar 1 kg resolved against catalogue | ✅ Verified |
| **Test 2** | *“Two boxes Surf Excel add చెయ్యి”* | Surf Excel 1kg box matched via alias | ✅ Verified |
| **Test 3** | *“రమేష్కి పది బస్తాల సిమెంట్ quotation చెయ్యి”* | Customer = Ramesh, Type = Quotation, Cement = 10 bags | ✅ Verified |
| **Test 4** | *“ఇంకో ఐదు పీసులు యాడ్ చెయ్యి”* | Existing item quantity increments by 5 | ✅ Verified |
| **Test 5** | *“Cement 15 bags rate ఎంత, quote చెయ్యి”* | Disambiguation: “ఏ Cement కావాలి?” (ACC, UltraTech, Ramco) | ✅ Verified |
| **Test 6** | *“శ్రీనుకి 3 జాకెట్ వాటర్ ప్రూఫ్ రూఫింగ్ రోల్స్ వేయి”* | Unknown product: “ఈ product catalogueలో లేదు. Product add చేయాలా?” | ✅ Verified |
| **Test 7** | *Invoice Calculation* | Subtotal + Discount + CGST + SGST = Grand Total verification | ✅ Verified |

---

## 🏛️ Architecture & File Structure

```
d:\retailstt\
├── server.js               # Zero-dependency Node.js server + secure /api/voice Gemini proxy
├── package.json            # Project manifest
├── supabase_schema.sql     # PostgreSQL / Supabase migration schema with RLS
├── .env.example            # Environment configuration template
├── README.md               # Documentation
└── public/
    ├── index.html          # PWA single-page application shell
    ├── manifest.json       # PWA manifest
    ├── css/
    │   └── style.css       # Vanilla CSS design system, Telugu typography, responsive UI
    └── js/
        ├── seed-data.js    # Pre-seeded products (28+), customers, and demo scenarios
        ├── store.js        # LocalStorage data persistence & mock auth session
        ├── matcher.js      # Intelligent Telugu & English product matcher & alias resolver
        ├── conversational.js # Real-time voice transaction editor & financial calculator
        ├── voice.js        # MediaRecorder, Web Speech fallback, Canvas waveform visualizer
        ├── gemini.js       # Client Gemini caller & fallback offline rule engine
        ├── pdf-generator.js # High-res printable bill, PDF export, WhatsApp sharing
        ├── app.js          # Master SPA controller & router
        └── views/
            ├── home.js         # Voice-first hero screen with giant mic
            ├── confirm.js      # Confirmation view & disambiguation modal
            ├── document.js     # Printable document viewer & converter
            ├── products.js     # Catalogue manager with category filters
            ├── customers.js    # Customer directory & quick contacts
            ├── documents.js    # Documents history (All / Quotes / Invoices)
            ├── dashboard.js    # Daily sales metrics
            └── settings.js     # Profile & Voice observability logs
```
