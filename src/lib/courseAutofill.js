// AI course-code autofill + difficulty assessment for Haven Education.
// Both calls use web-search-enabled Gemini (gemini_3_flash) so they can pull
// live course-catalog data from the user's university. Results are returned
// as plain JS objects (response_json_schema is set, so the SDK returns a dict).
import { base44 } from "@/api/base44Client";

// Prefix → { department, faculty } fallback guess (used when AI can't find the
// course, or the user has no university set). Conservative, well-known prefixes.
const PREFIX_MAP = {
  ECE: { department: "Electrical and Computer Engineering", faculty: "Faculty of Engineering" },
  EE: { department: "Electrical Engineering", faculty: "Faculty of Engineering" },
  ELE: { department: "Electrical Engineering", faculty: "Faculty of Engineering" },
  ELEC: { department: "Electrical Engineering", faculty: "Faculty of Engineering" },
  CIVE: { department: "Civil Engineering", faculty: "Faculty of Engineering" },
  ME: { department: "Mechanical Engineering", faculty: "Faculty of Engineering" },
  MENG: { department: "Mechanical Engineering", faculty: "Faculty of Engineering" },
  CHE: { department: "Chemical Engineering", faculty: "Faculty of Engineering" },
  MATH: { department: "Mathematics", faculty: "Faculty of Mathematics" },
  MATHS: { department: "Mathematics", faculty: "Faculty of Mathematics" },
  STAT: { department: "Statistics", faculty: "Faculty of Mathematics" },
  CS: { department: "Computer Science", faculty: "Faculty of Mathematics" },
  CSC: { department: "Computer Science", faculty: "Faculty of Science" },
  CPSC: { department: "Computer Science", faculty: "Faculty of Science" },
  SOFTWARE: { department: "Software Engineering", faculty: "Faculty of Mathematics" },
  SE: { department: "Software Engineering", faculty: "Faculty of Engineering" },
  PHYS: { department: "Physics", faculty: "Faculty of Science" },
  PHYSICS: { department: "Physics", faculty: "Faculty of Science" },
  CHEM: { department: "Chemistry", faculty: "Faculty of Science" },
  CHEMISTRY: { department: "Chemistry", faculty: "Faculty of Science" },
  BIOL: { department: "Biology", faculty: "Faculty of Science" },
  BIO: { department: "Biology", faculty: "Faculty of Science" },
  BIOLOGY: { department: "Biology", faculty: "Faculty of Science" },
  ECON: { department: "Economics", faculty: "Faculty of Arts" },
  ENGL: { department: "English", faculty: "Faculty of Arts" },
  ARTS: { department: "Arts", faculty: "Faculty of Arts" },
  HIST: { department: "History", faculty: "Faculty of Arts" },
  PSYCH: { department: "Psychology", faculty: "Faculty of Science" },
  PSY: { department: "Psychology", faculty: "Faculty of Science" },
  ENG: { department: "Engineering", faculty: "Faculty of Engineering" },
  AMS: { department: "Applied Mathematics", faculty: "Faculty of Mathematics" },
  AM: { department: "Applied Mathematics", faculty: "Faculty of Mathematics" },
  CO: { department: "Combinatorics & Optimization", faculty: "Faculty of Mathematics" },
  PMATH: { department: "Pure Mathematics", faculty: "Faculty of Mathematics" },
  ACTSC: { department: "Actuarial Science", faculty: "Faculty of Mathematics" },
  ASTR: { department: "Astronomy", faculty: "Faculty of Science" },
  GEOG: { department: "Geography", faculty: "Faculty of Environment" },
  ENV: { department: "Environment", faculty: "Faculty of Environment" },
  ERS: { department: "Environment & Resource Studies", faculty: "Faculty of Environment" },
  SPCOM: { department: "Speech Communication", faculty: "Faculty of Arts" },
  ENBUS: { department: "Environment & Business", faculty: "Faculty of Environment" },
};

export function guessFromCode(code) {
  if (!code) return null;
  const m = String(code).trim().toUpperCase().match(/^([A-Z]+)/);
  if (!m) return null;
  return PREFIX_MAP[m[1]] || null;
}

