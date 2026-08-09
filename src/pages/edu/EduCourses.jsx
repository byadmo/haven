import React from "react";
import { BookOpen, Plus, DollarSign, ArrowRight, ListPlus } from "lucide-react";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import { Button } from "@/components/ui/button";
import CourseCard from "@/components/edu/CourseCard";
import CourseFormModal from "@/components/edu/CourseFormModal";
import CourseDetailDialog from "@/components/edu/CourseDetailDialog";
import QuickAddCourses from "@/components/edu/QuickAddCourses";
import { useEduSync } from "@/lib/eduSyncContext";
import WorkStudyBalance from "@/components/edu/WorkStudyBalance";
import EduAssistant from "@/components/edu/EduAssistant";
import { useToast } from "@/components/ui/use-toast";

export default function EduCourses() {
  const { activeSemester, courses, materials, updateSettings, settings } = useEduSync();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [detailCourse, setDetailCourse] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editCourse, setEditCourse] = React.useState(null);

  const requiredMaterials = materials.filter((m) => m.required);
  const textbookTotal = requiredMaterials.reduce((s, m) => s + (m.estimated_cost || 0), 0);
  const allTotal = materials.reduce((s, m) => s + (m.estimated_cost || 0), 0);

  // Work-study balance
  const totalStudy = courses.reduce((s, c) => s + (c.target_weekly_hours || 0), 0);
  const classHours = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const sleep = settings?.weekly_sleep_hours ?? 56;
  const maxWork = Math.max(0, Math.floor((168 - totalStudy - sleep - classHours) / 2));

  return (
    <>
      <EduTopBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <PageTitle title="Courses" subtitle={activeSemester ? `${activeSemester.term_label}` : "No active semester"} icon={BookOpen} />
          <div className="flex items-center gap-2">
            <Button onClick={() => setQuickAddOpen(true)} variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10">
              <ListPlus className="h-4 w-4" /> Quick Add
            </Button>
            <Button onClick={() => setAddOpen(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="h-4 w-4" /> Add Course
            </Button>
          </div>
        </div>

        {/* Work-study balance (backend + AI health) */}
        <Reveal>
          <WorkStudyBalance />
        </Reveal>

        {/* Textbook costs */}
        <Reveal delay={0.04}>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] uppercase tracking-widest text-white/50">Textbook Costs</p>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">${textbookTotal.toFixed(2)}</p>
            <p className="text-[11px] text-white/40 mt-1">{requiredMaterials.length} required materials · ${(allTotal - textbookTotal).toFixed(2)} optional</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 w-full"
              onClick={() => toast({ title: "Push to Finance", description: "Textbook expense will be created in Haven Finance (coming soon)." })}
            >
              Push to Finance <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Courses */}
          <div className="lg:col-span-8">
            {courses.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((c, i) => (
                  <Reveal key={c.id} delay={i * 0.03}><CourseCard course={c} onOpen={setDetailCourse} /></Reveal>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-black p-12 text-center">
                <BookOpen className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/50">No courses yet for this semester.</p>
                <Button onClick={() => setAddOpen(true)} className="mt-4 bg-emerald-500 text-black hover:bg-emerald-400"><Plus className="h-4 w-4" /> Add your first course</Button>
              </div>
            )}
          </div>

          {/* AI side panel */}
          <div className="lg:col-span-4">
            <Reveal><EduAssistant scope="courses" /></Reveal>
          </div>
        </div>
      </main>
      <EduBottomNav />

      <CourseFormModal open={addOpen} onOpenChange={setAddOpen} semesterId={activeSemester?.id} semesterStart={activeSemester?.start_date} />
      <QuickAddCourses open={quickAddOpen} onOpenChange={setQuickAddOpen} semesterId={activeSemester?.id} />
      <CourseFormModal open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditCourse(null); }} course={editCourse} semesterId={editCourse?.semester_id || activeSemester?.id} semesterStart={activeSemester?.start_date} />
      <CourseDetailDialog course={detailCourse} open={!!detailCourse} onOpenChange={(o) => !o && setDetailCourse(null)} onEditCourse={(c) => { setDetailCourse(null); setEditCourse(c); setEditOpen(true); }} />
    </>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 p-2">
      <p className="text-sm font-mono tabular-nums text-zinc-100">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}