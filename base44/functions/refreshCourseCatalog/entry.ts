import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as cheerio from 'npm:cheerio@1.0.0';

// ============================================================================
// 5-Stage Precision-Search + Dual-Tier + Hybrid Parser for undergraduate
// degree-track course requirements. Invoked by the Haven Education setup
// wizard pipeline and the Settings "Confirm & Parse" button.
//
//   Stage 1 — Precision Search (gemini-3-flash web-search) + Zero-Token URL
//             Weight Scoring (+50 calendar-path / +30 specialization slug /
//             -100 admissions|news|events|apply|faculty-directory)
//   Stage 2 — Dual-Tier Scraping: Tier A static fetch + regex gate;
//             Tier B Playwright fallback is unavailable in the Base44 runtime,
//             so when Tier A returns < 4 course codes we rely on Stage 5.
//   Stage 3 — Heading-Bounded Subtree Extraction (HBSE) via cheerio
//   Stage 4 — Deterministic Grammar Parser + Quality Gate (C >= 0.85 mid)
//   Stage 5 — Gemini-3-Flash schema-constrained fallback (thinkingLevel minimal)
//
// Self-heal: when the primary calendar URL returns a 'failed' or low-count
// 'partial' parse, the function gathers 2-3 ALTERNATE links (either supplied
// by the caller from findCourseCalendar, or freshly discovered via Stage 1
// precision search) and re-runs the Stage 2-5 pipeline on each. Every course
// extracted from any source is merged + deduplicated into a single
// CourseCatalogCache record and persisted immediately — so the user can start
// searching their catalog right away even when the best URL was only partially
// readable. (per user request: gather as much info as possible, actively
// cache + update memory so search is usable.)
// ============================================================================

const FETCH_TIMEOUT_MS = 9000;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const COVERAGE_THRESHOLD = 0.85; // Stage 4 emits JSON only at >= 85% coverage
const TIER_A_CODE_FLOOR = 4;     // Stage 2: accept static HTML if >= 4 distinct course codes
const MAX_GEMINI_CHARS = 30000;
const CODE_RE = /\b([A-Z]{2,4})\s?(\d{3,4})([A-Z]?)\b/g;
const YEAR_RE = /\b(?:year|annee|année)\s*([1-5])\b/i;
const TERM_RE = /\b(fall|winter|spring|summer|autumn|semester\s*[1-8]|semestre\s*[1-8]|term\s*[1-8])\b/i;
const NOISE_SEL = 'script, style, nav, footer, header, aside, noscript, svg, iframe, form, [role="navigation"], [role="banner"], [role="contentinfo"]';
// Self-heal thresholds: a primary parse below this course count triggers
// alternate-URL probing. Salvage-only 'partial' parses usually yield < 8.
const MIN_ACCEPTABLE_COURSES = 8;
const MAX_ALTERNATES = 3;
// Max precision-search rounds when every result so far has been a dead (404)
// link: each round rephrases the SERP query ("course catalog", "degree
// requirements", ...) so the retry isn't identical to the last. Bounded to
// avoid runaway Gemini credit spend.
const MAX_SEARCH_ROUNDS = 3;

// ============================================================================
// CWCS — Course Workload & Complexity Score calculator.
// Deterministic, synchronous, zero-LLM-overhead heuristic that scores every
// extracted course on a 1.0–10.0 scale DURING the parsing phase. The score is
// derived purely from the course code (level digit), prerequisite count, and
// regex scans of the description for lab/tutorial/capstone/intro markers — no
// LLM is consulted for the value, so it adds no token cost.
// ============================================================================

interface CourseDifficulty {
  /** 1.0 – 10.0, clamped to one decimal. */
  score: number;
  /** Workload band label derived from the score. */
  label: string;
  /** True when the description mentions a lab(/laboratory) component. */
  hasLab: boolean;
}

interface ParsedCourse {
  code: string;
  title: string;
  credits: number;
  prerequisites?: string[];
  description?: string;
  difficulty: CourseDifficulty;
}

function calculateCourseDifficulty(
  courseCode: string,
  description: string,
  prereqs: string[],
): { score: number; label: string } {
  const code = String(courseCode || '');
  const desc = String(description || '');
  const pr = Array.isArray(prereqs) ? prereqs : [];

  // 1) Level weight — first digit of the course number.
  const numMatch = code.match(/\d/);
  const levelDigit = numMatch ? parseInt(numMatch[0], 10) : 0;
  let score: number;
  if (levelDigit >= 5) score = 9.0;
  else if (levelDigit === 4) score = 8.0;
  else if (levelDigit === 3) score = 6.0;
  else if (levelDigit === 2) score = 4.0;
  else score = 2.0; // 1xx or unknown level — gentlest baseline.

  // 2) Prerequisite weight: +0.5 each, capped at +2.0.
  score += Math.min(2.0, pr.length * 0.5);

  // 3) Contact-hour weight (description regex).
  if (/\blab(oratory)?\b/i.test(desc)) score += 1.0;
  if (/\btutorial\b/i.test(desc)) score += 0.5;

  // 4) Semantic weight (description regex).
  if (/\b(capstone|thesis|independent study|project-based)\b/i.test(desc)) score += 1.5;
  if (/\b(intensive|advanced|rigorous|comprehensive)\b/i.test(desc)) score += 0.5;
  if (/\b(introductory|survey of|fundamentals of|basics)\b/i.test(desc)) score -= 1.0;

  // Clamp to [1.0, 10.0], one decimal.
  score = Math.max(1.0, Math.min(10.0, Math.round(score * 10) / 10));

  let label: string;
  if (score < 4.0) label = 'Introductory / Low Workload';
  else if (score < 6.5) label = 'Standard / Moderate Workload';
  else if (score < 8.5) label = 'Advanced / High Workload';
  else label = 'Intensive / Capstone Level';

  return { score, label };
}

// Wrapper that also derives `hasLab` and tolerates prereqs as array or string.
function difficultyForCourse(
  code: string,
  description: string,
  prerequisites: string[] | string | undefined,
): CourseDifficulty {
  const pr: string[] = Array.isArray(prerequisites)
    ? prerequisites
    : (typeof prerequisites === 'string' && prerequisites.trim()
      ? prerequisites.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : []);
  const hasLab = /\blab(oratory)?\b/i.test(String(description || ''));
  return { ...calculateCourseDifficulty(code, description, pr), hasLab };
}

function normKey(parts) {
  return parts.map((p) => (p || '').toString().trim().toLowerCase()).filter(Boolean).join('::');
}