// Does the typed course code's subject prefix belong to the user's declared
// degree program / specialization? Used to decide whether to auto-run the AI
// catalog lookup (in-program) or wait for a manual button press (elective).
// Conservative: matches only when a meaningful word from the profile overlaps
// the prefix's predicted department.
export function matchesProfileBranch(code, profile = {}) {
  const guess = guessFromCode(code);
  if (!guess) return false;
  const profileText = `${profile.degree_program || ""} ${profile.specialization || ""}`.toLowerCase().trim();
  if (!profileText) return false;
  const meaningful = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  const pwords = meaningful(profileText);
  const dwords = meaningful(guess.department || "");
  return pwords.some((w) => dwords.includes(w));
}

// Rough weekly-hours fallback: ~2h per credit, scaled by difficulty.
function fallbackHours(credits, difficulty) {
  const c = credits && credits > 0 ? credits : 3;
  const eff = c >= 1 ? c : 0.5; // half-credit courses count as a normal course
  const base = 6 * (eff >= 1 ? Math.min(eff, 6) / 3 : 1);
  const mult = difficulty === "Hard" ? 1.4 : difficulty === "Easy" ? 0.8 : 1.1;
  return Math.max(2, Math.round(base * mult));
}

// Fetch course details for a course code at the user's university via web
// search. Returns: { candidates: Array<{code,title,description,credits,
// faculty,degree_program,specialization,prerequisites,difficulty_ranking,
// difficulty_reason,estimated_weekly_hours}>, weekly_hours }.
// The first candidate is the best/exact match. Always resolves.
export async function autofillCourse({ code, university, profile }) {
  const uniName = university?.university_name || university?.name || "";
  const uniDomain = university?.university_domain || university?.domain || "";
  const catalogUrl = university?.university_course_catalog_url || university?.catalogUrl || "";
  const program = profile?.degree_program || "";
  const spec = profile?.specialization || "";

  const prompt = [
    "You are an expert on Canadian university course catalogs.",
    `A student is adding the course with code "${code}"${uniName ? ` at ${uniName}` : ""}.`,
    program
      ? `Their declared degree program is "${program}"${spec ? ` (specialization: "${spec}")` : ""}. Prioritize matching courses from that program's official course listing; only broaden to the wider university catalog if the code clearly belongs to a different department.`
      : "",
    catalogUrl
      ? `Find courses on the university's course catalog at ${catalogUrl} (and the broader ${uniDomain} site).`
      : uniDomain
        ? `Find courses on the ${uniDomain} website and public academic calendar.`
        : "Search the web for this course code at a Canadian university.",
    "Return a JSON object with a 'courses' array of 1 to 3 best-match course objects. The FIRST item must be the best/exact match for the given code. Each course object has:",
    "- code: the course code as listed (string)",
    "- title: the official course title (string)",
    "- description: the official course description as published in the catalog (string, 1-3 sentences)",
    "- credits: credit weight as a number (e.g. 3, 0.5, 4). Default 3 if unknown.",
    "- faculty: the faculty or school offering it (e.g. 'Faculty of Engineering')",
    "- degree_program: a degree program this course typically belongs to (e.g. 'Electrical Engineering')",
    "- specialization: a specialization within that program, if applicable",
    "- prerequisites: a short string listing prerequisites, or 'None' if none",
    "- difficulty_ranking: one of 'Easy','Moderate','Hard','Very Hard','Brutal'. Be HONEST AND BRUTAL. Do NOT default to Moderate unless you genuinely cannot find any signal; upper-year engineering/math/CS courses are usually Hard or higher. Cross-reference RateMyProfessors, Reddit, course outlines, GPA, fail rate, credit weight, and reputation. Tier criteria: Easy = gentle intro/light 'bird course'; Moderate = standard mid-program, not notorious; Hard = known challenging, heavy workload, below-average GPA; Very Hard = notoriously demanding, heavy lab/design, high fail/drop, deep prereqs, serious weeder; Brutal = legendary 'killer'/'weeder' course, one of the hardest in the program, very high dropout, exceptional time required.",
    "- difficulty_reason: ONE short sentence (~20 words) explaining the ranking, citing the strongest evidence found online",
    "- estimated_weekly_hours: a number — recommended total study hours per week (lectures + labs + tutorials + independent study), based on credit weight, difficulty, and any lab/tutorial time mentioned in the description",
    "If you cannot find the exact course, infer the department from the course code prefix and still give your best-guess fields. Never leave title blank — use the course code as the title if nothing else fits.",
  ].join(" ");

  let courses = null;
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                credits: { type: "number" },
                faculty: { type: "string" },
                degree_program: { type: "string" },
                specialization: { type: "string" },
                prerequisites: { type: "string" },
                difficulty_ranking: { type: "string", enum: ["Easy", "Moderate", "Hard", "Very Hard", "Brutal"] },
                difficulty_reason: { type: "string" },
                estimated_weekly_hours: { type: "number" },
              },
              required: ["title", "difficulty_ranking"],
            },
          },
        },
        required: ["courses"],
      },
    });
    const d = res?.data ?? res;
    courses = Array.isArray(d?.courses) ? d.courses : null;
  } catch (e) {
    courses = null;
  }

  const guess = guessFromCode(code);
  const normalize = (c) => ({
    code: c?.code || code,
    title: c?.title || code,
    description: c?.description || "",
    credits: typeof c?.credits === "number" && c.credits > 0 ? c.credits : 3,
    faculty: c?.faculty || guess?.faculty || "",
    degree_program: c?.degree_program || "",
    specialization: c?.specialization || "",
    prerequisites: c?.prerequisites || "",
    difficulty_ranking: c?.difficulty_ranking || "Moderate",
    difficulty_reason: c?.difficulty_reason || "",
    estimated_weekly_hours: typeof c?.estimated_weekly_hours === "number" && c.estimated_weekly_hours > 0
      ? c.estimated_weekly_hours
      : fallbackHours(typeof c?.credits === "number" ? c.credits : 3, c?.difficulty_ranking || "Moderate"),
  });

  let candidates;
  if (courses && courses.length) {
    candidates = courses.slice(0, 3).map(normalize);
  } else {
    candidates = [{
      code, title: code, description: "", credits: 3,
      faculty: guess?.faculty || "", degree_program: "", specialization: "",
      prerequisites: "", difficulty_ranking: "Moderate", difficulty_reason: "",
      estimated_weekly_hours: fallbackHours(3, "Moderate"),
    }];
  }
  return { candidates, weekly_hours: candidates[0]?.estimated_weekly_hours ?? fallbackHours(3, "Moderate") };
}

