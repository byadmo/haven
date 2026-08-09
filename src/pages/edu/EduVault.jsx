import React, { useState, useMemo } from "react";
import { BookOpen, BarChart3, GraduationCap, ExternalLink, Calculator } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

function formatGrade(v) {
  return v != null ? `${v.toFixed(1)}%` : "—";
}

export default function EduVault() {
  const { activeSemester, courses, materials, grades } = useEduSync();
  const [selectedCourse, setSelectedCourse] = useState(null);

  // ── Course list with grade badges ──
  const courseList = useMemo(() => {
    return (courses || []).map((c) => {
      const courseGrades = (grades || []).filter((g) => g.course_id === c.id);
      const weighted = courseGrades.reduce((s, g) => s + (g.score || 0) * ((g.weight || 0) / 100), 0);
      const totalWeight = courseGrades.reduce((s, g) => s + (g.weight || 0), 0);
      return {
        ...c,
        currentGrade: totalWeight > 0 ? weighted / (totalWeight / 100) : null,
        gradeCount: courseGrades.length,
      };
    });
  }, [courses, grades]);

  // ── Selected course details ──
  const selectedDetails = useMemo(() => {
    if (!selectedCourse) return null;
    const courseGrades = (grades || []).filter((g) => g.course_id === selectedCourse.id);
    const remainingWeight = 100 - courseGrades.reduce((s, g) => s + (g.weight || 0), 0);
    const currentAvg = selectedCourse.currentGrade || 0;
    return { courseGrades, remainingWeight, currentAvg };
  }, [selectedCourse, grades]);

  // ── Grade Needed on Final ──
  const gradeNeeded = useMemo(() => {
    if (!selectedDetails || !selectedCourse) return null;
    const { currentAvg, remainingWeight, courseGrades } = selectedDetails;
    const currentWeight = 100 - remainingWeight;
    if (remainingWeight <= 0) return null;
    const results = [];
    for (const target of [50, 60, 70, 80, 90]) {
      const needed = (target - (currentWeight > 0 ? currentAvg * (currentWeight / 100) : 0)) / (remainingWeight / 100);
      results.push({ target, needed: Math.min(Math.max(needed, 0), 100) });
    }
    return results;
  }, [selectedDetails, selectedCourse]);

  return (
    <div className="dd-page-enter">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Academic Vault</h1>
        <p className="text-sm text-white/50 mt-1">Courses, grades, and performance analytics — unified.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Course Selection Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Courses</p>
          {courseList.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black p-6 text-center">
              <BookOpen className="h-6 w-6 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/40">No courses yet.</p>
            </div>
          ) : (
            courseList.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              const gradeColor = c.currentGrade >= 80 ? "border-emerald-400/30 text-emerald-300" : c.currentGrade >= 60 ? "border-amber-400/30 text-amber-300" : c.currentGrade != null ? "border-red-400/30 text-red-300" : "border-white/10 text-white/40";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  className={`w-full text-left rounded-xl border transition-colors p-4 ${
                    isSelected ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/10 bg-black hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name || c.code}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{c.code || c.professor || "—"}</p>
                    </div>
                    <div className={`ml-3 shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold tabular-nums ${gradeColor}`}>
                      {c.currentGrade != null ? `${Math.round(c.currentGrade)}%` : "—"}
                    </div>
                  </div>
                  {c.gradeCount > 0 && (
                    <p className="text-[9px] text-white/20 mt-2">{c.gradeCount} graded items</p>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Course Details Dashboard */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCourse ? (
            <div className="rounded-2xl border border-white/10 bg-black p-12 text-center">
              <GraduationCap className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Select a course to view its details, grades, and analytics.</p>
            </div>
          ) : (
            <>
              {/* Course Info Header */}
              <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedCourse.name}</h2>
                    <p className="text-xs text-white/50 mt-1">{selectedCourse.code} · {selectedCourse.professor || "—"}</p>
                  </div>
                  {selectedCourse.syllabus_url && (
                    <a href={selectedCourse.syllabus_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200">
                      <ExternalLink className="h-3 w-3" /> Syllabus
                    </a>
                  )}
                </div>
                {selectedCourse.schedule && selectedCourse.schedule.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-white/40">
                    {selectedCourse.schedule.map((s, i) => (
                      <span key={i} className="bg-white/5 rounded-md px-2 py-1">{s.day} {s.start}:00–{s.end}:00</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Grades Table */}
              {selectedDetails && selectedDetails.courseGrades.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Grade Breakdown</h3>
                    <span className="text-xs text-white/40 ml-auto">{selectedDetails.currentAvg != null ? `Current: ${Math.round(selectedDetails.currentAvg)}%` : "No grades"}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedDetails.courseGrades.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                        <div>
                          <p className="text-white/80">{g.name || g.assignment_name}</p>
                          <p className="text-[10px] text-white/30">{g.weight}% of final grade</p>
                        </div>
                        <span className={`font-mono tabular-nums font-medium ${
                          g.score >= 80 ? "text-emerald-400" : g.score >= 60 ? "text-amber-300" : "text-red-400"
                        }`}>
                          {formatGrade(g.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade Needed Calculator */}
              {selectedDetails && selectedDetails.remainingWeight > 0 && gradeNeeded && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Grade Needed on Remaining {selectedDetails.remainingWeight}%</h3>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {gradeNeeded.map((g) => (
                      <div key={g.target} className="text-center rounded-lg border border-white/10 bg-white/5 p-2.5">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">{g.target}%</p>
                        <p className={`text-xs font-mono font-semibold tabular-nums mt-1 ${
                          g.needed <= 50 ? "text-emerald-400" : g.needed <= 75 ? "text-amber-300" : "text-red-400"
                        }`}>
                          {formatGrade(g.needed)}
                        </p>
                        <p className="text-[8px] text-white/30 mt-0.5">needed</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Chart */}
              {selectedDetails && selectedDetails.courseGrades.length > 1 && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Performance</h3>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedDetails.courseGrades} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v) => `${v.toFixed(1)}%`}
                          contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }}
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {selectedDetails.courseGrades.map((entry, i) => (
                            <Cell key={i} fill={entry.score >= 80 ? "#00E5A0" : entry.score >= 60 ? "#3B82F6" : entry.score >= 50 ? "#F59E0B" : "#FF4D4D"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}