async function fetchText(url, opts = {}) {
  const { asJson = false, timeoutMs = FETCH_TIMEOUT_MS } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': asJson ? 'application/json,text/plain;q=0.8' : 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (asJson) {
      if (!ct.includes('json') && !ct.includes('text/plain')) return null;
      try { return await res.json(); } catch { return null; }
    }
    if (!ct.includes('html') && !ct.includes('xhtml') && !ct.includes('text/plain') && !ct.includes('xml')) return null;
    return await res.text();
  } catch { return null; }
  finally { clearTimeout(t); }
}

// Liveness check: confirm a candidate URL actually serves a real calendar page
// (HTTP 200, HTML body, not a 404/"page not found" shell) before we spend a
// Gemini call on it. University calendars frequently 404 when the academic
// year path moves (e.g. /2024-2025/ → /2026-2027/), so AI-surfaced links can be
// stale even though a live page exists elsewhere.
async function verifyLive(url, timeoutMs = 7000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    clearTimeout(t);
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('html') && !ct.includes('xhtml') && !ct.includes('text/plain')) return false;
    const html = await res.text();
    if (!html || html.length < 1200) return false;
    const head = html.slice(0, 4000).toLowerCase();
    if (/requested page could not be found|page not found|404\s*-?\s*not found|page cannot be found|doesn.t exist|no longer available/.test(head)) return false;
    const codes = extractCodes(html);
    return codes.length >= 2 || html.length > 8000;
  } catch { return false; }
}

// Visible (rendered-text) length of an HTML body with nav/script/boilerplate
// stripped — a true content page has thousands of chars; a JavaScript-rendered
// SPA shell (Coursedog / CourseLeaf / Acalog catalogs) returns a near-empty
// body whose content is loaded by client JS a plain fetch can't execute.
function visibleTextLength(html) {
  try {
    const $ = cheerio.load(html || '');
    $(NOISE_SEL).remove();
    return ($('body').text() || $.root().text()).replace(/\s+/g, ' ').trim().length;
  } catch { return 0; }
}

// Known JS-rendered academic-calendar VENDOR signatures (common across
// Canadian / US universities). When the fetched HTML carries one of these
// markers AND has no extractable course codes, the page is a client-rendered
// SPA shell — raw scraping is impossible, so we skip straight to AI web-search
// extraction instead of burning more fetch + parse attempts.
function detectSpaVendor(html) {
  const h = (html || '').toLowerCase();
  const m = h.match(/coursecatalog|coursedog|courseleaf|acalog|leeplfrog|digarc|stellic/);
  return m ? m[0] : '';
}

// ---------------------------- Stage 1: Precision Search + URL Weight Scoring
// Issues the spec's exact SERP-style query via gemini-3-flash web-search (the
// only Base44 InvokeLLM model that supports add_context_from_internet), then
// scores the returned URLs with a zero-LLM +50/-100 path-quality rubric.
function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Zero-token URL weight scoring:
//   +50  path contains /calendar/, /catalog/, /programs/, /undergraduate/, /academic-programs/
//   +30  path contains the specialization slug (or its underscore variant)
//   -100 path contains /admissions/, /news/, /events/, /apply/, /faculty-directory/
function scoreUrl(url, specialization) {
  let score = 0;
  try {
    const u = new URL(url);
    const path = (u.pathname + '/').toLowerCase();
    if (/\/(calendar|catalog|programs|undergraduate|academic-programs)\//.test(path)) score += 50;
    if (specialization) {
      const slug = slugify(specialization);
      if (slug) {
        if (path.includes(slug)) score += 30;
        else {
          const alt = slug.replace(/-/g, '_');
          if (alt !== slug && path.includes(alt)) score += 30;
        }
      }
    }
    if (/\/(admissions|news|events|apply|faculty-directory)\//.test(path)) score -= 100;
    // Penalize archived year-prefixed subdomains (e.g.
    // 2022-2023.calendars.students.yorku.ca) — the current-year calendar lives
    // on the unprefixed domain, so prefer that over stale archives.
    if (/^https?:\/\/\d{4}[-_]\d{4}\./i.test(url)) score -= 40;
  } catch {}
  return score;
}

function pickBestUrl(urls, specialization) {
  let best = '', bestScore = -Infinity;
  for (const u of urls) {
    const s = scoreUrl(u, specialization);
    if (s > bestScore) { bestScore = s; best = u; }
  }
  return { url: best, score: bestScore };
}

async function precisionSearch(university, faculty, specialization, trackType, invokeLLM, round = 0) {
  // Rephrase the SERP qualifier each retry round so a search that returned only
  // dead links gets a fresh angle (course catalog, degree requirements,
  // undergraduate program). Round 0 = original query.
  const phrases = [
    '("undergraduate calendar" OR "academic calendar" OR "program requirements")',
    '("course catalog" OR "list of courses" OR "course offerings" OR "courses")',
    '("degree requirements" OR "undergraduate program" OR "academic plan")',
  ];
  const phrase = phrases[round % phrases.length];
  const query = `"${university}" "${specialization || ''}" "${faculty || ''}" ${phrase} -inurl:news -inurl:admissions -inurl:events`;
  const schema = {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Top organic result URLs for the query (max 8), most relevant first.',
      },
    },
    required: ['urls'],
  };
  const prompt = [
    'Run a Google web search with this exact query and return ONLY the organic result URLs:',
    query,
    `Prefer URLs from ${university}'s official domain. Return up to 8 distinct absolute URLs (no titles/snippets). Reject admissions, news, events, and faculty-directory pages.`,
  ].join('\n');
  try {
    const r = await invokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: schema,
    });
    const d = r?.data ?? r;
    let urls = Array.isArray(d?.urls) ? d.urls.map((u) => String(u).trim()).filter((u) => /^https?:\/\//i.test(u)) : [];
    if (!urls.length && typeof d === 'string') {
      urls = Array.from(d.matchAll(/https?:\/\/[^\s'"<>)]+/gi)).map((m) => m[0]);
    }
    return Array.from(new Set(urls)).slice(0, 8);
  } catch {
    return [];
  }
}

// Re-run precision search until at least `minWanted` LIVE url is found, varying
// the query phrasing each round. Verifies every candidate of each round (up to
// `cap`) and stops as soon as the live quota is met — so round 0 still verifies
// all of its candidates (preserving "pick best among multiple live"), and the
// rephrased rounds only kick in when round 0 returned only dead (404) links.
// `known` is a Set mutated with every URL ever seen (live or dead) so callers
// can reuse it as the self-heal alternate pool. Bounded by MAX_SEARCH_ROUNDS.
async function discoverLiveUrls({ university, faculty, specialization, trackType, invokeLLM, known, cap, minWanted, bump }) {
  const live = [];
  let searches = 0;
  for (let round = 0; round < MAX_SEARCH_ROUNDS && live.length < minWanted; round++) {
    let found = [];
    try {
      found = await precisionSearch(university, faculty, specialization, trackType, invokeLLM, round);
      searches++;
      if (bump) bump();
    } catch { /* try the next rephrased round */ }
    for (const u of found) {
      if (!u || known.has(u) || live.length >= cap) continue;
      known.add(u);
      if (await verifyLive(u)) live.push(u);
    }
  }
  return { live, searches };
}

// ---------------------------- Stage 3: HBSE ---------------------------------
function trackTokens(s) {
  const stop = new Set(['the', 'a', 'an', 'program', 'plan', 'of', 'stream', 'for', 'and', 'in', 'track']);
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && !stop.has(t));
}

function jaccard(a, b) {
  const sa = new Set(a), sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

// Build a heading list from h1-h6, score each against the trackType (Jaccard
// token overlap), pick the best match above a small floor, then collect the
// inline DOM content from that heading up to the next heading at the same or
// shallower depth (== the "isolated subtree"). Falls back to the full body
// when no track heading matches.
function hbse(html, trackType) {
  const $ = cheerio.load(html || '');
  $(NOISE_SEL).remove();
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (text) headings.push({ $el, text, level: parseInt(el.tagName[1], 10) });
  });
  const tt = trackTokens(trackType);
  let best = null, bestScore = 0;
  for (const h of headings) {
    const score = jaccard(trackTokens(h.text), tt);
    if (score > bestScore && score >= 0.34) { bestScore = score; best = h; }
  }
  let isolated = '';
  if (best) {
    let $cursor = best.$el;
    const collected = [];
    while ($cursor.length) {
      collected.push($cursor);
      const $next = $cursor.next();
      if (!$next.length) break;
      const tag = $next.get(0).tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag) && parseInt(tag[1], 10) <= best.level) break;
      $cursor = $next;
    }
    isolated = $.html(collected);
  }
  if (!isolated) isolated = $('body').html() || $.html();
  const isolatedText = cheerio.load(isolated)('body').text().replace(/\s+/g, ' ').trim();
  return { $, isolated, isolatedText };
}

