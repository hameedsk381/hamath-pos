/**
 * Maatlaadi Bill - Server-Side Backend & Secure Gemini AI Gateway
 * Built with native Node.js HTTP module for zero-dependency instant startup.
 * Keeps Gemini API Key 100% secure on server-side.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env or .env.example if present
function loadEnv() {
  const envFiles = ['.env', '.env.local', '.env.example'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.substring(0, eqIdx).trim();
              const val = trimmed.substring(eqIdx + 1).trim();
              if (key && !process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
      } catch (e) {}
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Versioned Gemini System Prompt for Andhra Pradesh Telugu Retail Extraction
const GEMINI_PROMPT_VERSION = 'v1.0.5-pure-spoken-list';
const GEMINI_SYSTEM_INSTRUCTION = `
You are an expert Telugu retail voice transaction extraction assistant specialized for Andhra Pradesh, India.
Your mission is to accurately capture whatever the user speaks in natural Telugu, English, or Telugu-English code-switching.

YOUR OBJECTIVES:
1. TRANSCRIPT: Accurately transcribe the spoken Telugu words into the "transcript" field (e.g. "రెండు కిలోలు ఉల్లిపాయలు, మూడు కిలోలు పంచదార, ఒక బియ్యం బస్తా").
2. DOCUMENT TYPE: Detect "quotation" if speaker asks for quotation/estimate ("కోట్", "కొటేషన్", "ఎస్టిమేట్"); otherwise default to "invoice".
3. CUSTOMER: Extract customer name if mentioned (e.g. "రమేష్కి" -> "Ramesh"). Strip Telugu dative suffixes like "కి", "కు", "గారికి".
4. ITEMS EXTRACTION:
   Extract EVERY single product item the user spoke into the items list:
   - spoken_name: exactly what the user said in Telugu/English (e.g. "ఉల్లిపాయలు", "పంచదార", "బియ్యం బస్తా", "టమాటాలు", "ఆలూ", "సబ్బు", "నూనె", "సిమెంట్", "పెయింట్", etc.)
   - quantity: numeric float (e.g. 1, 2, 3, 0.5, 1.5, 2.5)
   - unit: spoken unit ("kg", "bag", "litre", "pcs", "packet", "box", "pair", "coil", "bucket")
   - unit_price: numeric price if the user explicitly mentioned a rate (e.g. "₹50", "30 రూపాయలు", "కేజీ 40"), otherwise null.
   - matched_product_id: matching product ID from the reference catalogue if found (for default price reference), otherwise null.

OUTPUT FORMAT (strictly valid JSON):
{
  "transcript": "full transcribed sentence in Telugu",
  "document_type": "invoice" | "quotation",
  "customer_name": string | null,
  "items": [
    {
      "spoken_name": string,
      "quantity": number,
      "unit": string,
      "unit_price": number | null,
      "matched_product_id": string | null
    }
  ]
}
`;

// In-memory log buffer for /api/logs
const serverLogs = [];
function log(msg, type = 'INFO') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${type}] ${msg}`;
  console.log(line);
  serverLogs.push(line);
  if (serverLogs.length > 200) serverLogs.shift();
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webm': 'audio/webm'
};

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  const reqStartTime = Date.now();

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Health Check
  if (urlPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '1.0.0',
      gemini_key_configured: !!GEMINI_API_KEY,
      prompt_version: GEMINI_PROMPT_VERSION
    }));
    return;
  }

  // 2. Server Logs View Endpoint
  if (urlPath === '/api/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      total: serverLogs.length,
      logs: serverLogs
    }, null, 2));
    return;
  }

  // 3. Secure Voice Processing API
  if (urlPath === '/api/voice' && req.method === 'POST') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
      try {
        const rawBuffer = Buffer.concat(body);
        let inputText = '';
        let audioBase64 = null;
        let audioMimeType = 'audio/webm';
        let catalogue = [];

        // Check if JSON or multipart
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            const parsedBody = JSON.parse(rawBuffer.toString('utf-8'));
            inputText = parsedBody.text || '';
            audioBase64 = parsedBody.audioBase64 || null;
            audioMimeType = parsedBody.mimeType || 'audio/webm';
            catalogue = parsedBody.catalogue || [];
          } catch (e) {}
        } else {
          // Extract text from raw multipart or string
          const rawStr = rawBuffer.toString('utf-8');
          const textMatch = rawStr.match(/name="text"[\r\n]+([^\r\n-]+)/);
          if (textMatch) {
            inputText = textMatch[1].trim();
          } else {
            inputText = rawStr;
          }
        }

        log(`Incoming Voice Request: text="${inputText}", audioLength=${audioBase64 ? audioBase64.length : 0}`, 'VOICE');

        // If no Gemini API key, return demo fallback
        if (!GEMINI_API_KEY) {
          log('No GEMINI_API_KEY set. Returning demo fallback.', 'WARN');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'demo_fallback',
            message: 'No GEMINI_API_KEY found in server environment.'
          }));
          return;
        }

        const promptText = `Shop Catalogue (${catalogue.length} items):\n${JSON.stringify(catalogue.slice(0, 100))}\n\nUser Spoken Retail Input (text preview if available): "${inputText}"\nListen carefully to the audio and extract the structured transaction adhering strictly to the JSON schema.`;

        const parts = [{ text: promptText }];
        if (audioBase64) {
          parts.unshift({
            inlineData: {
              mimeType: audioMimeType,
              data: audioBase64
            }
          });
        }

        const geminiRequestBody = JSON.stringify({
          contents: [{
            parts
          }],
          systemInstruction: {
            parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        log(`Calling Gemini API (gemini-2.5-flash)...`, 'GEMINI');

        const geminiReq = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(geminiRequestBody)
          }
        }, (geminiRes) => {
          const gChunks = [];
          geminiRes.on('data', d => gChunks.push(d));
          geminiRes.on('end', () => {
            const latency = Date.now() - reqStartTime;
            try {
              const gData = Buffer.concat(gChunks).toString('utf-8');
              const gJson = JSON.parse(gData);
              if (geminiRes.statusCode !== 200) {
                log(`Gemini API Error (${geminiRes.statusCode}): ${JSON.stringify(gJson.error || gJson)}`, 'ERROR');
                res.writeHead(geminiRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: gJson.error }));
                return;
              }

              const textContent = gJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
              const parsed = JSON.parse(textContent);

              // Sanitize any corrupt Unicode replacement chars
              if (parsed.transcript) {
                parsed.transcript = parsed.transcript.replace(/[\uFFFD\uFFFE]/g, '');
              }
              if (Array.isArray(parsed.items)) {
                parsed.items.forEach(it => {
                  if (it.spoken_name) {
                    it.spoken_name = it.spoken_name.replace(/[\uFFFD\uFFFE]/g, '');
                  }
                });
              }

              log(`Gemini Success [${latency}ms]: Extracted ${parsed.items?.length || 0} items for doc type: ${parsed.document_type || 'invoice'}`, 'SUCCESS');
              log(`Extracted Details: ${JSON.stringify(parsed)}`, 'JSON');

              const resolvedTranscript = parsed.transcript || inputText || '';

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                status: 'success',
                transcript: resolvedTranscript,
                extraction: parsed,
                latency_ms: latency
              }));
            } catch (e) {
              log(`Failed parsing Gemini response: ${e.message}`, 'ERROR');
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: 'Failed parsing Gemini response', raw: Buffer.concat(gChunks).toString('utf-8') }));
            }
          });
        });

        geminiReq.on('error', (e) => {
          log(`Gemini network connection error: ${e.message}`, 'ERROR');
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Gemini request error', details: e.message }));
        });

        geminiReq.write(geminiRequestBody);
        geminiReq.end();
      } catch (err) {
        log(`Server /api/voice error: ${err.message}`, 'ERROR');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Static File Server
  let filePath = path.join(__dirname, 'public', urlPath === '/' ? 'index.html' : urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA routing to index.html
      filePath = path.join(__dirname, 'public', 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🚀 Maatlaadi Bill - Telugu Voice Billing MVP`);
  console.log(`   “మాట్లాడితే బిల్ రెడీ” (Speak naturally. Get the bill ready.)`);
  console.log(`================================================================`);
  console.log(`📍 Web App URL:    http://localhost:${PORT}`);
  console.log(`🤖 AI Gateway:     /api/voice (Server-side Gemini proxy)`);
  console.log(`🔑 Gemini Key:     ${GEMINI_API_KEY ? 'Configured ✅' : 'Demo Mode (Offline Rule Engine) ⚡'}`);
  console.log(`================================================================\n`);
});
