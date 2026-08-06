import React from "react";
import { Mail, Clock, User } from "lucide-react";

export default function ProfessorContact({ course }) {
  if (!course) return null;
  const email = course.professor_email;
  const subject = encodeURIComponent(`${course.code} — ${course.title}`);
  const body = encodeURIComponent(`Hi ${course.professor_name || "Professor"},\n\n`);
  const href = email ? `mailto:${email}?subject=${subject}&body=${body}` : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Professor Quick-Contact</p>
      </div>
      <p className="text-sm font-semibold text-zinc-100">{course.professor_name || "Not set"}</p>
      {course.office_hours && (
        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-white/50">
          <Clock className="h-3 w-3 mt-0.5 shrink-0" /> <span className="font-mono leading-snug">{course.office_hours}</span>
        </div>
      )}
      {email ? (
        <a
          href={href}
          className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <Mail className="h-3.5 w-3.5" /> Email Professor
        </a>
      ) : (
        <p className="text-[11px] text-amber-300/80 mt-2">Add professor email in course settings.</p>
      )}
    </div>
  );
}