// ---------------------------- Stage 4: Deterministic Grammar Parser ---------
function addCourse(years, year, term, code, title, credits) {
  if (!years[year]) years[year] = {};
  if (!years[year][term]) years[year][term] = [];
  if (years[year][term].some((c) => c.code === code)) return;
  years[year][term].push({
    code,
    title: title || code,
    credits: Number(credits) || 0,
    difficulty: difficultyForCourse(code, '', []),
  });
}

function stageAstParse(isolatedHtml, trackType) {
  const $root = cheerio.load(isolatedHtml || '');
  $root(NOISE_SEL).remove();
  const years = {};
  let curYear = 1, curTerm = '';
  let total = 0, codeRows = 0;
  $root('h1, h2, h3, h4, h5, h6, tr, li').each((_, el) => {
    const $el = $root(el);
    const tag = el.tagName.toLowerCase();
    if (tag.startsWith('h')) {
      const text = $el.text().replace(/\s+/g, ' ').trim();
      const ym = text.match(YEAR_RE);
      const tm = text.match(TERM_RE);
      if (ym) curYear = parseInt(ym[1], 10) || curYear;
      if (tm) curTerm = tm[1].replace(/\s+/g, ' ').trim();
      return;
    }
    if (tag === 'tr') {
      const cells = [];
      $el.children('td, th').each((__, c) => cells.push($root(c).text().replace(/\s+/g, ' ').trim()));
      if (!cells.length) return;
      total++;
      CODE_RE.lastIndex = 0;
      const m = CODE_RE.exec(cells.join(' | '));
      if (m) {
        codeRows++;
        const code = (m[1] + m[2] + (m[3] || '')).toUpperCase();
        const title = cells.find((c) => c && c !== code && !/^\d/.test(c)) || code;
        const credits = Number(cells.find((c) => /^\d/.test(c) && c.length <= 4)) || 0;
        addCourse(years, curYear, curTerm || 'Plan', code, title, credits);
      }
      return;
    }
    // list items + paragraphs that contain a single course code
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    total++;
    CODE_RE.lastIndex = 0;
    const m = CODE_RE.exec(text);
    if (m) {
      codeRows++;
      const code = (m[1] + m[2] + (m[3] || '')).toUpperCase();
      const title = text.replace(code, '').replace(/^[\s:–-]+/, '').trim() || code;
      addCourse(years, curYear, curTerm || 'Plan', code, title, 0);
    }
  });
  const coverage = total ? codeRows / total : 0;
  const totalCourses = Object.values(years).reduce(
    (s, terms) => s + Object.values(terms).reduce((ss, list) => ss + list.length, 0), 0);
  const academicYears = Object.keys(years).sort((a, b) => +a - +b).map((yn) => ({
    yearNumber: parseInt(yn, 10),
    terms: Object.entries(years[yn]).map(([termName, list]) => ({ termName, requiredCourses: list })),
  }));
  return { academicYears, coverage, totalCourses, totalRows: total };
}

function extractCodes(text) {
  if (!text) return [];
  const out = []; const seen = new Set();
  CODE_RE.lastIndex = 0;
  let m;
  while ((m = CODE_RE.exec(text)) !== null) {
    const code = (m[1] + m[2] + (m[3] || '')).toUpperCase();
    if (!seen.has(code)) { seen.add(code); out.push(code); }
  }
  return out;
}

