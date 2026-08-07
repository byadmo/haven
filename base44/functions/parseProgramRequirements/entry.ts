import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as cheerio from 'npm:cheerio@1.0.0';
import { secrets } from 'base44:runtime';

// Fast, token-efficient undergraduate program-requirements parser.
// Pipeline: zero-LLM crawler discovery -> fetch + cheerio DOM clean ->
// track isolation (<=1,500 tokens) -> gemini-3-flash structured extraction
// -> regex course-code fallback. Writes a CourseCatalogCache record for the app.

const TOKEN_BUDGET_TOKENS = 1500;
const CHARS_PER_TOKEN = 4; // conservative for mixed English/HTML
const MAX_CHARS = TOKEN_BUDGET_TOKENS * CHARS_PER_TOKEN; // ~6,000 chars
const FETCH_TIMEOUT_MS = 8000;
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

const COURSE_CODE_RE = /\b([A-Z]{2,4})\s?(\d{3,4})([A-Z]?)\b/g;
const NOISE_SELECTORS = 'nav, footer, header, script, style, aside, svg, noscript, iframe, .sidebar, .breadcrumbs, .skip-link, .search, #skip-to-content, [role="navigation"], [role="banner"], [role="contentinfo"]';

function normKey(parts) {
  return parts.map((p) => (p || '').toString().trim().toLowerCase()).filter(Boolean).join('::');
}

