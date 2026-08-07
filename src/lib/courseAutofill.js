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

// Fetch course details for a course code at the user's university via web
// search. Returns: { title, description, credits, faculty, degree_program,
// specialization, prerequisites, difficulty_ranking, difficulty_reason }.
// Always resolves (best-guess from the prefix if AI finds nothing).
export async function autofillCourse({ code, university }) {
  const uniName = university?.university_name || university?.name || "";
  const uniDomain = university?.university_domain || university?.domain || "";
  const catalogUrl = university?.university_course_catalog_url || university?.catalogUrl || "";

  const prompt = [
    "You are an expert on Canadian university course catalogs.",
    `A student is adding the course with code "${code}"${uniName ? ` at ${uniName}` : ""}.`,
    catalogUrl
      ? `Try to find this course on the university's course catalog at ${catalogUrl} (and the broader ${uniDomain} site).`
      : uniDomain
        ? `Try to find this course on the ${uniDomain} website and public academic calendar.`
        : "Search the web for this course code at a Canadian university.",
    "Return a JSON object with these fields:",
    "- title: the official course title (string)",
    "- description: the official course description as published in the catalog (string, 1-3 sentences)",
    "- credits: credit weight as a number (e.g. 3, 0.5, 4). Default 3 if unknown.",
    "- faculty: the faculty or school offering it (e.g. 'Faculty of Engineering')",
    "- degree_program: a degree program this course typically belongs to (e.g. 'Electrical Engineering')",
    "- specialization: a specialization within that program, if applicable",
    "- prerequisites: a short string listing prerequisites, or 'None' if none",
    "- difficulty_ranking: one of 'Easy', 'Moderate', 'Hard' based on course content, workload, credit weight and reputation",
    "- difficulty_reason: ONE short sentence (max ~20 words) explaining the ranking",
    "If you cannot find the exact course, infer the department from the course code prefix and still give your best-guess fields. Never leave title blank — use the course code as the title if nothing else fits.",
  ].join(" ");

  let result = null;
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          credits: { type: "number" },
          faculty: { type: "string" },
          degree_program: { type: "string" },
          specialization: { type: "string" },
          prerequisites: { type: "string" },
          difficulty_ranking: { type: "string", enum: ["Easy", "Moderate", "Hard"] },
          difficulty_reason: { type: "string" },
        },
        required: ["title", "difficulty_ranking"],
      },
    });
    result = res?.data ?? res;
  } catch (e) {
    result = null;
  }

  // Fallback prefix guess for department/faculty when AI returned nothing useful.
  const guess = guessFromCode(code);
  if (result) {
    return {
      title: result.title || code,
      description: result.description || "",
      credits: typeof result.credits === "number" && result.credits > 0 ? result.credits : 3,
      faculty: result.faculty || guess?.faculty || "",
      degree_program: result.degree_program || "",
      specialization: result.specialization || "",
      prerequisites: result.prerequisites || "",
      difficulty_ranking: result.difficulty_ranking || "Moderate",
      difficulty_reason: result.difficulty_reason || "",
    };
  }
  return {
    title: code,
    description: "",
    credits: 3,
    faculty: guess?.faculty || "",
    degree_program: "",
    specialization: "",
    prerequisites: "",
    difficulty_ranking: "Moderate",
    difficulty_reason: "",
  };
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