// Walk rows / list-items / paragraphs in the HTML, find the first course code in
// each, and use the ADJACENT non-code, non-numeric cell/text as the title — so
// salvage never reduces course names to bare codes when Gemini fails.
function salvageCourses(htmlOrText) {
  if (!htmlOrText) return [];
  let $ = null;
  try { $ = cheerio.load(htmlOrText); } catch { return []; }
  if (!$) return [];
  const out = []; const seen = new Set();
  const isCodeCell = (c, code, raw) => !c || c === code || c === raw ||
    c.replace(/\s+/g, '') === code.replace(/\s+/g, '');
  $('tr, li, p, dd, dt').each((_, el) => {
    const $el = $(el);
    const cells = $el.children('td, th').map((__, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();
    const haystack = (cells.length ? cells.join(' | ') : $el.text()).replace(/\s+/g, ' ').trim();
    if (!haystack) return;
    CODE_RE.lastIndex = 0;
    const m = CODE_RE.exec(haystack);
    if (!m) return;
    const raw = m[0];
    const code = (m[1] + m[2] + (m[3] || '')).toUpperCase();
    if (seen.has(code)) return;
    seen.add(code);
    let title = '';
    if (cells.length >= 2) {
      title = cells.find((c) => !isCodeCell(c, code, raw) && !/^\s*\d/.test(c) && c.length > 2) || '';
    }
    if (!title) {
      title = haystack.replace(raw, ' ').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      title = title.replace(/^[\s:–\-]+/, '').replace(/[\s:–\-]+$/, '').trim();
      title = title.replace(/\s*\(?\d+(?:\.\d+)?\s*(?:cr|credits?|hrs?|units?)?\)?\s*$/i, '').trim();
    }
    if (!title || isCodeCell(title, code, raw)) title = code;
    out.push({ code, title, credits: 0, difficulty: difficultyForCourse(code, '', []) });
  });
  return out;
}

// ---------------------------- Stage 5: Gemini 3 Flash ------------------------
const PROGRAM_SCHEMA = {
  type: 'object',
  properties: {
    degreeTitle: { type: 'string' },
    trackType: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string' },
    academicYears: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          yearNumber: { type: 'integer' },
          terms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                termName: { type: 'string' },
                requiredCourses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      title: { type: 'string' },
                      credits: { type: 'number' },
                      prerequisites: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      difficulty: {
                        type: 'object',
                        properties: {
                          score: { type: 'number' },
                          label: { type: 'string' },
                          hasLab: { type: 'boolean' },
                        },
                      },
                    },
                    required: ['code', 'title'],
                  },
                },
              },
              required: ['termName', 'requiredCourses'],
            },
          },
        },
        required: ['yearNumber', 'terms'],
      },
    },
  },
  required: ['academicYears'],
};

function buildGeminiPrompt(university, faculty, specialization, trackType, sourceUrl, text) {
  return [
    `You are parsing an undergraduate academic-calendar excerpt for ${university} (${faculty || 'faculty'}${specialization ? ' — ' + specialization : ''}).`,
    `Source URL: ${sourceUrl}`,
    `Extract the DEGREE REQUIREMENTS for the "${trackType}" track: courses mapped by year and term.`,
    "Return JSON with: degreeTitle, trackType (the label you matched, or ''), confidence ('high'|'medium'|'low'), notes (short), academicYears (array of { yearNumber (int), terms: [ { termName, requiredCourses: [ { code, title, credits (number, 0 if unknown) } ] } ] }).",
    "Only include courses actually present in the excerpt. For EVERY course, return the human-readable course title shown on the page next to its code — NEVER repeat the bare code as the title.",
    "Search the WHOLE excerpt for the year-by-year curriculum table (look deeper down the page if only a program description appears at the top). Use term names exactly as on the page (Fall, Winter, Semester 1, ...). Omit transition / remedial / exclusion lists and pre-requisite mention rows.",
    "If the excerpt isn't a course listing at all, confidence='low' and empty academicYears.",
    "EXCERPT:\n" + (text || '').slice(0, MAX_GEMINI_CHARS),
  ].join('\n');
}

// ============================================================================
// Self-heal helpers: parse ONE url end-to-end, then merge results across
// multiple sources into a single deduplicated catalog.
// ============================================================================

function countCourses(academicYears) {
  if (!Array.isArray(academicYears)) return 0;
  return academicYears.reduce((s, y) =>
    s + (y?.terms || []).reduce((ss, t) => ss + (t?.requiredCourses || []).length, 0), 0);
}