async function fetchHtml(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; EduSyncCatalogBot/1.0)', accept: 'text/html,*/*' },
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return '';
    return await res.text();
  } catch { return ''; }
  finally { clearTimeout(t); }
}

// cheerio-based DOM cleaning: strip noise, emit a flat text stream that
// preserves heading/table/list structure as lines so the model can pin
// years/terms/courses accurately.
function cleanDomToText(html) {
  const $ = cheerio.load(html);
  $(NOISE_SELECTORS).remove();
  const lines = [];
  // Emit table rows as one joined line so a course code and its title stay paired;
  // detach those cells so the separate-cell loop below doesn't double-emit them.
  $('tr').each((_, el) => {
    const $el = $(el);
    const cells = [];
    $el.children('td, th').each((__, c) => {
      const t = $(c).text().replace(/\s+/g, ' ').trim();
      if (t) cells.push(t);
    });
    if (cells.length) {
      lines.push(cells.join(' — '));
      $el.children('td, th').remove();
    }
  });
  const blockSel = 'h1, h2, h3, h4, h5, li, p, dt, dd';
  $(blockSel).each((_, el) => {
    const $el = $(el);
    const tag = el.tagName.toLowerCase();
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (tag.startsWith('h')) lines.push('\n## ' + text); // heading marker
    else lines.push(text);
  });
  if (lines.length === 0) {
    const body = $('body').text().replace(/\s+/g, ' ').trim();
    if (body) return body;
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

// Track isolation: locate the trackType phrase in the cleaned text and
// window the surrounding context to the token budget. Keeps the prompt
// input under ~1,500 tokens while preserving the relevant curriculum.
function isolateTrack(text, trackType) {
  if (!text) return '';
  const compact = text.replace(/\n{2,}/g, '\n');
  if (compact.length <= MAX_CHARS) return compact;
  const needle = (trackType || '').trim().toLowerCase();
  if (!needle) return compact.slice(0, MAX_CHARS);
  // Try to anchor on the track heading, else Fall/Winter/Semester markers.
  const anchors = [needle, 'full-time', 'four-year', 'academic plan', 'program requirements', 'semester 1', 'year 1'];
  let idx = -1;
  for (const a of anchors) {
    idx = compact.toLowerCase().indexOf(a);
    if (idx >= 0) break;
  }
  if (idx < 0) return compact.slice(0, MAX_CHARS);
  // Curriculum usually follows the track heading — lead a small amount, take the
  // budget forward so we don't bleed into unrelated elective/option tables behind us.
  let start = Math.max(0, idx - 300);
  let end = Math.min(compact.length, start + MAX_CHARS);
  start = Math.max(0, end - MAX_CHARS);
  return compact.slice(start, end);
}

function extractCourseCodesRegex(text) {
  const out = [];
  const seen = new Set();
  let m;
  COURSE_CODE_RE.lastIndex = 0;
  while ((m = COURSE_CODE_RE.exec(text)) !== null) {
    const code = (m[1] + m[2] + (m[3] || '')).toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const university = (body.university || body.university_name || '').toString().trim();
    const faculty = (body.faculty || '').toString().trim();
    const specialization = (body.specialization || body.degree_program || '').toString().trim();
    const trackType = (body.trackType || body.track_type || '').toString().trim() || 'Full-Time, Four-Year Program';
    const calendarUrl = (body.calendarUrl || body.university_course_catalog_url || '').toString().trim();
    const force = !!body.force;

    if (!university) return Response.json({ error: 'university is required' }, { status: 400 });

    // Cache check (fresh hit short-circuits unless forced).
    const key = normKey([university, faculty, specialization]);
    let rec = null;
    try {
      const hits = await base44.asServiceRole.entities.CourseCatalogCache.filter({ cache_key: key }, '-last_parsed_at', 1);
      rec = Array.isArray(hits) && hits.length ? hits[0] : null;
    } catch { /* ignore */ }
    const now = Date.now();
    if (!force && rec && rec.last_parsed_at && (rec.parse_status === 'success' || rec.parse_status === 'partial') &&
        (now - +new Date(rec.last_parsed_at) < FRESH_MS)) {
      return Response.json({
        cached: true, cache_id: rec.id, degreeTitle: '',
        calendarSourceUrl: rec.calendar_source_url, trackType: rec.track_type,
        academicYears: rec.curriculum || [], course_count: (rec.parsed_courses || []).length,
        parse_status: rec.parse_status, parse_notes: rec.parse_notes || '',
        last_parsed_at: rec.last_parsed_at,
      });
    }

    // ---- Step 1: URL discovery (zero LLM) ----
    let sourceUrl = calendarUrl;
    if (!sourceUrl) {
      try {
        const disc = await base44.functions.invoke('findCourseCalendar', {
          university_name: university, faculty, degree_program: specialization, trackType,
        });
        sourceUrl = (disc && disc.data && (disc.data.best_url || disc.data.url)) || '';
      } catch { sourceUrl = ''; }
    }
    if (!sourceUrl) {
      return Response.json({
        degreeTitle: '', calendarSourceUrl: '', trackType,
        academicYears: [], course_codes: [],
        parse_status: 'failed', parse_notes: 'No calendar URL provided and discovery found none.',
      });
    }

    // ---- Steps 2 & 3: scrape + cheerio clean + track isolation ----
    const rawHtml = await fetchHtml(sourceUrl);
    const cleaned = cleanDomToText(rawHtml);
    const isolated = isolateTrack(cleaned, trackType);

    if (!isolated || isolated.length < 80) {
      // Regex salvage straight from the cleaned HTML.
      const codes = extractCourseCodesRegex(cleaned);
      return Response.json({
        degreeTitle: '', calendarSourceUrl: sourceUrl, trackType,
        academicYears: [], course_codes: codes,
        parse_status: codes.length ? 'partial' : 'failed',
        parse_notes: codes.length
          ? 'Page yielded no usable curriculum text; salvaged course codes via regex.'
          : 'Could not render/clean the target calendar page.',
      });
    }

    // ---- Step 4: gemini-3-flash structured extraction ----
    const prompt = [
      `You are parsing an undergraduate academic-calendar excerpt for ${university} (${faculty}${specialization ? ' — ' + specialization : ''}).`,
      `Source URL: ${sourceUrl}`,
      `Extract the exact course structure for the "${trackType}" track.`,
      'Return JSON with: degreeTitle, trackType (the label matched, or ""), confidence (high|medium|low), notes, academicYears (array of { yearNumber (int), terms: [ { termName, requiredCourses: [ { code, title, credits (number, 0 if unknown) } ] } ] }).',
      "Only include courses actually present in the excerpt. Use term names exactly as on the page ('Fall', 'Semester 1', etc.). Omit transition/remedial and excluded-course lists.",
      "EXCERPT:\n" + isolated,
    ].join('\n');

    let parsed = null;
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash', // managed gateway — no API key needed
        response_json_schema: {
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
          required: ['degreeTitle', 'academicYears'],
        },
      });
      parsed = res?.data ?? res;
    } catch (e) {
      // Fall through to regex fallback below.
      parsed = null;
    }

    let academicYears = [];
    let degreeTitle = '';
    let matchedTrack = trackType;
    let parseNotes = '';
    let confidence = 'low';
    if (parsed) {
      degreeTitle = String(parsed.degreeTitle || '').trim();
      if (parsed.trackType) matchedTrack = String(parsed.trackType).trim();
      if (parsed.notes) parseNotes = String(parsed.notes).trim();
      if (parsed.confidence) confidence = String(parsed.confidence).toLowerCase();
      academicYears = Array.isArray(parsed.academicYears) ? parsed.academicYears
        .filter((y) => y && (y.yearNumber != null))
        .map((y) => ({
          yearNumber: Number(y.yearNumber) || 0,
          terms: Array.isArray(y.terms) ? y.terms.map((t) => ({
            termName: String(t.termName || '').trim(),
            requiredCourses: Array.isArray(t.requiredCourses) ? t.requiredCourses.map((c) => ({
              code: String(c.code || '').trim(),
              title: String(c.title || c.code || '').trim(),
              credits: typeof c.credits === 'number' ? c.credits : 0,
            })).filter((c) => c.code) : [],
          })) : [],
        })) : [];
    }

    let parseStatus = 'success';
    let courseCount = 0;
    for (const y of academicYears) for (const t of (y.terms || [])) courseCount += (t.requiredCourses || []).length;

    if (!academicYears.length || courseCount === 0) {
      // Regex fallback: salvage raw course codes from the cleaned text.
      const codes = isolateTrack ? extractCourseCodesRegex(cleaned) : [];
      parseStatus = codes.length ? 'partial' : 'failed';
      parseNotes = (parseNotes ? parseNotes + ' ' : '') + (codes.length
        ? `Regex course-code fallback recovered ${codes.length} codes.`
        : 'No curriculum structure extracted and no course codes recovered.');
      if (codes.length) {
        // Expose salvaged codes without fabricating a fake curriculum.
        return Response.json({
          degreeTitle, calendarSourceUrl: sourceUrl, trackType: matchedTrack,
          academicYears: [], course_codes: codes, parse_status: parseStatus, parse_notes: parseNotes,
        });
      }
    } else {
      parseStatus = confidence === 'low' ? 'partial' : 'success';
    }

    // Flatten for the CourseCatalogCache parsed_courses field + build curriculum shape.
    const flatCourses = [];
    const seenCode = new Set();
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

    const record = {
      cache_key: key,
      university_name: university,
      faculty,
      degree_program: specialization,
      track_type: matchedTrack,
      calendar_source_url: sourceUrl,
      parsed_courses: flatCourses,
      curriculum,
      last_parsed_at: new Date().toISOString(),
      parse_status: parseStatus,
      parse_notes: '[parseProgramRequirements] ' + parseNotes,
    };
    let savedId = rec?.id;
    try {
      if (rec) {
        const updated = await base44.asServiceRole.entities.CourseCatalogCache.update(rec.id, record);
        savedId = updated?.id || rec.id;
      } else {
        const created = await base44.asServiceRole.entities.CourseCatalogCache.create(record);
        savedId = created?.id;
      }
    } catch { /* cache write is best-effort */ }

    return Response.json({
      cached: false,
      cache_id: savedId,
      degreeTitle,
      calendarSourceUrl: sourceUrl,
      trackType: matchedTrack,
      academicYears,
      course_count: courseCount,
      parse_status: parseStatus,
      parse_notes: parseNotes,
      last_parsed_at: record.last_parsed_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}