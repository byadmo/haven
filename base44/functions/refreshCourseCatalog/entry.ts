import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Normalize a (university, faculty, degree_program) combo into a stable lookup
// key. MUST match the client-side catalogCacheKey() in src/lib/courseAutofill.js.
function cacheKey(university_name, faculty, degree_program) {
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  return [norm(university_name), norm(faculty), norm(degree_program)].join("::");
}

// ============================================================================
// Fast pipeline helpers (Zero-LLM page fetch + clean + track isolation).
// We fetch + clean the program page OURSELVES so only a small (~2k-token)
// excerpt reaches the model — no add_context_from_internet web search needed.
// ============================================================================

function fetchHtml(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'text/html,*/*',
    },
  }).then(async (r) => (r.ok ? await r.text() : null)).catch(() => null).finally(() => clearTimeout(t));
}

function stripTags(s) { return s.replace(/<[^>]+>/g, ' '); }

// Remove whole blocks of junk tags (script/style/nav/footer/header/aside/...).
function stripBlocks(html, tags) {
  const re = new RegExp(`<(${tags})\\b[^>]*>[\\s\\S]*?</\\1\\s*>`, 'gi');
  let out = html.replace(re, ' ');
  out = out.replace(new RegExp(`<(${tags})\\b[^>]*\\/?>`, 'gi'), ' ');
  return out;
}

// Convert HTML to clean plain text, preserving structure that matters for the
// curriculum: headings → '# ' lines, table rows → pipe-delimited rows (degree
// calendars put year/term/course lists in tables), lists → '-' bullets.
function cleanHtmlToText(html) {
  let h = html;
  h = stripBlocks(h, 'script|style|nav|footer|header|aside|noscript|svg|form|iframe');
  h = h.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (_, n, inner) => `\n${'#'.repeat(+n)} ${stripTags(inner).trim()}\n`);
  h = h.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi, (_, inner) => {
    const cells = [...inner.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map((m) => stripTags(m[1]).trim());
    return cells.join(' | ') + '\n';
  });
  h = h.replace(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi, (_, inner) => `- ${stripTags(inner).trim()}\n`);
  h = h.replace(/<\/p\s*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/div\s*>/gi, '\n');
  h = stripTags(h);
  h = h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z#0-9]+;/g, ' ');
  return h.replace(/[ \t\f]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Select the excerpt most likely to contain the degree curriculum. Program
// pages lead with an admission/accreditation intro, so isolating by the track
// heading alone grabs that intro. Instead we anchor on the course-code-dense
// region (covers the full Year 1..4 plan) and include a little context before
// the first code so Y1/Semester headings are retained. Falls back to the
// track-heading slice when no course codes are present, then to whole text.
function selectCurriculumPayload(text, trackType) {
  if (!text) return '';
  const codeRe = /\b([A-Z]{2,4})\s?(\d{3,4}[A-Z]?)\b/g;
  let m, first = -1, last = -1;
  while ((m = codeRe.exec(text))) {
    if (m[1].length <= 1) continue;
    first = first < 0 ? m.index : first;
    last = m.index;
  }
  if (first >= 0) {
    // Compact: keep only lines that carry a course code or a year/semester/track
    // heading. This concentrates the curriculum into ~2k tokens (fast LLM) while
    // dropping admission/accreditation narrative, instead of sending a wide
    // first..last window.
    const headRe = /\b(year\s*\d|semester|term|full[\s-]?time|part[\s-]?time|co[\s-]?op|program (format|map|outline|requirements))\b/i;
    const filtered = text.split('\n').filter((l) => {
      const t = l.trim();
      return t && (/\b[A-Z]{2,4}\s?\d{3,4}[A-Z]?\b/.test(t) || headRe.test(t));
    }).join('\n');
    if (filtered.length > 200) return filtered;
    // Filtering removed everything (rare) — fall back to the code window.
    const start = Math.max(0, first - 800);
    const end = Math.min(text.length, last + 300);
    return text.slice(start, end);
  }
  // No course codes — fall back to track-heading isolation.
  const hasFullTime = /full[\s-]?time/i.test(trackType || '');
  const head = hasFullTime
    ? /full[\s-]?time[,\s]+(?:four|4)[\s-]?year/i
    : /(?:four|4|five|3)[\s-]?year/i;
  const idx = text.search(head);
  if (idx < 0) return text;
  let rest = text.slice(idx);
  const next = rest.slice(1).search(/\n[ \t]*(part[\s-]?time|full[\s-]?time[,\s]+(?:five|3|two|2)[\s-]?year|co[\s-]?op[\s-]?stream|back to top|program overview|program outline|important dates|policies)/i);
  if (next >= 0) rest = rest.slice(0, next + 1);
  return rest.trim();
}

// Regex fallback: pull every course code (e.g. ECE 105, MTH 140, CPS 125) from
// the text. Used if the LLM extraction returns nothing.
function extractCourseCodesRegex(text) {
  const set = new Set();
  const re = /\b([A-Z]{2,4})\s?(\d{3,4}[A-Z]?)\b/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1].length === 1) continue; // avoid false positives like "I 100"
    set.add(`${m[1]} ${m[2]}`);
    if (set.size > 250) break;
  }
  return [...set];
}

