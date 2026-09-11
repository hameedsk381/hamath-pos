/**
 * Next.js Server Route Handler: /api/voice
 * Secure Server-Side Gateway for Gemini 2.5 Flash API
 * Preserves flawless Telugu Unicode rendering and handles raw audio & spoken text.
 */

import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
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

// Shared server logs in memory
globalThis.__serverLogs = globalThis.__serverLogs || [];
function log(msg, type = 'INFO') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${type}] ${msg}`;
  console.log(line);
  globalThis.__serverLogs.push(line);
  if (globalThis.__serverLogs.length > 200) globalThis.__serverLogs.shift();
}

export async function POST(req) {
  const reqStartTime = Date.now();

  try {
    const body = await req.json();
    const inputText = body.text || '';
    const audioBase64 = body.audioBase64 || null;
    const audioMimeType = body.mimeType || 'audio/webm';
    const catalogue = body.catalogue || [];

    log(`Incoming Voice Request: text="${inputText}", audioLength=${audioBase64 ? audioBase64.length : 0}`, 'VOICE');

    if (!GEMINI_API_KEY) {
      log('No GEMINI_API_KEY configured. Returning demo fallback.', 'WARN');
      return NextResponse.json({
        status: 'demo_fallback',
        message: 'No GEMINI_API_KEY found in server environment.'
      });
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

    const geminiRequestBody = {
      contents: [{ parts }],
      systemInstruction: {
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    };

    log(`Calling Gemini API (gemini-2.5-flash)...`, 'GEMINI');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequestBody)
    });

    const latency = Date.now() - reqStartTime;
    const rawData = await response.text();

    if (!response.ok) {
      log(`Gemini API Error (${response.status}): ${rawData}`, 'ERROR');
      return NextResponse.json({ error: 'Gemini API Error', details: rawData }, { status: response.status });
    }

    const gJson = JSON.parse(rawData);
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

    const resolvedTranscript = parsed.transcript || inputText || '';

    return NextResponse.json({
      status: 'success',
      transcript: resolvedTranscript,
      extraction: parsed,
      latency_ms: latency
    });
  } catch (err) {
    log(`Server /api/voice error: ${err.message}`, 'ERROR');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
