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
// ============================================================================

const FETCH_TIMEOUT_MS = 9000;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const COVERAGE_THRESHOLD = 0.85; // Stage 4 emits JSON only at >= 85% coverage
const TIER_A_CODE_FLOOR = 4;     // Stage 2: accept static HTML if >= 4 distinct course codes
const MAX_GEMINI_CHARS = 9000;
const CODE_RE = /\b([A-Z]{2,4})\s?(\d{3,4})([A-Z]?)\b/g;
const YEAR_RE = /\b(?:year|annee|année)\s*([1-5])\b/i;
const TERM_RE = /\b(fall|winter|spring|summer|autumn|semester\s*[1-8]|semestre\s*[1-8]|term\s*[1-8])\b/i;
const NOISE_SEL = 'script, style, nav, footer, header, aside, noscript, svg, iframe, form, [role="navigation"], [role="banner"], [role="contentinfo"]';

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

async function precisionSearch(university, faculty, specialization, trackType, invokeLLM) {
  const query = `"${university}" "${specialization || ''}" "${faculty || ''}" ("undergraduate calendar" OR "academic calendar" OR "program requirements") -inurl:news -inurl:admissions -inurl:events`;
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
  years[year][term].push({ code, title: title || code, credits: Number(credits) || 0 });
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
    "Only include courses actually present in the excerpt. Use term names exactly as on the page (Fall, Winter, Semester 1, ...). Omit transition/remedial lists and excluded-course lists.",
    "If the excerpt isn't a course listing, confidence='low' and empty academicYears.",
    "EXCERPT:\n" + (text || '').slice(0, MAX_GEMINI_CHARS),
  ].join('\n');
}