// Parse a single calendar URL through Stage 2-5. Self-contained so the main
// flow can call it repeatedly across alternate URLs during self-heal.
// Returns { academicYears, parse_status, parse_notes, executionMode, courseCount, sourceUrl }.
async function parseOneUrl({ base44, university, faculty, degree_program, specialization, trackType, sourceUrl, tokenUsageRef }) {
  let executionMode = null;
  let parse_notes = '';
  let academicYears = [];
  let cleanedHtml = '';

  const html = await fetchText(sourceUrl);
  const tierACodes = extractCodes(html || '');
  // ---- JS-rendered SPA shell detection ----
  // Known catalog vendors (Coursedog, CourseLeaf, Acalog, …) and generic JS
  // shells deliver an empty <body> with the real content loaded by client
  // scripts a plain fetch can't execute. If the static HTML has no course
  // codes AND either a vendor marker or a near-empty body, bail out of raw
  // scraping and flag the URL so the orchestrator switches to AI web-search
  // extraction instead of wasting more fetch attempts on the same SPA.
  if (html && tierACodes.length < TIER_A_CODE_FLOOR) {
    const vendor = detectSpaVendor(html);
    const vtext = visibleTextLength(html);
    if (vendor || vtext < 500) {
      return {
        sourceUrl,
        academicYears: [],
        parse_status: 'failed',
        parse_notes: vendor
          ? `Detected JS-rendered catalog vendor "${vendor}" — static HTML carries ${tierACodes.length} course code(s) / ${vtext} visible chars; client-rendered, needs AI web-search extraction.`
          : `Static HTML is a likely JS-rendered shell (${vtext} visible chars, ${tierACodes.length} course code(s)); AI web-search extraction required.`,
        executionMode: null,
        courseCount: 0,
        cleanedHtml: html,
        js_shell: true,
      };
    }
  }
  if (!html || html.length < 200) {
    const salvaged = salvageCourses(html || '');
    return {
      sourceUrl,
      academicYears: salvaged.length ? [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: salvaged }] }] : [],
      parse_status: salvaged.length ? 'partial' : 'failed',
      parse_notes: salvaged.length ? 'Salvage from raw HTML.' : 'Could not render the target calendar page.',
      executionMode: salvaged.length ? 'DETERMINISTIC_AST' : null,
      courseCount: salvaged.length,
      cleanedHtml: html || '',
    };
  }
  cleanedHtml = html;
  const hb = hbse(html, trackType);
  const $$ = hb.$;
  const isolatedText = hb.isolatedText;
  if (tierACodes.length < TIER_A_CODE_FLOOR) {
    parse_notes = `Stage 2 Tier A: only ${tierACodes.length} course codes in static HTML (< ${TIER_A_CODE_FLOOR}); Playwright Tier B unavailable in runtime.`;
  }

  const ast = stageAstParse(hb.isolated, trackType);
  if (ast.totalCourses >= 5 && ast.coverage >= COVERAGE_THRESHOLD) {
    executionMode = 'DETERMINISTIC_AST';
    return {
      sourceUrl,
      academicYears: ast.academicYears,
      parse_status: 'success',
      parse_notes: `Deterministic AST: ${ast.totalCourses} courses, ${(ast.coverage * 100).toFixed(0)}% coverage.`,
      executionMode,
      courseCount: ast.totalCourses,
      cleanedHtml,
    };
  }

  // Stage 5: Gemini fallback.
  try {
    let geminiText = isolatedText;
    if (ast.coverage < COVERAGE_THRESHOLD && $$) {
      const fullText = $$('body').text().replace(/\s+/g, ' ').trim();
      if (extractCodes(fullText).length > extractCodes(isolatedText).length) geminiText = fullText;
    }
    const gres = await base44.integrations.Core.InvokeLLM({
      prompt: buildGeminiPrompt(university, faculty, degree_program, trackType, sourceUrl, geminiText),
      model: 'gemini_3_flash',
      response_json_schema: PROGRAM_SCHEMA,
    });
    tokenUsageRef.value += 1;
    const d = gres?.data ?? gres;
    if (d && Array.isArray(d.academicYears)) {
      executionMode = 'GEMINI_FALLBACK';
      academicYears = d.academicYears
        .filter((y) => y && y.yearNumber != null)
        .map((y) => ({
          yearNumber: Number(y.yearNumber) || 0,
          terms: (y.terms || []).map((t) => ({
            termName: String(t.termName || '').trim(),
            requiredCourses: (t.requiredCourses || []).map((c) => {
              const prereqs = Array.isArray(c.prerequisites)
                ? c.prerequisites.map((p) => String(p || '').trim()).filter(Boolean)
                : [];
              const desc = String(c.description || '').trim();
              return {
                code: String(c.code || '').trim(),
                title: String(c.title || c.code || '').trim(),
                credits: typeof c.credits === 'number' ? c.credits : 0,
                prerequisites: prereqs,
                description: desc,
                // Authoritative CWCS value — overwrite any LLM-supplied guess.
                difficulty: difficultyForCourse(String(c.code || ''), desc, prereqs),
              };
            }).filter((c) => c.code),
          })),
        }));
      if (academicYears.length > 0) {
        const conf = String(d.confidence || 'low').toLowerCase();
        const pStatus = conf === 'low' ? 'partial' : 'success';
        parse_notes = (d.notes || 'Gemini-3-flash extraction.') +
          ` AST coverage was ${(ast.coverage * 100).toFixed(0)}% (< ${COVERAGE_THRESHOLD * 100}%).`;
        return { sourceUrl, academicYears, parse_status: pStatus, parse_notes, executionMode, courseCount: countCourses(academicYears), cleanedHtml };
      }
      // Gemini returned an empty-but-valid schema (no courses extracted) —
      // record the note and fall through to code salvage so the page's course
      // codes still make it into the cache instead of returning 0.
      parse_notes = (d.notes || 'Gemini-3-flash returned no courses.') +
        ` AST coverage was ${(ast.coverage * 100).toFixed(0)}% (< ${COVERAGE_THRESHOLD * 100}%); falling back to salvage.`;
    }
  } catch (e) {
    parse_notes = 'Gemini fallback failed: ' + (e?.message || 'unknown');
  }

  // Last-resort salvage from this page.
  const salvaged = salvageCourses(cleanedHtml || isolatedText);
  if (salvaged.length) {
    executionMode = executionMode || 'DETERMINISTIC_AST';
    return {
      sourceUrl,
      academicYears: [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: salvaged }] }],
      parse_status: 'partial',
      parse_notes: (parse_notes ? parse_notes + ' ' : '') + `Salvage: ${salvaged.length} courses with titles.`,
      executionMode,
      courseCount: salvaged.length,
      cleanedHtml,
    };
  }
  return { sourceUrl, academicYears: [], parse_status: 'failed', parse_notes, executionMode: null, courseCount: 0, cleanedHtml };
}

// ---------------------------- AI Web-Search Extraction ----------------------
// For JS-rendered calendar platforms (and any URL whose raw fetch yields no
// course content), fall back to a Gemini-3-flash WEB SEARCH that hunts the
// program's course list across the open web — department pages, syllabi, PDF
// calendars, third-party aggregators — rather than scraping one broken SPA.
// Whatever real courses it finds are cached so search-by-code works even when
// the official calendar cannot be scraped at all.
const WEB_SEARCH_COURSE_SCHEMA = {
  type: 'object',
  properties: {
    university: { type: 'string' },
    program: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: { type: 'string' },
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          credits: { type: 'number' },
          description: { type: 'string' },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
          },
          difficulty: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              label: { type: 'string' },
              hasLab: { type: 'boolean' },
            },
          },
        },
        required: ['code', 'title'],
      },
    },
  },
  required: ['courses'],
};

function buildWebSearchPrompt(university, faculty, degree_program, specialization, trackType) {
  const prog = degree_program || specialization || 'the program';
  return [
    `You are researching the undergraduate curriculum for the "${trackType}" in ${prog} at ${university}${faculty ? ' (' + faculty + ')' : ''}.`,
    'The official academic calendar is a JavaScript-rendered site that cannot be scraped, so use your WEB SEARCH to find the actual course list from other sources (department pages, course outlines, syllabi, catalog mirrors, reputable aggregators).',
    `Search the web for: "${university}" "${prog}" undergraduate program required courses course codes`,
    `If helpful, also search for individual course descriptions: e.g. "${university}" PSYC 1010 course description.`,
    'Return the full set of courses a student in this program takes (core/required courses and common electives). For EACH course return: code (subject + number, e.g. "PSYC 1010"), title (the human-readable name as published), credits (number; 0 if unknown), description (1-2 sentence summary from an official source).',
    'Only include courses you actually found evidence for — NEVER invent course codes. If no real courses can be found, return an empty courses array with confidence "low" and a short note describing what you searched.',
  ].join('\n');
}