// Live autocomplete: given a (partial) course code / prefix typed by the user,
// return up to 12 catalog courses at their university whose code begins with
// the query. Prioritizes the user's declared program. Used for the inline
// dropdown shown while typing the course code in the Add Course form.
export async function autocompleteCourses({ query, university, profile }) {
  const q = (query || "").trim();
  if (!q) return [];
  const prefix = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!prefix) return [];
  const uniName = university?.university_name || university?.name || "";
  const uniDomain = university?.university_domain || university?.domain || "";
  const catalogUrl = university?.university_course_catalog_url || university?.catalogUrl || "";
  const program = profile?.degree_program || "";
  const spec = profile?.specialization || "";

  const prompt = [
    "You are an expert on Canadian university course catalogs.",
    `A student${uniName ? ` at ${uniName}` : ""} is searching for courses whose code starts with "${prefix}".`,
    program
      ? `Their declared program is "${program}"${spec ? ` (specialization: "${spec}")` : ""}. Prioritize courses in that program's course list, but also include other real courses at the university whose code begins with "${prefix}".`
      : `List real courses at the university whose code begins with "${prefix}".`,
    catalogUrl
      ? `Search the course catalog at ${catalogUrl} (and the broader ${uniDomain} site).`
      : uniDomain
        ? `Search the ${uniDomain} website and public academic calendar.`
        : "Search the web for courses at a Canadian university with this code prefix.",
    "Return a JSON object with a 'courses' array of up to 12 REAL matching course objects, most relevant first. Each has:",
    "- code: the full course code (string)",
    "- title: the official course title (string)",
    "- description: the catalog course description (string, 1-3 sentences; empty if unknown)",
    "- credits: credit weight as a number (default 3)",
    "- faculty: the faculty offering it (e.g. 'Faculty of Engineering')",
    "- degree_program: a degree program this course belongs to (if applicable)",
    "- specialization: a specialization within that program (if applicable)",
    "- prerequisites: short string of prerequisites, or 'None'",
    "- difficulty_ranking: one of 'Easy','Moderate','Hard','Very Hard','Brutal'. Be HONEST AND BRUTAL based on real student-perceived difficulty (RateMyProfessors, Reddit, course outlines), workload, GPA, fail rate, credit weight, and reputation. Do NOT default to Moderate unless you genuinely cannot find any signal; upper-year engineering/math/CS courses are usually Hard or higher.",
    "- difficulty_reason: ONE short sentence (~20 words) explaining the ranking, citing the strongest evidence found online",
    "- estimated_weekly_hours: a number — recommended total study hours per week (lectures + labs + tutorials + independent study)",
    "Only include REAL courses from this university's catalog. If you cannot find any starting with this prefix, return an empty courses array.",
  ].join(" ");

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          courses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                credits: { type: "number" },
                faculty: { type: "string" },
                degree_program: { type: "string" },
                specialization: { type: "string" },
                prerequisites: { type: "string" },
                difficulty_ranking: { type: "string", enum: ["Easy", "Moderate", "Hard", "Very Hard", "Brutal"] },
                difficulty_reason: { type: "string" },
                estimated_weekly_hours: { type: "number" },
              },
              required: ["code", "title", "difficulty_ranking"],
            },
          },
        },
        required: ["courses"],
      },
    });
    const d = res?.data ?? res;
    const list = Array.isArray(d?.courses) ? d.courses : [];
    const guess = guessFromCode(prefix);
    return list.slice(0, 12).map((c) => ({
      code: c?.code || prefix,
      title: c?.title || prefix,
      description: c?.description || "",
      credits: typeof c?.credits === "number" && c.credits > 0 ? c.credits : 3,
      faculty: c?.faculty || guess?.faculty || "",
      degree_program: c?.degree_program || "",
      specialization: c?.specialization || "",
      prerequisites: c?.prerequisites || "",
      difficulty_ranking: c?.difficulty_ranking || "Moderate",
      difficulty_reason: c?.difficulty_reason || "",
      estimated_weekly_hours: typeof c?.estimated_weekly_hours === "number" && c.estimated_weekly_hours > 0
        ? c.estimated_weekly_hours
        : fallbackHours(typeof c?.credits === "number" ? c.credits : 3, c?.difficulty_ranking || "Moderate"),
    }));
  } catch (e) {
    return [];
  }
}

