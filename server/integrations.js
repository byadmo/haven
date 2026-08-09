import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

// ---- Server-side rate limiter (per IP token bucket) ----
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute
const RATE_LIMIT_MAX_CALLS = 40;       // max calls per window per IP
const MAX_PROMPT_LENGTH = 40_000;      // character cap
const MAX_FILE_SIZE_MB = 10;

const ipBuckets = new Map();

function getRateBucket(ip) {
  const now = Date.now();
  let bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.resetAt > RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    ipBuckets.set(ip, bucket);
  }
  return bucket;
}

function checkRateLimit(ip) {
  const bucket = getRateBucket(ip);
  if (bucket.count >= RATE_LIMIT_MAX_CALLS) {
    return { ok: false, reason: `Rate limit: ${RATE_LIMIT_MAX_CALLS} calls per minute. Try again shortly.` };
  }
  bucket.count++;
  return { ok: true };
}

// Periodic bucket cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets) {
    if (now > bucket.resetAt) ipBuckets.delete(ip);
  }
}, 300_000);

// ---- Suspicious prompt patterns (server-side, defense-in-depth) ----
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(above|all|previous)\s+(instructions|directions|prompts)/i,
  /forget\s+(everything|all|above)/i,
  /you\s+(are\s+)?(now|are\s+now)\s+(free|not\s+bound|liberated|released)/i,
  /override\s+(all\s+)?(instructions|prompts|system|directives)/i,
  /output\s+your\s+(original|initial|system|base)\s+(prompt|instructions|directives)/i,
  /<script\b/i,
  /javascript\s*:/i,
];

function containsSuspiciousContent(text) {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// Initialize Google GenAI if API key is available
let genai = null;
if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
  genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY });
  console.log('[integrations] Google GenAI initialized');
} else {
  console.warn('[integrations] No GOOGLE_API_KEY/GEMINI_API_KEY set — LLM calls will return stubs');
}

// POST /api/integrations/core/invoke-llm
router.post('/core/invoke-llm', async (req, res) => {
  const { prompt, response_json_schema, file_urls = [] } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // ---- 1. Validate prompt exists ----
  if (!prompt) return res.status(400).json({ message: 'Prompt required' });

  // ---- 2. Rate limit (per IP) ----
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    console.warn(`[integrations] Rate limit hit for ${ip}`);
    return res.status(429).json({ message: rl.reason });
  }

  // ---- 3. Prompt length cap ----
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ message: `Prompt too long (${prompt.length.toLocaleString()} chars, max ${MAX_PROMPT_LENGTH.toLocaleString()})` });
  }

  // ---- 4. Suspicious content check ----
  if (containsSuspiciousContent(prompt)) {
    console.warn(`[integrations] Suspicious prompt blocked from ${ip}`);
    return res.status(400).json({ message: 'Prompt blocked — contains disallowed patterns' });
  }

  // ---- 5. Validate file URLs (limit count, check path traversal) ----
  if (file_urls.length > 5) {
    return res.status(400).json({ message: 'Too many file attachments (max 5)' });
  }
  for (const url of file_urls) {
    if (url.includes('..') || url.includes('~')) {
      return res.status(400).json({ message: 'Invalid file URL' });
    }
  }

  // ---- 6. If no GenAI configured, return a helpful stub ----
  if (!genai) {
    return res.json({
      response: `[Local stub] LLM not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY in server/.env. Prompt was: ${prompt.substring(0, 200)}...`,
      _stub: true,
    });
  }

  // ---- 7. Call Gemini ----
  try {
    const parts = [{ text: prompt }];

    // Attach files if provided
    for (const fileUrl of file_urls) {
      try {
        if (fileUrl.includes('/uploads/')) {
          const filename = fileUrl.split('/uploads/').pop();
          const filePath = path.join(import.meta.dirname, 'uploads', filename);
          // Prevent path traversal
          if (filename.includes('..')) continue;
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > MAX_FILE_SIZE_MB * 1024 * 1024) continue; // skip oversized files
            const buffer = fs.readFileSync(filePath);
            const ext = path.extname(filename).toLowerCase();
            const mimeType = ext === '.pdf' ? 'application/pdf'
              : ext === '.png' ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
              : ext === '.txt' ? 'text/plain'
              : 'application/octet-stream';
            parts.push({ inlineData: { data: buffer.toString('base64'), mimeType } });
          }
        }
      } catch (e) {
        console.warn(`[integrations] Failed to attach file ${fileUrl}:`, e.message);
      }
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const request = {
      model,
      contents: [{ role: 'user', parts }],
    };

    if (response_json_schema) {
      request.config = {
        responseMimeType: 'application/json',
        responseSchema: response_json_schema,
      };
    }

    const result = await genai.models.generateContent(request);
    const text = result.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    res.json(parsed);
  } catch (err) {
    console.error('[integrations] LLM error:', err);
    res.status(500).json({ message: err.message || 'LLM call failed' });
  }
});

// POST /api/integrations/core/upload-file
router.post('/core/upload-file', (req, res) => {
  res.status(400).json({ message: 'Use /api/files/upload for file uploads' });
});

// POST /api/integrations/core/extract-data-from-file
router.post('/core/extract-data-from-file', async (req, res) => {
  const { file_url, extraction_prompt } = req.body;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!file_url) return res.status(400).json({ message: 'file_url required' });

  // Rate limit
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return res.status(429).json({ message: rl.reason });
  }

  if (!genai) {
    return res.json({
      response: `[Local stub] File extraction not configured. Set GOOGLE_API_KEY.`,
      _stub: true,
    });
  }

  try {
    const filename = file_url.split('/uploads/').pop();
    if (filename.includes('..')) return res.status(400).json({ message: 'Invalid file path' });

    const filePath = path.join(import.meta.dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return res.status(400).json({ message: `File too large (max ${MAX_FILE_SIZE_MB}MB)` });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf'
      : ext === '.png' ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
      : 'application/octet-stream';

    const parts = [
      { text: extraction_prompt || 'Extract all data from this document and return as JSON.' },
      { inlineData: { data: buffer.toString('base64'), mimeType } },
    ];

    const result = await genai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json' },
    });

    const text = result.text || '';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    res.json(parsed);
  } catch (err) {
    console.error('[integrations] Extract error:', err);
    res.status(500).json({ message: err.message || 'Extraction failed' });
  }
});

export { router as integrationRoutes };