async function aiWebSearchExtract({ base44, university, faculty, degree_program, specialization, trackType, tokenUsageRef }) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: buildWebSearchPrompt(university, faculty, degree_program, specialization, trackType),
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: WEB_SEARCH_COURSE_SCHEMA,
    });
    tokenUsageRef.value += 1;
    const d = res?.data ?? res;
    const notes = String(d?.notes || '').trim();
    const conf = String(d?.confidence || 'low').toLowerCase();
    const courses = Array.isArray(d?.courses) ? d.courses
      .filter((c) => c && c.code)
      .map((c) => {
        const prereqs = Array.isArray(c.prerequisites)
          ? c.prerequisites.map((p) => String(p || '').trim()).filter(Boolean)
          : [];
        const desc = String(c.description || '').trim();
        return {
          code: String(c.code).trim(),
          title: String(c.title || c.code).trim(),
          credits: typeof c.credits === 'number' ? c.credits : 0,
          description: desc,
          prerequisites: prereqs,
          difficulty: difficultyForCourse(String(c.code), desc, prereqs),
        };
      }) : [];
    const academicYears = courses.length
      ? [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: courses.map((c) => ({ code: c.code, title: c.title, credits: c.credits, description: c.description, difficulty: c.difficulty })) }] }]
      : [];
    return {
      sourceUrl: `AI web-search (${university})`,
      academicYears,
      parse_status: courses.length ? (conf === 'high' || conf === 'medium' ? 'success' : 'partial') : 'failed',
      parse_notes: courses.length
        ? `AI web-search extraction: ${courses.length} courses (confidence ${conf}).${notes ? ' ' + notes : ''}`
        : `AI web-search extraction found no courses.${notes ? ' ' + notes : ''}`,
      executionMode: 'AI_WEB_SEARCH',
      courseCount: courses.length,
      cleanedHtml: '',
      js_shell: false,
    };
  } catch (e) {
    return {
      sourceUrl: `AI web-search (${university})`,
      academicYears: [],
      parse_status: 'failed',
      parse_notes: `AI web-search extraction failed: ${e?.message || 'unknown'}`,
      executionMode: null,
      courseCount: 0,
      cleanedHtml: '',
      js_shell: false,
    };
  }
}

// Normalize a course code for dedup (uppercase, alnum only).
function normCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Title-quality helpers for the merge. A "bare" title is one that's just the
// course code (or empty) — the parser/salvage couldn't recover a real name.
// When the same code appears on multiple cached links, the BETTER title wins
// (descriptive > bare, longer descriptive > shorter) and missing credits are
// filled from whichever source had them.
function isBareTitle(title, code) {
  if (!title) return true;
  const t = String(title).trim();
  if (!t) return true;
  const key = normCode(code);
  if (normCode(t) === key) return true;
  return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === key;
}
function betterTitle(a, b, code) {
  const bareA = isBareTitle(a, code);
  const bareB = isBareTitle(b, code);
  if (bareA && !bareB) return b;
  if (!bareA && bareB) return a;
  const la = String(a || '').trim().length, lb = String(b || '').trim().length;
  return lb > la ? b : a;
}

// Merge per-URL parse results into ONE deduplicated flat course list + a single
// curriculum (uses the richest source's academicYears, then appends any
// courses found only on alternate pages under a 'Catalog' catch-all term so
// search-by-code still surfaces them). Duplicate codes across sources are
// collapsed to one row with the best title.
function mergeResults(results) {
  const entryMap = new Map();
  const order = [];
  for (const r of results) {
    for (const y of (r.academicYears || [])) {
      for (const t of (y.terms || [])) {
        for (const c of (t.requiredCourses || [])) {
          const key = normCode(c.code);
          if (!key) continue;
          const code = c.code;
          const title = c.title || c.code;
          const credits = typeof c.credits === 'number' ? c.credits : 0;
          const existing = entryMap.get(key);
          if (!existing) {
            const prereqArr = Array.isArray(c.prerequisites)
              ? c.prerequisites
              : (typeof c.prerequisites === 'string' && c.prerequisites.trim()
                ? c.prerequisites.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
                : []);
            entryMap.set(key, {
              course_code: code,
              course_title: title,
              course_description: c.description || '',
              credits,
              prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.join(', ') : (c.prerequisites || ''),
              department: '',
              difficulty_hints: '',
              difficulty: c.difficulty || difficultyForCourse(code, c.description || '', prereqArr),
              source_url: r.sourceUrl,
            });
            order.push(key);
          } else {
            if (betterTitle(existing.course_title, title, key) !== existing.course_title) {
              existing.course_title = title;
            }
            if (!existing.credits && credits) existing.credits = credits;
            if (!existing.course_description && c.description) existing.course_description = c.description;
          }
        }
      }
    }
  }
  const flat = order.map((k) => entryMap.get(k));
  // Curriculum: use the richest source's structure; any leftover courses go to
  // a 'Catalog' catch-all year so the curriculum reflects the merged set.
  const richest = results.slice().sort((a, b) => countCourses(b.academicYears) - countCourses(a.academicYears))[0];
  let curriculum = [];
  if (richest && Array.isArray(richest.academicYears) && richest.academicYears.length) {
    const richSeen = new Set();
    curriculum = richest.academicYears.map((y) => ({
      year: 'Year ' + y.yearNumber,
      terms: y.terms.map((t) => ({
        term: t.termName,
        courses: (t.requiredCourses || []).map((c) => {
          const key = normCode(c.code);
          richSeen.add(key);
          const prereqArr = Array.isArray(c.prerequisites) ? c.prerequisites : [];
          return { code: c.code, title: c.title || c.code, difficulty: c.difficulty || difficultyForCourse(c.code, c.description || '', prereqArr) };
        }),
      })),
    }));
    // Append leftover courses (found only on alternates) under a Catalog term.
    const leftovers = flat.filter((f) => f.source_url !== richest.sourceUrl && !richSeen.has(normCode(f.course_code)));
    if (leftovers.length) {
      curriculum.push({
        year: 'Catalog',
        terms: [{ term: 'Catalog', courses: leftovers.map((f) => ({ code: f.course_code, title: f.course_title, difficulty: f.difficulty || difficultyForCourse(f.course_code, f.course_description || '', []) })) }],
      });
    }
  } else if (flat.length) {
    curriculum = [{ year: 'Catalog', terms: [{ term: 'Catalog', courses: flat.map((f) => ({ code: f.course_code, title: f.course_title, difficulty: f.difficulty || difficultyForCourse(f.course_code, f.course_description || '', []) })) }] }];
  }
  return { flatCourses: flat, curriculum };
}