// Generate (or regenerate) a detailed difficulty explanation for a course.
// Returns { details, weekly_hours }. details is multi-paragraph text to show
// in the Learn More expansion.
export async function generateDifficultyDetails({ code, title, course_description, credits, university }) {
  const uniName = university?.university_name || university?.name || "the student's university";
  const desc = course_description ? `\nCourse description: "${course_description}"` : "";
  const prompt = [
    `Produce a detailed difficulty briefing for the university course "${code} — ${title}" at ${uniName}.`,
    `It is worth ${credits ?? 3} credits.${desc}`,
    "Search online sources (RateMyProfessors, Reddit, course outline pages, university forums) to ground your answer in real student experience.",
    "Return a JSON object with:",
    "- details: a string with 4 short paragraphs separated by '\\n'. Paragraph 1: what specifically makes it hard/easy (topics, concepts, workload). Paragraph 2: common student experiences and reported difficulty. Paragraph 3: recommended study strategies and tips. Paragraph 4: estimated weekly study hours and a one-line bottom line.",
    "- weekly_hours: a number — recommended study hours per week.",
    "Be concrete and specific to THIS course at THIS university. Avoid generic filler.",
  ].join(" ");

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          details: { type: "string" },
          weekly_hours: { type: "number" },
        },
        required: ["details"],
      },
    });
    const d = res?.data ?? res;
    return {
      details: d?.details || "",
      weekly_hours: typeof d?.weekly_hours === "number" ? d.weekly_hours : null,
    };
  } catch (e) {
    return { details: "", weekly_hours: null };
  }
}

