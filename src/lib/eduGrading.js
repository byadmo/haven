// Letter-grade & GPA helpers shared across EduSync (grades page + analytics).

export function percentToLetter(p) {
  if (p == null || isNaN(p)) return "—";
  if (p >= 95) return "A+";
  if (p >= 90) return "A";
  if (p >= 85) return "A-";
  if (p >= 80) return "B+";
  if (p >= 75) return "B";
  if (p >= 70) return "B-";
  if (p >= 65) return "C+";
  if (p >= 60) return "C";
  if (p >= 55) return "C-";
  if (p >= 50) return "D";
  return "F";
}

const LETTER_GPA = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D": 1.0, "F": 0.0, "—": 0.0,
};

export function letterToGpa(l) {
  return LETTER_GPA[l] ?? 0;
}

export function percentToGpa(p) {
  return letterToGpa(percentToLetter(p));
}

// Weighted current grade from graded deliverables only (percentage).
export function currentGrade(deliverables) {
  const graded = deliverables.filter((d) => d.graded && d.grade != null && d.weight > 0);
  const totalW = graded.reduce((s, d) => s + d.weight, 0);
  if (totalW <= 0) return null;
  const earned = graded.reduce((s, d) => s + (d.grade / (d.max_grade || 100)) * d.weight, 0);
  return (earned / totalW) * 100;
}

// Projected final using what-if grades for ungraded items (delvs with .whatIf set).
export function projectedGrade(deliverables) {
  const weighted = deliverables.filter((d) => d.weight > 0);
  const totalW = weighted.reduce((s, d) => s + d.weight, 0);
  if (totalW <= 0) return null;
  let earned = 0;
  let accounted = 0;
  weighted.forEach((d) => {
    let g = null;
    if (d.graded && d.grade != null) g = (d.grade / (d.max_grade || 100)) * 100;
    else if (d.whatIf != null && d.whatIf !== "") g = Number(d.whatIf);
    if (g != null && !isNaN(g)) { earned += (g * d.weight); accounted += d.weight; }
  });
  // If not all weights accounted, scale to full
  if (accounted <= 0) return null;
  return (earned / accounted) * (100) ; // normalized projection
}

// Score needed on remaining deliverables to reach target percent
export function neededForTarget(deliverables, targetPercent) {
  const remaining = deliverables.filter((d) => d.weight > 0 && !(d.graded && d.grade != null));
  const graded = deliverables.filter((d) => d.graded && d.grade != null && d.weight > 0);
  const totalW = deliverables.filter((d) => d.weight > 0).reduce((s, d) => s + d.weight, 0);
  if (totalW <= 0 || remaining.length === 0) return null;
  const earned = graded.reduce((s, d) => s + (d.grade / (d.max_grade || 100)) * 100 * d.weight, 0);
  const remainingW = remaining.reduce((s, d) => s + d.weight, 0);
  const needed = ((targetPercent * totalW) - earned) / remainingW;
  return needed; // percent needed on average across remaining
}