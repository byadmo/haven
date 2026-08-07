import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Normalize a (university, faculty, degree_program) combo into a stable lookup
// key. MUST match the client-side catalogCacheKey() in src/lib/courseAutofill.js
// so cache reads hit the record this function writes.
function cacheKey(university_name, faculty, degree_program) {
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  return [norm(university_name), norm(faculty), norm(degree_program)].join("::");
}

// Pre-fetch + cache a university's course catalog for a specific faculty +
// degree program. Idempotent: if a fresh (<7 days) CourseCatalogCache record
// exists for the combo, it's returned without re-parsing. Otherwise an AI +
// web-search parse runs and the shared cache record is created/updated.
//
// Callable on-demand from profile setup / Settings (user-scoped) and
// repeatedly by a scheduled weekly refresh — it keys purely on the three
// params, not on any specific user session. Cache writes use the service role
// so the record is shared across all students in the same program (catalog
// data is public), satisfying "don't re-parse a combo that's already cached
// and fresh."
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({})) || {};
    let university_name = body.university_name;
    let faculty = body.faculty;
    let degree_program = body.degree_program;
    let university_domain = body.university_domain;
    let university_course_catalog_url = body.university_course_catalog_url;

    // Fallback: pull from the caller's EduSettings if params weren't supplied.
    if (!university_name || faculty === undefined || degree_program === undefined) {
      const settings = await base44.entities.EduSettings.list();
      const s = Array.isArray(settings) ? settings[0] : null;
      if (s) {
        university_name = university_name || s.university_name;
        faculty = faculty === undefined ? s.faculty : faculty;
        degree_program = degree_program === undefined ? s.degree_program : degree_program;
        university_domain = university_domain || s.university_domain;
        university_course_catalog_url = university_course_catalog_url || s.university_course_catalog_url;
      }
    }

    if (!university_name) return Response.json({ error: 'university_name is required' }, { status: 400 });
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
    if (rec && rec.last_parsed_at && rec.parse_status === 'success') {
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
    // A stale or failed record gets re-parsed; a fresh partial stays as-is too.
    if (rec && rec.parse_status === 'partial' && rec.last_parsed_at) {
      try {
        if (now - new Date(rec.last_parsed_at).getTime() < FRESH_MS) {
          return Response.json({
            cached: true,
            cache_id: rec.id,
            parse_status: rec.parse_status,
            course_count: (rec.parsed_courses || []).length,
            last_parsed_at: rec.last_parsed_at,
            calendar_source_url: rec.calendar_source_url,
          });
        }
      } catch (e) { /* fall through */ }
    }

    // ---- Parse via AI + web search ----
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
      "List ALL the courses offered under that faculty and degree program. For each course extract:",
      "- course_code: the official course code (e.g. 'ECE 105')",
      "- course_title: the full official title",
      "- course_description: the catalog description (1-3 sentences)",
      "- credits: credit weight as a number (default 0 if unknown)",
      "- prerequisites: a short string of prerequisites, or 'None'",
      "- department: the department/school offering it",
      "- difficulty_hints: an OPTIONAL short note if determinable from the description (e.g. 'lab-heavy', 'math-heavy', 'known weeder course', 'project-based'); empty string if not determinable",
      "Return a JSON object with: source_url (the exact URL you parsed), confidence ('high'|'medium'|'low'), notes (any issues), and courses (an array of the course objects above — include every real course you can find, up to 150).",
      "Only include REAL courses from this university's official catalog. If you cannot find the official calendar page, set confidence to 'low' and return whatever courses you can reliably infer, explaining in notes.",
      "If you genuinely cannot find any courses, return an empty courses array with confidence 'low' and a short notes explanation.",
    ].join(" ");

    let parse_status = 'success';
    let parse_notes = '';
    let calendar_source_url = '';
    let parsed_courses = [];

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
      calendar_source_url = d?.source_url || "";
      parse_notes = d?.notes || "";
      const conf = String(d?.confidence || "low").toLowerCase();
      parse_status = parsed_courses.length === 0
        ? "failed"
        : conf === "low"
          ? "partial"
          : "success";
      if (parsed_courses.length === 0) parse_notes = parse_notes || "No courses could be extracted from the catalog.";
    } catch (e) {
      parse_status = "failed";
      parse_notes = "AI catalog parse failed: " + (e?.message || "unknown error");
    }

    const record = {
      cache_key: key,
      university_name,
      faculty: faculty || "",
      degree_program: degree_program || "",
      calendar_source_url,
      parsed_courses,
      last_parsed_at: new Date().toISOString(),
      parse_status,
      parse_notes,
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
      calendar_source_url,
      last_parsed_at: record.last_parsed_at,
      parse_notes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}