// On-demand: research THIS course (code + title) at the user's university via
// web search. Returns the official course description AND an honest/brutal
// difficulty ranking grounded in real student-perceived signals (RateMyProfs,
// Reddit, course outlines, university forums). Used by the "Generate" button
// next to the description in the Add/Edit Course form — one AI call fills both
// the description and a researched difficulty ranking.
export async function researchCourse({ code, title, university, profile }) {
  const uniName = university?.university_name || university?.name || "";
  const uniDomain = university?.university_domain || university?.domain || "";
  const catalogUrl = university?.university_course_catalog_url || university?.catalogUrl || "";
  const program = profile?.degree_program || "";
  const spec = profile?.specialization || "";
  const prompt = [
    `Research the university course "${code}"${title ? ` — "${title}"` : ""}${uniName ? ` at ${uniName}` : " (Canadian university)"}.`,
    program ? `It is part of the ${program}${spec ? ` (${spec})` : ""} program.` : "",
    catalogUrl
      ? `Primary source: ${catalogUrl}; also browse the broader ${uniDomain} site.`
      : (uniDomain ? `Search ${uniDomain} and its official academic calendar.` : "Search the web for this course at a Canadian university."),
    "Look up (a) the OFFICIAL catalog course description — topics, what students learn, prerequisites, lecture/lab/tutorial format, workload — and (b) REAL student-perceived difficulty from RateMyProfessors, Reddit (r/<university>), course-outline PDFs, and university forums. Cross-reference workload, GPA, fail rate, and reputation.",
    "Be HONEST AND BRUTAL about difficulty. Do NOT default to Moderate unless you genuinely cannot find any signal. Most upper-year engineering / math / CS courses are Hard or above, not Moderate.",
    "Tier criteria — pick the truest for THIS course:",
    "  Easy — gentle intro, broad concepts, light workload, common 'bird course'.",
    "  Moderate — standard mid-program course; needs consistent effort; not notorious.",
    "  Hard — known as challenging; heavy workload; math/proof/project-intensive; below-average GPA.",
    "  Very Hard — notoriously demanding; heavy lab/design; deep prereqs; high fail/drop rate; serious weeder.",
    "  Brutal — legendary 'killer'/'weeder' course; one of the hardest in the program; very high dropout; exceptional time commitment required.",
    "Return a JSON object with:",
    "- description: the official catalog description (1-4 sentences; condensed verbatim if long). Empty string ONLY if genuinely not found.",
    "- difficulty_ranking: one of 'Easy','Moderate','Hard','Very Hard','Brutal'. When no reliable signal exists, default to 'Hard' for 200+ level engineering/math/science courses, else 'Moderate'.",
    "- difficulty_reason: ONE short sentence (~20 words) explaining the ranking, citing the strongest evidence you found.",
    "- source_url: the page you pulled the description from, if any.",
  ].filter(Boolean).join(" ");

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          difficulty_ranking: { type: "string", enum: ["Easy", "Moderate", "Hard", "Very Hard", "Brutal"] },
          difficulty_reason: { type: "string" },
          source_url: { type: "string" },
        },
        required: ["description", "difficulty_ranking"],
      },
    });
    const d = res?.data ?? res;
    return {
      description: (d?.description || "").trim(),
      difficulty_ranking: d?.difficulty_ranking || "",
      difficulty_reason: d?.difficulty_reason || "",
      source_url: d?.source_url || "",
    };
  } catch (e) {
    return { description: "", difficulty_ranking: "", difficulty_reason: "", source_url: "" };
  }
}

// ===========================================================================
// Cached course catalog (pre-fetched per university + faculty + degree program)
// ===========================================================================

// Normalized lookup key shared with the refreshCourseCatalog backend function.
// The exact same normalization MUST run on both sides or cache reads miss.
export function catalogCacheKey(university, faculty, degree_program) {
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const uniName = university?.university_name || university?.name || (typeof university === "string" ? university : "");
  return [norm(uniName), norm(faculty), norm(degree_program)].join("::");
}

