import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2, CheckCircle2, Trash2, Plus } from "lucide-react";

const DAYS = ["M", "T", "W", "Th", "F", "S", "Su"];
const TYPES = ["assignment", "exam", "quiz", "project", "midterm", "final", "lab", "other"];

export default function SyllabusUpload({ onConfirmed }) {
  const [file, setFile] = React.useState(null);
  const [status, setStatus] = React.useState("idle"); // idle | uploading | parsing | review | error
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    setStatus("uploading");
    setError("");
    try {
      const up = await base44.integrations.Core.UploadFile({ file: f });
      setStatus("parsing");
      const parsed = await base44.functions.invoke("parseSyllabus", { file_url: up.file_url });
      const out = parsed?.data ?? parsed;
      setData({
        code: out?.code || "",
        title: out?.title || "",
        professor_name: out?.professor_name || "",
        professor_email: out?.professor_email || "",
        office_hours: out?.office_hours || "",
        schedule_days: out?.schedule_days || [],
        schedule_time: out?.schedule_time || "",
        location: out?.location || "",
        target_weekly_hours: out?.target_weekly_hours || 6,
        credits: out?.credits || 3,
        deliverables: (out?.deliverables || []).map((d) => ({
          title: d.title || "",
          due_date: (d.due_date || "").slice(0, 10),
          weight: Number(d.weight) || 0,
          type: TYPES.includes(d.type) ? d.type : "assignment",
          is_exam: !!d.is_exam,
        })),
        materials: (out?.materials || []).map((m) => ({
          title: m.title || "",
          estimated_cost: Number(m.estimated_cost) || 0,
          required: m.required !== false,
        })),
      });
      setStatus("review");
    } catch (e) {
      setError(e?.message || "Could not parse syllabus");
      setStatus("error");
    }
  }

  function toggleDay(d) {
    setData((p) => {
      const has = p.schedule_days.includes(d);
      return { ...p, schedule_days: has ? p.schedule_days.filter((x) => x !== d) : [...p.schedule_days, d] };
    });
  }

  function confirm() {
    onConfirmed(data);
  }

  if (status === "review" && data) {
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4" /> Review extracted data
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-1"><Label className="text-white/50 text-xs">Code</Label><Input value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} className="bg-black border-white/10" /></div>
          <div className="col-span-1"><Label className="text-white/50 text-xs">Title</Label><Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Professor</Label><Input value={data.professor_name} onChange={(e) => setData({ ...data, professor_name: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Email</Label><Input value={data.professor_email} onChange={(e) => setData({ ...data, professor_email: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Office Hours</Label><Input value={data.office_hours} onChange={(e) => setData({ ...data, office_hours: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Time</Label><Input value={data.schedule_time} onChange={(e) => setData({ ...data, schedule_time: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Location</Label><Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Credits</Label><Input type="number" value={data.credits} onChange={(e) => setData({ ...data, credits: Number(e.target.value) })} className="bg-black border-white/10" /></div>
        </div>
        <div>
          <Label className="text-white/50 text-xs">Schedule days</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DAYS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)} className={`h-8 w-10 rounded-md border text-xs ${data.schedule_days.includes(d) ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50"}`}>{d}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Deliverables ({data.deliverables.length})</p>
          <div className="space-y-2">
            {data.deliverables.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                <Input className="col-span-5 bg-black border-white/10" value={d.title} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, title: e.target.value }; setData({ ...data, deliverables: a }); }} placeholder="Title" />
                <Input type="date" className="col-span-3 bg-black border-white/10" value={d.due_date} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, due_date: e.target.value }; setData({ ...data, deliverables: a }); }} />
                <Input type="number" className="col-span-2 bg-black border-white/10" value={d.weight} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, weight: Number(e.target.value) }; setData({ ...data, deliverables: a }); }} />
                <button onClick={() => setData({ ...data, deliverables: data.deliverables.filter((_, j) => j !== i) })} className="col-span-2 text-white/40 hover:text-rose-400 text-xs flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" />{d.weight}%</button>
              </div>
            ))}
            <button onClick={() => setData({ ...data, deliverables: [...data.deliverables, { title: "", due_date: "", weight: 0, type: "assignment", is_exam: false }] })} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Add deliverable</button>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Materials ({data.materials.length})</p>
          <div className="space-y-2">
            {data.materials.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                <Input className="col-span-7 bg-black border-white/10" value={m.title} onChange={(e) => { const a = [...data.materials]; a[i] = { ...m, title: e.target.value }; setData({ ...data, materials: a }); }} placeholder="Material title" />
                <Input type="number" className="col-span-3 bg-black border-white/10" value={m.estimated_cost} onChange={(e) => { const a = [...data.materials]; a[i] = { ...m, estimated_cost: Number(e.target.value) }; setData({ ...data, materials: a }); }} />
                <button onClick={() => setData({ ...data, materials: data.materials.filter((_, j) => j !== i) })} className="col-span-2 text-white/40 hover:text-rose-400 flex justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button onClick={() => setData({ ...data, materials: [...data.materials, { title: "", estimated_cost: 0, required: true }] })} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Add material</button>
          </div>
        </div>

        <Button onClick={confirm} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">Save course</Button>
      </div>
    );
  }

  return (
    <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400/40 transition-colors">
      <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {status === "uploading" || status === "parsing" ? (
        <>
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-white/60">{status === "uploading" ? "Uploading syllabus…" : "Parsing with AI…"}</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-8 w-8 text-emerald-400/70" />
          <p className="text-sm text-white/60">Drag & drop or click to upload a syllabus</p>
          <p className="text-[10px] uppercase tracking-widest text-white/30">PDF · DOCX · TXT</p>
          {file && <p className="text-xs text-white/40 mt-1">{file.name}</p>}
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </>
      )}
    </label>
  );
}