// ============================================================================
export default async function (req) {
  let executionMode = null;
  let tokenUsage = 0;
  let sourceUrl = '';
  let university = '', faculty = '', specialization = '', degree_program = '', trackType = '';
  let parse_notes_stage1 = '';
  let academicYears = [];
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    university = (body.university || body.university_name || '').toString().trim();
    faculty = (body.faculty || '').toString().trim();
    specialization = (body.specialization || '').toString().trim();
    degree_program = (body.degree_program || specialization || '').toString().trim();
    trackType = (body.trackType || body.track_type || 'Full-Time, Four-Year Program').toString().trim();
    const url0 = (body.calendarUrl || body.university_course_catalog_url || '').toString().trim();
    const parse_only = !!body.parse_only;
    const force = !!body.force || parse_only;
    // Caller-supplied alternate URLs (from findCourseCalendar) — used to
    // self-heal when the primary URL fails or only partially parses.
    const callerAlternates = Array.isArray(body.alternate_urls)
      ? body.alternate_urls.map((u) => String(u || '').trim()).filter((u) => /^https?:\/\//i.test(u))
      : [];

    if (!university) return Response.json({ status: 'error', error: 'university is required' }, { status: 400 });
    const key = normKey([university, faculty, degree_program || specialization]);

    // Cache short-circuit (unless forced / parse_only).
    let rec = null;
    try {
      const hits = await base44.asServiceRole.entities.CourseCatalogCache.filter({ cache_key: key }, '-last_parsed_at', 1);
      rec = Array.isArray(hits) && hits[0] ? hits[0] : null;
    } catch {}
    const now = Date.now();
    if (!force && rec && rec.last_parsed_at && (rec.parse_status === 'success' || rec.parse_status === 'partial') &&
        (now - +new Date(rec.last_parsed_at) < FRESH_MS)) {
      const m = (rec.parse_notes || '').match(/(VENDOR_API|DETERMINISTIC_AST|GEMINI_FALLBACK)/);
      // Enrich curriculum courses with cached CWCS difficulty (computed during
      // the original parse). Fall back to a fresh deterministic calc for legacy
      // caches that predate the difficulty field.
      const diffByCode: Record<string, CourseDifficulty> = {};
      for (const pc of (rec.parsed_courses || [])) {
        const k = normCode(pc.course_code);
        if (k && pc.difficulty) diffByCode[k] = pc.difficulty as CourseDifficulty;
      }
      const acadYearsFromCache = (rec.curriculum || []).map((y: any) => ({
        ...y,
        terms: (y.terms || []).map((t: any) => ({
          ...t,
          courses: (t.courses || []).map((c: any) => ({
            ...c,
            difficulty: c.difficulty || diffByCode[normCode(c.code)] || difficultyForCourse(c.code, '', []),
          })),
        })),
      }));
      return Response.json({
        status: 'success', executionMode: m ? m[1] : 'GEMINI_FALLBACK',
        meta: { university, faculty, specialization: degree_program, trackType, sourceUrl: rec.calendar_source_url, tokenUsage: 0 },
        program: { degreeTitle: '', academicYears: acadYearsFromCache },
        cached: true, cache_id: rec.id, parse_status: rec.parse_status,
        course_count: (rec.parsed_courses || []).length, last_parsed_at: rec.last_parsed_at,
        calendar_source_url: rec.calendar_source_url,
      });
    }

    // ------------------- Stage 1: Precision Search + URL Weight Scoring -----
    // The caller MAY supply an explicit calendar URL (parse_only / setup-wizard
    // save-then-parse flow). Otherwise run a gemini-3-flash web-search query
    // and apply the zero-LLM +50/-100 path-quality rubric to its candidates.
    let stage1Urls = [];
    if (url0 && /^https?:\/\//i.test(url0)) {
      sourceUrl = url0;
    } else {
      // Discover LIVE candidate URLs, restarting with rephrased queries when a
      // search returns only dead (404) links — up to MAX_SEARCH_ROUNDS rounds.
      const stage1Seen = new Set();
      const { live: liveUrls, searches: s1Searches } = await discoverLiveUrls({
        university, faculty, specialization: degree_program || specialization, trackType,
        invokeLLM: (p) => base44.integrations.Core.InvokeLLM(p),
        known: stage1Seen, cap: 8, minWanted: 1,
        bump: () => { tokenUsage += 1; },
      });
      stage1Urls = Array.from(stage1Seen);
      const pick = pickBestUrl(liveUrls.length ? liveUrls : stage1Urls, specialization || degree_program);
      sourceUrl = pick.url;
      if (stage1Urls.length) {
        parse_notes_stage1 = `Stage 1: ${s1Searches} search round(s), ${stage1Urls.length} URL(s), ${liveUrls.length} live; picked score=${pick.score}.`;
      }
    }
    if (!sourceUrl) {
      return Response.json({
        status: 'error', error: 'Precision search returned no candidate calendar URLs.',
        meta: { university, faculty, specialization: degree_program, trackType, sourceUrl: '', tokenUsage },
        program: { degreeTitle: '', academicYears: [] },
        parse_status: 'failed', parse_notes: 'Precision search returned no candidate calendar URLs.',
      }, { status: 422 });
    }

    const tokenUsageRef = { value: tokenUsage };

    // -------- Parse the primary URL (Stage 2-5) -----------------------------
    let primary = await parseOneUrl({ base44, university, faculty, degree_program, specialization, trackType, sourceUrl, tokenUsageRef });
    let results = [primary];
    let triedAlts = [];

    // -------- Self-heal: if the primary parse failed or only partially
    // parsed, discover LIVE alternate pages and merge their courses. The
    // caller's alternates (from "AI Find Calendar") can be stale — last year's
    // calendar path that now 404s — so we combine them with a fresh precision
    // search and keep ONLY URLs that return HTTP 200 with real content, never
    // spending a Gemini call on a dead page.
    const needsMore = (r) => r.parse_status === 'failed' || (r.parse_status === 'partial' && r.courseCount < MIN_ACCEPTABLE_COURSES);

    if (needsMore(primary)) {
      if (primary.js_shell) {
        // JS-rendered SPA / known catalog vendor (Coursedog, CourseLeaf, Acalog…):
        // raw scraping is impossible on this domain, so DON'T burn more fetch
        // attempts on alternate URLs of the same broken platform. Switch
        // straight to AI web-search extraction across the open web.
        const ws = await aiWebSearchExtract({ base44, university, faculty, degree_program, specialization, trackType, tokenUsageRef });
        results.push(ws);
        if (ws.parse_status !== 'failed') sourceUrl = ws.sourceUrl;
      } else {
        let liveAlts = [];
        const seen = new Set([sourceUrl]);
        for (const u of [...callerAlternates, ...stage1Urls]) {
          if (seen.has(u) || liveAlts.length >= MAX_ALTERNATES) continue;
          seen.add(u);
          if (await verifyLive(u)) liveAlts.push(u);
        }
        if (liveAlts.length === 0) {
          // All caller/Stage-1 alternates were dead — restart the link search
          // with rephrased queries until a LIVE url surfaces, or all MAX_SEARCH
          // ROUNDS are spent. (per user request: keep restarting until it's no
          // longer returning dead links.)
          const { live, searches } = await discoverLiveUrls({
            university, faculty, specialization: degree_program || specialization, trackType,
            invokeLLM: (p) => base44.integrations.Core.InvokeLLM(p),
            known: seen, cap: MAX_ALTERNATES, minWanted: 1,
            bump: () => { tokenUsageRef.value += 1; },
          });
          liveAlts = live;
          if (live.length === 0) {
            parse_notes_stage1 = (parse_notes_stage1 ? parse_notes_stage1 + ' ' : '') +
              `Self-heal: ${searches} rephrased search round(s) all returned dead links.`;
          }
        } else if (liveAlts.length < MAX_ALTERNATES) {
          // Already have ≥1 live alt; top up with one more round if short.
          try {
            const found = await precisionSearch(university, faculty, degree_program || specialization, trackType,
              (p) => base44.integrations.Core.InvokeLLM(p), 0);
            tokenUsageRef.value += 1;
            for (const u of found) {
              if (seen.has(u) || liveAlts.length >= MAX_ALTERNATES) continue;
              seen.add(u);
              if (await verifyLive(u)) liveAlts.push(u);
            }
          } catch {}
        }

        for (const alt of liveAlts) {
          // Stop once a source fully parses AND we've gathered a healthy total — each probe takes a Gemini call.
          const mergedCount = results.reduce((s, r) => s + (r.courseCount || 0), 0);
          const anySuccess = results.some((r) => r.parse_status === 'success');
          if (anySuccess && mergedCount >= 25) break;
          triedAlts.push(alt);
          try {
            const r = await parseOneUrl({ base44, university, faculty, degree_program, specialization, trackType, sourceUrl: alt, tokenUsageRef });
            results.push(r);
          } catch { /* ignore, keep going */ }
        }

        // If the confirmed/picked primary was dead but a live alternate parsed,
        // report the live URL as the effective source so the user sees a real link.
        if (primary.parse_status === 'failed' && results.length > 1) {
          const liveBest = results.slice(1)
            .filter((r) => r.parse_status !== 'failed')
            .sort((a, b) => (b.courseCount || 0) - (a.courseCount || 0))[0];
          if (liveBest) sourceUrl = liveBest.sourceUrl;
        }

        // Still empty / very low after raw self-heal → AI web-search extraction
        // as the last resort (covers non-SPA sites with no scrapeable course
        // table, and any alternates that were themselves JS shells).
        const gathered = results.reduce((s, r) => s + (r.courseCount || 0), 0);
        if (gathered < MIN_ACCEPTABLE_COURSES) {
          const ws = await aiWebSearchExtract({ base44, university, faculty, degree_program, specialization, trackType, tokenUsageRef });
          results.push(ws);
          if (ws.parse_status !== 'failed' && gathered === 0) sourceUrl = ws.sourceUrl;
        }
      }
    }
    tokenUsage = tokenUsageRef.value;

    // -------- Merge + dedup every course gathered across all sources --------
    const { flatCourses, curriculum } = mergeResults(results);
    const bestResult = results.slice().sort((a, b) => (b.courseCount || 0) - (a.courseCount || 0))[0];
    academicYears = bestResult?.academicYears || [];
    executionMode = bestResult?.executionMode || 'GEMINI_FALLBACK';

    let parse_status;
    if (results.some((r) => r.parse_status === 'success')) parse_status = 'success';
    else if (flatCourses.length > 0) parse_status = 'partial';
    else parse_status = 'failed';

    // Build the parse notes — always cite the self-heal trail so the user can
    // see which sources contributed to the merged cache.
    let parse_notes = parse_notes_stage1 || '';
    const primaryNote = `Primary ${primary.sourceUrl}: ${primary.parse_status} (${primary.courseCount} courses).`;
    parse_notes = (parse_notes ? parse_notes + ' ' : '') + primaryNote;
    if (triedAlts.length) {
      const altNotes = triedAlts.map((u, i) => {
        const r = results[i + 1];
        return `${u}: ${r.parse_status} (${r.courseCount})`;
      }).join('; ');
      parse_notes += ` Self-heal probed ${triedAlts.length} alternate URL(s) — ${altNotes}. Merged ${flatCourses.length} unique courses from ${results.length} source(s).`;
    } else if (primary.parse_notes) {
      parse_notes += ' ' + primary.parse_notes;
    }

    // Persist cache (best-effort) — ALWAYS, as long as we gathered anything.
    // This is the "actively cache + update memory so the user can start
    // searching" requirement: even a salvage-grade partial merge is stored so
    // Quick Add / Add Course dropdowns populate immediately.
    const record = {
      cache_key: key,
      university_name: university,
      faculty,
      degree_program: degree_program || specialization || '',
      track_type: trackType,
      calendar_source_url: sourceUrl,
      parsed_courses: flatCourses,
      curriculum,
      last_parsed_at: new Date().toISOString(),
      parse_status,
      parse_notes: `[${executionMode || 'FAILED'}] ${parse_notes}`.trim(),
    };
    let savedId = rec?.id;
    try {
      if (rec) savedId = (await base44.asServiceRole.entities.CourseCatalogCache.update(rec.id, record))?.id || rec.id;
      else savedId = (await base44.asServiceRole.entities.CourseCatalogCache.create(record))?.id;
    } catch {}

    return Response.json({
      status: 'success',
      executionMode: executionMode || 'GEMINI_FALLBACK',
      meta: { university, faculty, specialization: degree_program, trackType, sourceUrl, tokenUsage },
      program: { degreeTitle: degree_program || '', academicYears },
      // Legacy fields for existing clients:
      cached: false,
      cache_id: savedId,
      degreeTitle: degree_program || '',
      calendarSourceUrl: sourceUrl,
      trackType,
      academicYears,
      course_count: flatCourses.length,
      parse_status,
      parse_notes,
      last_parsed_at: record.last_parsed_at,
      sources: results.map((r) => ({ url: r.sourceUrl, parse_status: r.parse_status, course_count: r.courseCount || 0 })),
      sources_tried: [sourceUrl, ...triedAlts],
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      executionMode,
      meta: { university, faculty, specialization: degree_program, trackType, sourceUrl, tokenUsage },
      program: { degreeTitle: '', academicYears: [] },
      error: error.message,
      parse_status: 'failed',
      parse_notes: error.message,
    }, { status: 500 });
  }
}