export function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function difficultyFromHints(hints, title, description) {
  const h = `${hints || ""} ${title || ""} ${description || ""}`.toLowerCase();
  if (!h.trim()) return { ranking: "Moderate", reason: "" };
  if (/(notoriously|brutal|legendary|killer|extremely difficult|very hard|high fail|dropout|one of the hardest|rigorous|heavy workload|intensive|capstone|thesis|challenging|weeder)/.test(h))
    return { ranking: "Brutal", reason: hints || "Catalog + reputation signal this as a demanding course." };
  if (/(advanced|hard|difficult|complex|proof|proofs|design|project-based|honours)/.test(h))
    return { ranking: "Hard", reason: hints || "Topics and workload point to a hard course." };
  if (/(introductory|intro|beginner|easy|light|accessible|overview|fundamentals|survey)/.test(h))
    return { ranking: "Easy", reason: hints || "Introductory / low-workload content." };
  return { ranking: "Moderate", reason: hints || "" };
}

// Map a cached parsed_course to the candidate shape used by autocompleteCourses.
function cachedToCandidate(c, profile) {
  const { ranking, reason } = difficultyFromHints(c.difficulty_hints, c.course_title, c.course_description);
  const credits = typeof c.credits === "number" && c.credits > 0 ? c.credits : 3;
  return {
    code: c.course_code || "",
    title: c.course_title || c.course_code || "",
    description: c.course_description || "",
    credits,
    faculty: profile?.faculty || "",
    degree_program: profile?.degree_program || "",
    specialization: profile?.specialization || "",
    prerequisites: c.prerequisites || "",
    difficulty_ranking: ranking,
    difficulty_reason: reason,
    estimated_weekly_hours: fallbackHours(credits, ranking),
    from_cache: true,
  };
}

// Instant cache read — no AI, no spinner. Finds the shared CourseCatalogCache
// record for the user's university + faculty + degree_program and returns the
// courses whose normalized code starts with the typed query.
// Resolves to { courses:[...candidates], cached, reason?, cache_id?, parse_status?, last_parsed_at? }.
export async function lookupCachedCourses({ query, university, profile }) {
  const q = (query || "").trim();
  if (!q) return { courses: [], cached: false, reason: "empty-query" };
  const uniName = university?.university_name || university?.name || "";
  if (!uniName) return { courses: [], cached: false, reason: "no-university" };
  const key = catalogCacheKey(university, profile?.faculty, profile?.degree_program);

  let rec = null;
  try {
    const list = await base44.entities.CourseCatalogCache.filter({ cache_key: key });
    rec = Array.isArray(list) && list.length ? list[0] : null;
  } catch (e) {
    rec = null;
  }
  if (!rec) return { courses: [], cached: false, reason: "no-cache" };

  const all = Array.isArray(rec.parsed_courses) ? rec.parsed_courses : [];
  if (!all.length) return { courses: [], cached: true, reason: "empty-cache", parse_status: rec.parse_status };

  const needle = normalizeCode(q);
  const matches = all
    .filter((c) => normalizeCode(c.course_code).startsWith(needle))
    .slice(0, 12)
    .map((c) => cachedToCandidate(c, profile));

  return { courses: matches, cached: true, cache_id: rec.id, parse_status: rec.parse_status, last_parsed_at: rec.last_parsed_at };
}

// On-demand AI lookup with a HARD timeout. Resolves to { courses } or
// { error: "timeout" | "failed", message }. Never hangs: the timeout forces a
// resolution and the underlying autocompleteCourses never rejects.
export async function autocompleteCoursesTimed({ query, university, profile, timeoutMs = 12000 }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => { if (settled) return; settled = true; resolve(val); };
    const timer = setTimeout(() => finish({ error: "timeout", message: "The search is taking too long." }), timeoutMs);
    autocompleteCourses({ query, university, profile })
      .then((courses) => { clearTimeout(timer); finish({ courses: courses || [] }); })
      .catch((e) => { clearTimeout(timer); finish({ error: "failed", message: e?.message || "Lookup failed." }); });
  });
}

// Fire-and-forget: kick off a background catalog refresh for a combo. Used on
// profile setup and when the user changes university/faculty/program in
// Settings. Never throws into the caller; the backend does the heavy lifting.
export function refreshCatalogInBackground({ university_name, faculty, degree_program }) {
  if (!university_name) return;
  try {
    const p = base44.functions.invoke("refreshCourseCatalog", {
      university_name,
      faculty: faculty || "",
      degree_program: degree_program || "",
    });
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (e) { /* swallow — this is best-effort */ }
}