// ============================================================================
export default async function (req) {
  let executionMode = null;
  let tokenUsage = 0;
  let sourceUrl = '';
  let university = '', faculty = '', specialization = '', degree_program = '', trackType = '';
  let parse_notes_stage1 = '';
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
      return Response.json({
        status: 'success', executionMode: m ? m[1] : 'GEMINI_FALLBACK',
        meta: { university, faculty, specialization: degree_program, trackType, sourceUrl: rec.calendar_source_url, tokenUsage: 0 },
        program: { degreeTitle: '', academicYears: rec.curriculum || [] },
        cached: true, cache_id: rec.id, parse_status: rec.parse_status,
        course_count: (rec.parsed_courses || []).length, last_parsed_at: rec.last_parsed_at,
        calendar_source_url: rec.calendar_source_url,
      });
    }

    // ------------------- Stage 1: Precision Search + URL Weight Scoring -----
    // The caller MAY supply an explicit calendar URL (parse_only / setup-wizard
    // save-then-parse flow). Otherwise run a gemini-3-flash web-search query
    // and apply the zero-LLM +50/-100 path-quality rubric to its candidates.
    if (url0 && /^https?:\/\//i.test(url0)) {
      sourceUrl = url0;
    } else {
      const candidates = await precisionSearch(university, faculty, degree_program || specialization, trackType,
        (p) => base44.integrations.Core.InvokeLLM(p));
      tokenUsage += 1;
      const pick = pickBestUrl(candidates, specialization || degree_program);
      sourceUrl = pick.url;
      if (candidates.length) {
        parse_notes_stage1 = `Stage 1: ${candidates.length} candidate URLs from Gemini web-search; picked score=${pick.score}.`;
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

    let parse_status = 'failed';
    let parse_notes = parse_notes_stage1 || '';
    let academicYears = [];
    let degreeTitle = degree_program || '';

    // -------- Stage 2: Dual-Tier Scrape (Tier A regex gate) + Stage 3: HBSE --
    let cleanedHtml = '';
    let isolatedText = '';
    let $$ = null;
    if (!executionMode) {
      const html = await fetchText(sourceUrl);
      // Stage 2 Tier A: accept static HTML if it carries >= 4 distinct course
      // codes; otherwise (empty SPA shell) we cannot Tier-B render (Playwright
      // unavailable in the runtime) and fall straight through to Stage 5.
      const tierACodes = extractCodes(html || '');
      if (!html || html.length < 200) {
        const codes = extractCodes(html || '');
        return Response.json({
          status: codes.length ? 'success' : 'error',
          executionMode: codes.length ? 'DETERMINISTIC_AST' : null,
          meta: { university, faculty, specialization: degree_program, trackType, sourceUrl, tokenUsage },
          program: { degreeTitle, academicYears: codes.length ? [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: codes.map((c) => ({ code: c, title: c, credits: 0 })) }] }] : [] },
          parse_status: codes.length ? 'partial' : 'failed',
          parse_notes: (parse_notes ? parse_notes + ' ' : '') + (codes.length ? 'Regex salvage from raw HTML.' : 'Could not render the target calendar page.'),
          course_count: codes.length,
          calendar_source_url: sourceUrl,
        }, { status: codes.length ? 200 : 422 });
      }
      cleanedHtml = html;
      const hb = hbse(html, trackType);
      $$ = hb.$; isolatedText = hb.isolatedText;
      if (tierACodes.length < TIER_A_CODE_FLOOR) {
        parse_notes = (parse_notes ? parse_notes + ' ' : '') +
          `Stage 2 Tier A: only ${tierACodes.length} course codes in static HTML (< ${TIER_A_CODE_FLOOR}); Playwright Tier B unavailable in runtime.`;
      }

      // ------------------- Stage 4: Deterministic Grammar Parser -----------
      const ast = stageAstParse(hb.isolated, trackType);
      if (ast.totalCourses >= 5 && ast.coverage >= COVERAGE_THRESHOLD) {
        executionMode = 'DETERMINISTIC_AST';
        parse_status = 'success';
        parse_notes = `Deterministic AST: ${ast.totalCourses} courses, ${(ast.coverage * 100).toFixed(0)}% coverage.`;
        academicYears = ast.academicYears;
      } else {
        // ------------------- Stage 5: Gemini 3 Flash schema fallback ---------
        try {
          const gres = await base44.integrations.Core.InvokeLLM({
            prompt: buildGeminiPrompt(university, faculty, degree_program, trackType, sourceUrl, isolatedText),
            model: 'gemini_3_flash',
            response_json_schema: PROGRAM_SCHEMA,
          });
          tokenUsage += 1;
          const d = gres?.data ?? gres;
          if (d && Array.isArray(d.academicYears)) {
            executionMode = 'GEMINI_FALLBACK';
            academicYears = d.academicYears
              .filter((y) => y && y.yearNumber != null)
              .map((y) => ({
                yearNumber: Number(y.yearNumber) || 0,
                terms: (y.terms || []).map((t) => ({
                  termName: String(t.termName || '').trim(),
                  requiredCourses: (t.requiredCourses || []).map((c) => ({
                    code: String(c.code || '').trim(),
                    title: String(c.title || c.code || '').trim(),
                    credits: typeof c.credits === 'number' ? c.credits : 0,
                  })).filter((c) => c.code),
                })),
              }));
            degreeTitle = String(d.degreeTitle || degree_program || '');
            const conf = String(d.confidence || 'low').toLowerCase();
            parse_status = academicYears.length === 0 ? 'failed' : conf === 'low' ? 'partial' : 'success';
            parse_notes = (d.notes || 'Gemini-3-flash extraction.') +
              ` AST coverage was ${(ast.coverage * 100).toFixed(0)}% (< ${COVERAGE_THRESHOLD * 100}%).`;
          }
        } catch (e) {
          parse_notes = 'Gemini fallback failed: ' + (e?.message || 'unknown');
        }
        // Last-resort regex salvage from the isolated text or the cleaned HTML.
        if (academicYears.length === 0) {
          const codes = extractCodes(isolatedText || cleanedHtml);
          if (codes.length) {
            executionMode = executionMode || 'DETERMINISTIC_AST';
            parse_status = 'partial';
            parse_notes = (parse_notes ? parse_notes + ' ' : '') + `Regex salvage: ${codes.length} course codes.`;
            academicYears = [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: codes.map((c) => ({ code: c, title: c, credits: 0 })) }] }];
          }
        }
      }
    }

    // Flatten for cache + legacy curriculum shape.
    const seenCode = new Set();
    const flatCourses = [];
    const curriculum = academicYears.map((y) => ({
      year: 'Year ' + y.yearNumber,
      terms: y.terms.map((t) => ({
        term: t.termName,
        courses: t.requiredCourses.map((c) => {
          if (c.code && !seenCode.has(c.code)) {
            seenCode.add(c.code);
            flatCourses.push({ course_code: c.code, course_title: c.title, course_description: '', credits: c.credits, prerequisites: '', department: '', difficulty_hints: '' });
          }
          return { code: c.code, title: c.title };
        }),
      })),
    }));

    // Persist cache (best-effort).
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
      program: { degreeTitle, academicYears },
      // Legacy fields for existing clients:
      cached: false,
      cache_id: savedId,
      degreeTitle,
      calendarSourceUrl: sourceUrl,
      trackType,
      academicYears,
      course_count: flatCourses.length,
      parse_status,
      parse_notes,
      last_parsed_at: record.last_parsed_at,
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