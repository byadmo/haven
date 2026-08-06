// Transcript GPA calculation — standard 4.0 scale.
// A+ 4.0, A 4.0, A- 3.7, B+ 3.3, B 3.0, B- 2.7, C+ 2.3, C 2.0,
// C- 1.7, D+ 1.3, D 1.0, F 0.0

export const GPA_SCALE = {
  "A+": 4.0, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, F: 0.0,
};

export function letterToGpa(l) {
  if (!l) return 0;
  return GPA_SCALE[String(l).toUpperCase().trim()] ?? 0;
}

export function percentToLetter(p) {
  if (p == null || isNaN(p)) return "";
  if (p >= 97) return "A+";
  if (p >= 93) return "A";
  if (p >= 90) return "A-";
  if (p >= 87) return "B+";
  if (p >= 83) return "B";
  if (p >= 80) return "B-";
  if (p >= 77) return "C+";
  if (p >= 73) return "C";
  if (p >= 70) return "C-";
  if (p >= 67) return "D+";
  if (p >= 60) return "D";
  return "F";
}

function codePrefix(code) {
  const m = String(code || "").match(/^[A-Za-z]+/);
  return m ? m[0].toUpperCase() : "GEN";
}

const SEASON_RANK = { winter: 0, spring: 1, summer: 1, fall: 2 };
function termKey(term) {
  const m = String(term || "").match(/(\d{4})/);
  const year = m ? parseInt(m[1], 10) : 0;
  const s = String(term || "").toLowerCase();
  let rank = 3;
  for (const k in SEASON_RANK) {
    if (s.includes(k)) { rank = SEASON_RANK[k]; break; }
  }
  return [year, rank];
}

// Accepts a list of raw parsed courses: { term, code, title, grade_percent, letter, credit_hours }
export function computeTranscript(inputCourses) {
  const courses = (inputCourses || []).map((c, i) => {
    const letter = (c.letter || "").toUpperCase().trim();
    const pct = c.grade_percent != null && c.grade_percent !== "" ? Number(c.grade_percent) : null;
    const credit_hours = c.credit_hours != null && c.credit_hours !== "" ? Number(c.credit_hours) : 3;
    return {
      term: c.term || "Unknown",
      code: (c.code || "").toUpperCase().trim() || `COURSE${i + 1}`,
      title: c.title || "",
      grade_percent: pct,
      letter,
      credit_hours,
    };
  }).map((c) => {
    if (!c.letter && c.grade_percent != null) c.letter = percentToLetter(c.grade_percent);
    c.gpa = letterToGpa(c.letter);
    c.quality_points = +(c.gpa * c.credit_hours).toFixed(2);
    return c;
  });

  const totalCredits = courses.reduce((s, c) => s + c.credit_hours, 0);
  const totalQP = courses.reduce((s, c) => s + c.quality_points, 0);
  const cumulativeGpa = totalCredits > 0 ? +(totalQP / totalCredits).toFixed(3) : 0;

  // Per-term breakdown (chronological)
  const termMap = {};
  courses.forEach((c) => { (termMap[c.term] = termMap[c.term] || []).push(c); });
  const terms = Object.keys(termMap).map((term) => {
    const list = termMap[term];
    const credits = list.reduce((s, c) => s + c.credit_hours, 0);
    const qp = list.reduce((s, c) => s + c.quality_points, 0);
    return { term, credits, quality_points: +qp.toFixed(2), gpa: credits > 0 ? +(qp / credits).toFixed(3) : 0 };
  }).sort((a, b) => {
    const [ay, ar] = termKey(a.term);
    const [by, br] = termKey(b.term);
    return ay - by || ar - br || a.term.localeCompare(b.term);
  });

  // Per-department (major) grouping
  const majorMap = {};
  courses.forEach((c) => { const p = codePrefix(c.code); (majorMap[p] = majorMap[p] || []).push(c); });
  const majors = Object.keys(majorMap).map((prefix) => {
    const list = majorMap[prefix];
    const credits = list.reduce((s, c) => s + c.credit_hours, 0);
    const qp = list.reduce((s, c) => s + c.quality_points, 0);
    return { prefix, credits, quality_points: +qp.toFixed(2), gpa: credits > 0 ? +(qp / credits).toFixed(3) : 0, count: list.length };
  }).sort((a, b) => b.credits - a.credits || a.prefix.localeCompare(b.prefix));
  const major = majors[0] || null;
  const majorGpa = major ? major.gpa : 0;

  return { courses, cumulativeGpa, totalCredits, totalQualityPoints: +totalQP.toFixed(2), terms, majors, major, majorGpa };
}

// A serializable snapshot for saving to the user's profile.
export function snapshot(transcript) {
  return {
    courses: transcript.courses,
    cumulativeGpa: transcript.cumulativeGpa,
    totalCredits: transcript.totalCredits,
    totalQualityPoints: transcript.totalQualityPoints,
    terms: transcript.terms,
    majors: transcript.majors,
    majorGpa: transcript.majorGpa,
    savedAt: new Date().toISOString(),
  };
}