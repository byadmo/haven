/**
 * Client-side rate limiter and spam protection for AI chat calls.
 *
 * Prevents:
 * - Rapid-fire requests (token drain attacks)
 * - Identical repeated messages (replay / spam)
 * - Over-long prompts
 * - Suspicious injection patterns
 *
 * Uses a sliding-window token bucket per component instance.
 * State is in-memory only — no localStorage, no persistence.
 */

// ---- Configuration (tweak as needed) ----
const CONFIG = {
  // Sliding window: max N calls per W milliseconds
  MAX_CALLS: 30,        // max calls per window
  WINDOW_MS: 60_000,    // window length (1 minute)
  // Per-call cooldown — block if < this many ms since last call
  MIN_INTERVAL_MS: 800, // 800ms minimum between calls
  // Hard prompt length cap
  MAX_PROMPT_LENGTH: 32_000,  // characters
  // Token budget — rough char/word budget per window
  MAX_CHARS_PER_WINDOW: 200_000,
  // Suspicious patterns (prompt injection, system prompt extraction, etc.)
  SUSPICIOUS_PATTERNS: [
    // System prompt extraction attempts
    /ignore\s+(above|all|previous)\s+(instructions|directions|prompts)/i,
    /forget\s+(everything|all|above)/i,
    /you\s+(are\s+)?(now|are\s+now)\s+(free|not\s+bound|liberated|released)/i,
    /new\s+(instructions|prompt|directive|task)\s*[:：]/i,
    /override\s+(all\s+)?(instructions|prompts|system|directives)/i,
    /disregard\s+(all\s+)?(previous|above|prior)/i,
    /act\s+as\s+(if\s+)?you\s+(are|were)\s+(a\s+)?(different|new|raw|unrestricted)/i,
    /output\s+your\s+(original|initial|system|base)\s+(prompt|instructions|directives)/i,
    /what\s+(is\s+)?your\s+(system|initial|base)\s+(prompt|instructions?)/i,
    /repeat\s+(everything|all|the\s+text)\s+(above|before|previous)/i,
    // Dangerous HTML/script injection
    /<script\b/i,
    /javascript\s*:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /data:\s*text\/html/i,
    // Attempts to make the model output raw JSON/markdown of system prompt
    /print\s+(your\s+)?(system\s+)?prompt/i,
    /show\s+(me\s+)?(your\s+)?(full\s+)?(system\s+)?(prompt|instructions)/i,
  ],
  // Maximum duplicate identical messages in a row before blocking
  MAX_IDENTICAL_CONSECUTIVE: 3,
};

// ---- State (per module instance) ----
const callTimestamps = [];
let lastCallTs = 0;
let identicalStreak = 0;
let lastText = "";
let windowCharTotal = 0;
let windowCharResetAt = Date.now();

function resetWindowIfStale() {
  const now = Date.now();
  if (now - windowCharResetAt > CONFIG.WINDOW_MS) {
    windowCharTotal = 0;
    windowCharResetAt = now;
  }
}

/**
 * Check if a request passes all rate/spam guards.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
export function checkRateLimit(text) {
  const trimmed = (text || "").trim();
  const now = Date.now();

  // 1. Empty input
  if (!trimmed) {
    return { ok: false, reason: "Empty message" };
  }

  // 2. Max prompt length
  if (trimmed.length > CONFIG.MAX_PROMPT_LENGTH) {
    return { ok: false, reason: `Prompt too long (${trimmed.length.toLocaleString()} chars, max ${CONFIG.MAX_PROMPT_LENGTH.toLocaleString()})` };
  }

  // 3. Suspicious patterns
  for (const pattern of CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: "Message blocked — contains suspicious pattern" };
    }
  }

  // 4. Minimum interval between calls
  if (now - lastCallTs < CONFIG.MIN_INTERVAL_MS) {
    return { ok: false, reason: "Too fast — please wait a moment between messages" };
  }

  // 5. Identical consecutive message (replay attack)
  if (trimmed === lastText) {
    identicalStreak++;
    if (identicalStreak >= CONFIG.MAX_IDENTICAL_CONSECUTIVE) {
      return { ok: false, reason: "Duplicate message blocked — please rephrase" };
    }
  } else {
    identicalStreak = 0;
  }

  // 6. Sliding window call count
  const cutoff = now - CONFIG.WINDOW_MS;
  while (callTimestamps.length && callTimestamps[0] < cutoff) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= CONFIG.MAX_CALLS) {
    return { ok: false, reason: `Rate limit reached — ${CONFIG.MAX_CALLS} calls per ${CONFIG.WINDOW_MS / 1000}s` };
  }

  // 7. Character budget within window
  resetWindowIfStale();
  if (windowCharTotal + trimmed.length > CONFIG.MAX_CHARS_PER_WINDOW) {
    return { ok: false, reason: "Character budget exceeded for this period" };
  }

  return { ok: true };
}

/**
 * Record a successful API call (updates rate limiter state).
 * Call AFTER checkRateLimit passes.
 */
export function recordCall(text) {
  const trimmed = (text || "").trim();
  const now = Date.now();
  callTimestamps.push(now);
  lastCallTs = now;
  lastText = trimmed;
  resetWindowIfStale();
  windowCharTotal += trimmed.length;
}