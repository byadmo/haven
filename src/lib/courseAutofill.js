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
    "- difficulty_ranking: one of 'Easy', 'Moderate', 'Hard' based on course content, workload, credit weight and reputation",
    "- difficulty_reason: ONE short sentence (max ~20 words) explaining the ranking",
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
                difficulty_ranking: { type: "string", enum: ["Easy", "Moderate", "Hard"] },
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