// ============================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    let university_name = body.university_name;
    let faculty = body.faculty;
    let degree_program = body.degree_program;
    let specialization = body.specialization;
    let university_domain = body.university_domain;
    let university_course_catalog_url = body.university_course_catalog_url;
    let trackType = body.trackType || body.track_type || '';
    const force = !!body.force || !!body.parse_only;
    const parse_only = !!body.parse_only;

    // Fallback: pull from the caller's EduSettings if params weren't supplied.
    if (!university_name || faculty === undefined || degree_program === undefined) {
      const settings = await base44.entities.EduSettings.list();
      const s = Array.isArray(settings) ? settings[0] : null;
      if (s) {
        university_name = university_name || s.university_name;
        faculty = faculty === undefined ? s.faculty : faculty;
        degree_program = degree_program === undefined ? s.degree_program : degree_program;
        specialization = specialization === undefined ? s.specialization : specialization;
        university_domain = university_domain || s.university_domain;
        university_course_catalog_url = university_course_catalog_url || s.university_course_catalog_url;
      }
    }

    if (!university_name) return Response.json({ error: 'university_name is required' }, { status: 400 });
    if (!trackType) trackType = 'Full-Time, Four-Year Program';
    const key = cacheKey(university_name, faculty, degree_program);

    // Find the shared cache record for this combo (service role bypasses RLS).
    let rec = null;
    try {
      const existing = await base44.asServiceRole.entities.CourseCatalogCache.filter({ cache_key: key });
      rec = Array.isArray(existing) && existing.length ? existing[0] : null;
    } catch (e) {
      rec = null;
    }

    const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const freshHit = (r) => r && r.last_parsed_at && (r.parse_status === 'success' || r.parse_status === 'partial') &&
      (now - +new Date(r.last_parsed_at) < FRESH_MS);
    if (!force && (freshHit(rec))) {
      try {
        const age = now - new Date(rec.last_parsed_at).getTime();
        if (age < FRESH_MS) {
          return Response.json({
            cached: true,
            cache_id: rec.id,
            parse_status: rec.parse_status,
            course_count: (rec.parsed_courses || []).length,
            last_parsed_at: rec.last_parsed_at,
            calendar_source_url: rec.calendar_source_url,
          });
        }
      } catch (e) { /* fall through to re-parse */ }
    }

    // ---- Fast pipeline: fetch + clean + track-isolate + small-LLM extract ----
    const sourceUrl = (university_course_catalog_url && /^https?:\/\//i.test(university_course_catalog_url)) ? university_course_catalog_url : '';
    const MAX_CHARS = 12000; // ~3k tokens — the line-filtered payload concentrates the curriculum.

    let parse_status = 'success';
    let parse_notes = '';
    let calendar_source_url = sourceUrl;
    let parsed_courses = [];
    let curriculum = [];

    let usedFastPipeline = false;
    if (sourceUrl) {
      const rawHtml = await fetchHtml(sourceUrl, 8000);
      if (rawHtml) {
        const cleaned = cleanHtmlToText(rawHtml);
        const isolated = selectCurriculumPayload(cleaned, trackType);
        const payload = (isolated || cleaned).slice(0, MAX_CHARS);

        if (payload && payload.length > 200) {
          usedFastPipeline = true;
          const prompt = [
            `You are parsing an undergraduate academic-calendar excerpt for ${university_name} (${faculty || 'faculty'} — ${degree_program || 'program'}).`,
            `Source URL: ${sourceUrl}`,
            `Extract the DEGREE REQUIREMENTS for the "${trackType}" track as a curriculum: course codes mapped by year and term.`,
            "Return JSON with: source_url, trackType (the label you matched, or ''), confidence ('high'|'medium'|'low'), notes (short), and curriculum (array of { year, terms: [ { term, courses: [ { code, title } ] } ] }).",
            "Use 'Year 1', 'Semester 1'/'Fall', etc. exactly as on the page. Only include courses actually present in the excerpt. Omit transition/remedial lists and excluded courses.",
            "If the excerpt isn't a course listing, confidence='low' and empty curriculum.",
            "EXCERPT:",
            payload,
          ].join("\n");

          try {
            const res = await base44.integrations.Core.InvokeLLM({
              prompt,
              model: "gemini_3_flash", // fast text->JSON; no web search
              response_json_schema: {
                type: "object",
                properties: {
                  source_url: { type: "string" },
                  trackType: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string" },
                  curriculum: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        year: { type: "string" },
                        terms: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              term: { type: "string" },
                              courses: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: { code: { type: "string" }, title: { type: "string" } },
                                  required: ["code"],
                                },
                              },
                            },
                            required: ["term"],
                          },
                        },
                      },
                      required: ["year"],
                    },
                  },
                },
                required: ["curriculum"],
              },
            });

            const d = res?.data ?? res;
            calendar_source_url = (d?.source_url && /^https?:\/\//i.test(d.source_url)) ? String(d.source_url) : sourceUrl;
            if (d?.trackType) trackType = String(d.trackType);
            parse_notes = d?.notes || '';
            curriculum = Array.isArray(d?.curriculum) ? d.curriculum
              .filter((y) => y && y.year)
              .map((y) => ({
                year: String(y.year).trim(),
                terms: Array.isArray(y.terms) ? y.terms.map((t) => ({
                  term: String(t.term || '').trim(),
                  courses: Array.isArray(t.courses) ? t.courses.map((c) => ({
                    code: String(c.code || '').trim(),
                    title: String(c.title || c.code || '').trim(),
                  })).filter((c) => c.code) : [],
                })) : [],
              })) : [];

            // Derive the flat course list (for autocomplete) from the curriculum.
            parsed_courses = [];
            const seenCode = new Set();
            for (const y of curriculum) for (const t of (y.terms || [])) for (const c of (t.courses || [])) {
              if (c.code && !seenCode.has(c.code)) {
                seenCode.add(c.code);
                parsed_courses.push({ course_code: c.code, course_title: c.title || c.code, course_description: "", credits: 0, prerequisites: "", department: "", difficulty_hints: "" });
              }
            }

            const conf = String(d?.confidence || "low").toLowerCase();
            parse_status = parsed_courses.length === 0 ? "failed" : conf === "low" ? "partial" : "success";
          } catch (e) {
            parse_status = "failed";
            parse_notes = "Fast LLM extraction failed: " + (e?.message || "unknown error");
          }

          // Regex fallback: if the LLM returned nothing, salvage course codes from the cleaned text.
          if (parsed_courses.length === 0) {
            const codes = extractCourseCodesRegex(cleaned);
            if (codes.length) {
              parsed_courses = codes.map((code) => ({ course_code: code, course_title: code, course_description: "", credits: 0, prerequisites: "", department: "", difficulty_hints: "" }));
              parse_status = "partial";
              parse_notes = (parse_notes ? parse_notes + " " : "") + "Salvaged via regex course-code fallback.";
            }
          }
        }
      }
    }

    // ---- Fallback: AI web search (no confirmed URL or fetch failed) ----
    if (!usedFastPipeline) {
      const programStr = degree_program
        ? `${degree_program}${faculty ? ` in the ${faculty}` : ''}`
        : (faculty ? `in the ${faculty}` : '');
      const catalogHint = university_course_catalog_url
        ? ` The university's catalog URL is ${university_course_catalog_url}.`
        : (university_domain ? ` The university domain is ${university_domain}.` : '');
      const prompt = [
        "You are an expert on Canadian university undergraduate academic calendars / course catalogs.",
        `For ${university_name}, find the official undergraduate academic calendar / course listing page${programStr ? ` for the ${programStr}` : ''}.${catalogHint}`,
        `Search the web — e.g. "${university_name} undergraduate calendar${degree_program ? ` ${degree_program}` : ''} courses" — and parse the calendar page.`,
        "List ALL the courses offered under that faculty and degree program. For each course extract course_code, course_title, course_description (1-3 sentences), credits (number), prerequisites, department, difficulty_hints.",
        "Return a JSON object with: source_url, confidence ('high'|'medium'|'low'), notes, and courses (array — every real course you can find, up to 150).",
        "Only include REAL courses from this university's official catalog. If you cannot find it, set confidence to 'low' and explain in notes.",
      ].join(" ");
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          model: "gemini_3_flash",
          response_json_schema: {
            type: "object",
            properties: {
              source_url: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              notes: { type: "string" },
              courses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    course_code: { type: "string" },
                    course_title: { type: "string" },
                    course_description: { type: "string" },
                    credits: { type: "number" },
                    prerequisites: { type: "string" },
                    department: { type: "string" },
                    difficulty_hints: { type: "string" },
                  },
                  required: ["course_code", "course_title"],
                },
              },
            },
            required: ["courses"],
          },
        });
        const d = res?.data ?? res;
        const raw = Array.isArray(d?.courses) ? d.courses : [];
        parsed_courses = raw
          .filter((c) => c && c.course_code)
          .map((c) => ({
            course_code: String(c.course_code).trim(),
            course_title: String(c.course_title || c.course_code).trim(),
            course_description: c.course_description || "",
            credits: typeof c.credits === "number" ? c.credits : 0,
            prerequisites: c.prerequisites || "",
            department: c.department || "",
            difficulty_hints: c.difficulty_hints || "",
          }));
        calendar_source_url = d?.source_url || calendar_source_url;
        parse_notes = d?.notes || "";
        const conf = String(d?.confidence || "low").toLowerCase();
        parse_status = parsed_courses.length === 0 ? "failed" : conf === "low" ? "partial" : "success";
        if (parsed_courses.length === 0) parse_notes = parse_notes || "No courses could be extracted from the catalog.";
      } catch (e) {
        parse_status = "failed";
        parse_notes = "AI catalog parse failed: " + (e?.message || "unknown error");
      }
    }

    const record = {
      cache_key: key,
      university_name,
      faculty: faculty || "",
      degree_program: degree_program || "",
      track_type: trackType,
      calendar_source_url,
      parsed_courses,
      curriculum,
      last_parsed_at: new Date().toISOString(),
      parse_status,
      parse_notes: usedFastPipeline ? `[fast-pipeline] ${parse_notes || ''}`.trim() : parse_notes,
    };

    let saved;
    try {
      if (rec) {
        saved = await base44.asServiceRole.entities.CourseCatalogCache.update(rec.id, record);
      } else {
        saved = await base44.asServiceRole.entities.CourseCatalogCache.create(record);
      }
    } catch (e) {
      return Response.json({
        error: "Failed to persist catalog cache: " + (e?.message || "unknown"),
        parse_status,
        course_count: parsed_courses.length,
      }, { status: 500 });
    }

    return Response.json({
      cached: false,
      cache_id: saved?.id,
      parse_status,
      course_count: parsed_courses.length,
      curriculum_count: curriculum.length,
      trackType,
      calendar_source_url,
      last_parsed_at: record.last_parsed_at,
      parse_notes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}