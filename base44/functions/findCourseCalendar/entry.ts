import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Stage A of the catalog flow: FAST web search to find the exact official
// undergraduate academic-calendar / course-listing URL for the student's
// specific faculty + degree program + specialization. Returns candidate URLs
// (no parsing) so the frontend can auto-fill the "Undergraduate Calendar URL"
// field and let the user CONFIRM before the heavier parse runs.
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

    // Fallback to the caller's EduSettings when params are missing.
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

    const programContext = [
      degree_program ? `degree program "${degree_program}"` : '',
      faculty ? `in the ${faculty}` : '',
      specialization ? `specialization "${specialization}"` : '',
    ].filter(Boolean).join(', ');

    const prompt = [
      "Find the EXACT URL of the official undergraduate academic-calendar / course-listing page that enumerates the COURSES for this specific student's program.",
      `University: ${university_name}.`,
      programContext ? `Student program: ${programContext}.` : '',
      university_domain ? `University website domain: ${university_domain} — strongly prefer pages on this domain.` : '',
      university_course_catalog_url ? `A known starting URL is ${university_course_catalog_url} — verify it, or find the more specific program/course-listing page.` : '',
      `Search the web, e.g. "${university_name} undergraduate calendar ${degree_program || faculty || ''} courses", "${university_name} course calendar ${specialization || ''}".`,
      "I need a PAGE THAT LISTS INDIVIDUAL COURSES (codes + titles + descriptions) for this program — NOT a generic homepage. Prefer the program's specific course-listing / course-description page.",
      "Return ONLY a JSON object with: 'best_url' (the single best course-listing URL) and 'candidates' (array, up to 3) each { url, title, confidence }. No explanations.",
      "Only return REAL URLs from the search results — never guess. If none found, return best_url '' and an empty candidates array.",
    ].filter(Boolean).join(" ");

    let candidates = [];
    let best_url = "";
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            best_url: { type: "string" },
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  title: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["url", "title"],
              },
            },
          },
          required: ["candidates"],
        },
      });
      const d = res?.data ?? res;
      const raw = Array.isArray(d?.candidates) ? d.candidates : [];
      candidates = raw
        .filter((c) => c && c.url && /^https?:\/\//i.test(c.url))
        .map((c) => ({ url: String(c.url).trim(), title: String(c.title || c.url).trim(), confidence: c.confidence || "medium" }))
        .slice(0, 3);
      best_url = (d?.best_url && /^https?:\/\//i.test(d.best_url)) ? String(d.best_url).trim() : (candidates[0]?.url || "");
    } catch (e) {
      candidates = [];
      best_url = "";
    }

    return Response.json({ candidates, best_url, university_name, faculty: faculty || "", degree_program: degree_program || "", specialization: specialization || "" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}