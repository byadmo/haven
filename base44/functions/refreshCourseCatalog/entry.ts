import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as cheerio from 'npm:cheerio@1.0.0';

// ============================================================================
// 4-Stage Vendor-Aware Hybrid AST parser for undergraduate degree-track course
// requirements. Invoked by the Haven Education setup wizard pipeline
// (findCourseCalendar -> save URL -> parse_only) and the Settings "Confirm &
// Parse" button.
//
//   Stage 1 — Vendor API Fast-Path (Coursedog / Kuali public JSON)
//   Stage 2 — Heading-Bounded Subtree Extraction (HBSE) via cheerio
//   Stage 3 — Deterministic table/list AST parser (regex course codes)
//   Stage 4 — Gemini-3-Flash schema-constrained fallback
//
// Playwright is unavailable in the Base44 function runtime; direct fetch +
// cheerio suffices for the typical Canadian university server-rendered
// academic calendars, and vendor pages expose public JSON APIs that don't
// need a headless browser either.
// ============================================================================

const FETCH_TIMEOUT_MS = 9000;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const COVERAGE_THRESHOLD = 0.85; // Stage 3 emits JSON only at >= 85% coverage
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

// ---------------------------- Stage 1: Vendor --------------------------------
function detectVendor(url, html = '') {
  const u = (url || '').toLowerCase();
  if (u.includes('coursedog.com') || /coursedog\.com|next\.coursedog/i.test(html)) return 'coursedog';
  if (u.includes('kuali.co') || /kuali\.co/i.test(html)) return 'kuali';
  return null;
}

// Deep walk an object graph and return the first array that looks like a
// course list (entries carry a course-code-like identifier / title).
function findCoursesDeep(obj, maxDepth = 6, depth = 0) {
  if (!obj || depth > maxDepth) return null;
  if (Array.isArray(obj)) {
    if (obj.length && typeof obj[0] === 'object' &&
        (obj[0].code || obj[0].course_code || obj[0].courseCode || obj[0].subjectCode ||
         obj[0].title || obj[0].name || obj[0].courseTitle)) {
      return obj;
    }
    for (const v of obj) {
      const r = findCoursesDeep(v, maxDepth, depth + 1);
      if (r && r.length) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const r = findCoursesDeep(v, maxDepth, depth + 1);
      if (r && r.length) return r;
    }
  }
  return null;
}

function vendorNormalize(list) {
  const out = [];
  const seen = new Set();
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const code = (c.code || c.course_code || c.courseCode || c.subjectCode || '').toString().trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      title: (c.title || c.courseTitle || c.name || c.course_title || code).toString().trim(),
      credits: Number(c.credits || c.creditHours || c.credit_hours || 0) || 0,
    });
  }
  return out;
}

async function vendorCoursedog(pageUrl) {
  // 1) Next.js __NEXT_DATA__ embedded catalog JSON.
  const html = await fetchText(pageUrl);
  if (html) {
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (m) {
      try {
        const data = JSON.parse(m[1]);
        const list = findCoursesDeep(data);
        if (list && list.length) return vendorNormalize(list);
      } catch {}
    }
  }
  // 2) Documented public catalog endpoints.
  try {
    const u = new URL(pageUrl);
    const base = `${u.protocol}//${u.host}`;
    for (const path of ['/api/v1/catalogs', '/api/v1/courses']) {
      const j = await fetchText(base + path, { asJson: true, timeoutMs: 6000 });
      const list = findCoursesDeep(j);
      if (list && list.length) return vendorNormalize(list);
    }
  } catch {}
  return null;
}

async function vendorKuali(pageUrl) {
  try {
    const u = new URL(pageUrl);
    const base = `${u.protocol}//${u.host}`;
    const segs = u.pathname.split('/').filter(Boolean);
    let catalogId = '';
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].toLowerCase() === 'catalog' || segs[i].toLowerCase() === 'catalogs') {
        if (segs[i + 1]) catalogId = segs[i + 1];
        break;
      }
    }
    if (!catalogId) return null;
    const j = await fetchText(`${base}/api/cm/v1/catalogs/${catalogId}/courses`, { asJson: true, timeoutMs: 7000 });
    let list = findCoursesDeep(j);
    if (!list) {
      const j2 = await fetchText(`${base}/api/cm/v1/catalogs/${catalogId}`, { asJson: true, timeoutMs: 7000 });
      list = findCoursesDeep(j2);
    }
    if (list && list.length) return vendorNormalize(list);
  } catch {}
  return null;
}

