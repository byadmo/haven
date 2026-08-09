import React, { useState, useMemo } from "react";
import { BookOpen, BarChart3, GraduationCap, ExternalLink, Calculator, Brain } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import CourseCard from "@/components/edu/CourseCard";
import CourseOutline from "@/components/edu/CourseOutline";
import CourseDetailDialog from "@/components/edu/CourseDetailDialog";
import EduAssistant from "@/components/edu/EduAssistant";

function formatGrade(v) {
  return v != null ? `${v.toFixed(1)}%` : "—";
}

export default function EduVault() {
  const { activeSemester, courses, materials, grades } = useEduSync();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailCourse, setDetailCourse] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  const courseList = useMemo(() => {
    return (courses || []).map((c) => {
      const courseGrades = (grades || []).filter((g) => g.course_id === c.id);
      const weighted = courseGrades.reduce((s, g) => s + (g.score || 0) * ((g.weight || 0) / 100), 0);
      const totalWeight = courseGrades.reduce((s, g) => s + (g.weight || 0), 0);
      return { ...c, currentGrade: totalWeight > 0 ? weighted / (totalWeight / 100) : null, gradeCount: courseGrades.length };
    });
  }, [courses, grades]);

  const selectedDetails = useMemo(() => {
    if (!selectedCourse) return null;
    const courseGrades = (grades || []).filter((g) => g.course_id === selectedCourse.id);
    const remainingWeight = 100 - courseGrades.reduce((s, g) => s + (g.weight || 0), 0);
    return { courseGrades, remainingWeight, currentAvg: selectedCourse.currentGrade || 0 };
  }, [selectedCourse, grades]);

  const gradeNeeded = useMemo(() => {
    if (!selectedDetails) return null;
    const { currentAvg, remainingWeight } = selectedDetails;
    if (remainingWeight <= 0) return null;
    return [50, 60, 70, 80, 90].map((target) => ({
      target,
      needed: Math.min(Math.max((target - ((100 - remainingWeight) > 0 ? currentAvg * ((100 - remainingWeight) / 100) : 0)) / (remainingWeight / 100), 0), 100),
    }));
  }, [selectedDetails]);

  return (
    <div className="dd-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Academic Vault</h1>
          <p className="text-sm text-white/50 mt-1">Courses, grades, and performance analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className={`h-8 px-3 rounded-lg text-xs transition-colors ${viewMode === "grid" ? "bg-indigo-500/10 border border-indigo-400/30 text-indigo-300" : "border border-white/10 text-white/40 hover:text-white"}`}>
            Grid
          </button>
          <button onClick={() => setViewMode("list")} className={`h-8 px-3 rounded-lg text-xs transition-colors ${viewMode === "list" ? "bg-indigo-500/10 border border-indigo-400/30 text-indigo-300" : "border border-white/10 text-white/40 hover:text-white"}`}>
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Course Selection */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Courses</p>
          {courseList.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black p-6 text-center">
              <BookOpen className="h-6 w-6 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/40">No courses yet.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-3">
              {courseList.map((c) => (
                <div key={c.id} className="cursor-pointer" onClick={() => { setSelectedCourse(c); setDetailCourse(c); }}>
                  <CourseCard course={c} onOpen={setDetailCourse} />
                </div>
              ))}
            </div>
          ) : (
            courseList.map((c) => {
              const isSelected = selectedCourse?.id === c.id;
              const gradeColor = c.currentGrade >= 80 ? "border-emerald-400/30 text-emerald-300" : c.currentGrade >= 60 ? "border-amber-400/30 text-amber-300" : c.currentGrade != null ? "border-red-400/30 text-red-300" : "border-white/10 text-white/40";
              return (
                <button key={c.id} onClick={() => setSelectedCourse(c)}
                  className={`w-full text-left rounded-xl border transition-colors p-4 ${isSelected ? "border-indigo-400/40 bg-indigo-500/10" : "border-white/10 bg-black hover:border-white/20"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name || c.code}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{c.code || c.professor || "—"}</p>
                    </div>
                    <div className={`ml-3 shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold ${gradeColor}`}>
                      {c.currentGrade != null ? `${Math.round(c.currentGrade)}%` : "—"}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* AI Assistant */}
          <div className="rounded-xl border border-white/10 bg-black p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-3.5 w-3.5 text-emerald-400" />
              <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">AI Tutor</p>
            </div>
            <EduAssistant scope="courses" />
          </div>
        </div>

        {/* Course Details */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCourse ? (
            <div className="rounded-2xl border border-white/10 bg-black p-12 text-center">
              <GraduationCap className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Select a course to view grades, analytics, and materials.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedCourse.name}</h2>
                    <p className="text-xs text-white/50 mt-1">{selectedCourse.code} · {selectedCourse.professor || "—"}</p>
                  </div>
                  {selectedCourse.syllabus_url && (
                    <a href={selectedCourse.syllabus_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200">
                      <ExternalLink className="h-3 w-3" /> Syllabus
                    </a>
                  )}
                </div>
                {selectedCourse.schedule?.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-[11px] text-white/40">
                    {selectedCourse.schedule.map((s, i) => (
                      <span key={i} className="bg-white/5 rounded-md px-2 py-1">{s.day} {s.start}:00–{s.end}:00</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Course Outline */}
              <CourseOutline course={selectedCourse} materials={materials || []} />

              {/* Grade Breakdown */}
              {selectedDetails?.courseGrades?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Grade Breakdown</h3>
                    <span className="text-xs text-white/40 ml-auto">{selectedDetails.currentAvg != null ? `Current: ${Math.round(selectedDetails.currentAvg)}%` : "—"}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedDetails.courseGrades.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                        <div><p className="text-white/80">{g.name || g.assignment_name}</p><p className="text-[10px] text-white/30">{g.weight}% of grade</p></div>
                        <span className={`font-mono font-medium ${g.score >= 80 ? "text-emerald-400" : g.score >= 60 ? "text-amber-300" : "text-red-400"}`}>{formatGrade(g.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade Needed Calculator */}
              {gradeNeeded && (
                <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Grade Needed on Remaining {selectedDetails?.remainingWeight}%</h3>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {gradeNeeded.map((g) => (
                      <div key={g.target} className="text-center rounded-lg border border-white/10 bg-white/5 p-2.5">
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">{g.target}%</p>
                        <p className={`text-xs font-mono font-semibold mt-1 ${g.needed <= 50 ? "text-emerald-400" : g.needed <= 75 ? "text-amber-300" : "text-red-400"}`}>{formatGrade(g.needed)}</p>
                        <p className="text-[8px] text-white/30">needed</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Chart */}
              {selectedDetails?.courseGrades?.length > 1 && (
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
                        <Tooltip formatter={(v) => `${typeof v === 'number' ? v.toFixed(1) : v}%`} contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
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

      {/* Course Detail Dialog */}
      {detailCourse && (
        <CourseDetailDialog
          course={detailCourse}
          open={!!detailCourse}
          onOpenChange={(o) => { if (!o) setDetailCourse(null); }}
        />
      )}
    </div>
  );
}