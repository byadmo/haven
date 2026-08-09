import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

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

  if (!prompt) return res.status(400).json({ message: 'Prompt required' });

  // If no GenAI configured, return a helpful stub
  if (!genai) {
    return res.json({
      response: `[Local stub] LLM not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY in server/.env. Prompt was: ${prompt.substring(0, 200)}...`,
      _stub: true,
    });
  }

  try {
    // Build content parts
    const parts = [{ text: prompt }];

    // Attach files if provided
    for (const fileUrl of file_urls) {
      try {
        // If it's a local upload URL, read the file
        if (fileUrl.includes('/uploads/')) {
          const filename = fileUrl.split('/uploads/').pop();
          const filePath = path.join(import.meta.dirname, 'uploads', filename);
          if (fs.existsSync(filePath)) {
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

    // If JSON schema provided, use structured output
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
  // This is handled by /api/files/upload, but we provide a compatible endpoint
  // The client SDK calls this, so we just redirect logic
  res.status(400).json({ message: 'Use /api/files/upload for file uploads' });
});

// POST /api/integrations/core/extract-data-from-file
router.post('/core/extract-data-from-file', async (req, res) => {
  const { file_url, extraction_prompt } = req.body;

  if (!file_url) return res.status(400).json({ message: 'file_url required' });

  if (!genai) {
    return res.json({
      response: `[Local stub] File extraction not configured. Set GOOGLE_API_KEY.`,
      _stub: true,
    });
  }

  try {
    const filename = file_url.split('/uploads/').pop();
    const filePath = path.join(import.meta.dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
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