// ---------------------------- Stage 2: HBSE ---------------------------------
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

// ---------------------------- Stage 3: Deterministic AST --------------------
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

// ---------------------------- Stage 4: Gemini -------------------------------
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

    // URL discovery (Stage 0): reuse the existing AI-discovery function so no
    // new Tavily/Serper secret is required.
    sourceUrl = url0 && /^https?:\/\//i.test(url0) ? url0 : '';
    if (!sourceUrl) {
      try {
        const disc = await base44.functions.invoke('findCourseCalendar', {
          university_name: university, faculty, degree_program, specialization, trackType,
        });
        const d = disc?.data ?? disc;
        sourceUrl = (d && (d.best_url || d.url)) || '';
      } catch { sourceUrl = ''; }
    }
    if (!sourceUrl) {
      return Response.json({
        status: 'error', error: 'No calendar URL provided and discovery found none.',
        meta: { university, faculty, specialization: degree_program, trackType, sourceUrl: '', tokenUsage: 0 },
        program: { degreeTitle: '', academicYears: [] },
        parse_status: 'failed', parse_notes: 'No calendar URL provided and discovery found none.',
      }, { status: 422 });
    }

    let parse_status = 'failed';
    let parse_notes = '';
    let academicYears = [];
    let degreeTitle = degree_program || '';

    // ------------------- Stage 1: Vendor API Fast-Path -------------------
    const vendor = detectVendor(sourceUrl);
    let vendorCourses = null;
    if (vendor === 'coursedog') vendorCourses = await vendorCoursedog(sourceUrl);
    else if (vendor === 'kuali') vendorCourses = await vendorKuali(sourceUrl);
    if (vendorCourses && vendorCourses.length) {
      executionMode = 'VENDOR_API';
      parse_status = 'success';
      parse_notes = `Vendor API (${vendor}): ${vendorCourses.length} courses.`;
      academicYears = [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: vendorCourses }] }];
    }

    // ------------------- Stage 2: HBSE -------------------
    let cleanedHtml = '';
    let isolatedText = '';
    let $$ = null;
    if (!executionMode) {
      const html = await fetchText(sourceUrl);
      if (!html || html.length < 200) {
        const codes = extractCodes(html || '');
        return Response.json({
          status: codes.length ? 'success' : 'error',
          executionMode: codes.length ? 'DETERMINISTIC_AST' : null,
          meta: { university, faculty, specialization: degree_program, trackType, sourceUrl, tokenUsage: 0 },
          program: { degreeTitle, academicYears: codes.length ? [{ yearNumber: 1, terms: [{ termName: 'Catalog', requiredCourses: codes.map((c) => ({ code: c, title: c, credits: 0 })) }] }] : [] },
          parse_status: codes.length ? 'partial' : 'failed',
          parse_notes: codes.length ? 'Regex salvage from raw HTML.' : 'Could not render the target calendar page.',
          course_count: codes.length,
          calendar_source_url: sourceUrl,
        }, { status: codes.length ? 200 : 422 });
      }
      cleanedHtml = html;
      const hb = hbse(html, trackType);
      $$ = hb.$; isolatedText = hb.isolatedText;

      // ------------------- Stage 3: Deterministic AST -------------------
      const ast = stageAstParse(hb.isolated, trackType);
      if (ast.totalCourses >= 5 && ast.coverage >= COVERAGE_THRESHOLD) {
        executionMode = 'DETERMINISTIC_AST';
        parse_status = 'success';
        parse_notes = `Deterministic AST: ${ast.totalCourses} courses, ${(ast.coverage * 100).toFixed(0)}% coverage.`;
        academicYears = ast.academicYears;
      } else {
        // ------------------- Stage 4: Gemini fallback -------------------
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