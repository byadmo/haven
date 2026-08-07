import React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const TERM_DEFAULTS = [
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "spring_summer", label: "Spring/Summer" },
];

function termLabel(term, year) {
  return term === "fall" ? `Fall ${year}` : term === "winter" ? `Winter ${year}` : `Spring/Summer ${year}`;
}

// Semester picker used as the first step of the Quick Add flow. Shows a dropdown
// of existing semesters (by term_label) plus a "Create New Semester" option that
// expands an inline create form. When no semesters exist yet, the create form is
// shown immediately with a "You need to create a semester first" prompt.
export default function SemesterSelect({ semesters, value, onSelect, createSemester }) {
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);
  const [term, setTerm] = React.useState("fall");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const hasSemesters = semesters.length > 0;
  const showForm = creating || !hasSemesters;

  async function handleCreate() {
    if (!startDate || !endDate) {
      toast({ title: "Start and end dates are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createSemester({
        term_type: term,
        year: Number(year) || new Date().getFullYear(),
        term_label: termLabel(term, year),
        start_date: startDate,
        end_date: endDate,
      });
      setCreating(false);
      setStartDate("");
      setEndDate("");
      if (created?.id) onSelect(created.id);
      toast({ title: "Semester created" });
    } catch (e) {
      toast({ title: "Could not create semester", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {hasSemesters && (
        <Select
          value={value || undefined}
          onValueChange={(v) => {
            if (v === "__new__") { setCreating(true); return; }
            setCreating(false);
            onSelect(v);
          }}
        >
          <SelectTrigger className="bg-black border-white/10">
            <span className={!value ? "text-white/40" : ""}>
              {semesters.find((s) => s.id === value)?.term_label || "Choose a semester…"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.term_label}</SelectItem>
            ))}
            <SelectItem value="__new__">
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Plus className="h-3.5 w-3.5" /> Create New Semester
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      )}

      {showForm && (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3 space-y-2.5">
          {!hasSemesters && (
            <p className="text-xs text-zinc-100">You need to create a semester first to add courses.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="bg-black border-white/10 h-9">
                  <span>{TERM_DEFAULTS.find((t) => t.value === term)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {TERM_DEFAULTS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-black border-white/10 h-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-black border-white/10 h-9" />
            </div>
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-black border-white/10 h-9" />
            </div>
          </div>
          <Button type="button" onClick={handleCreate} disabled={saving} size="sm" className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />} Create Semester
          </Button>
        </div>
      )}
    </div>
  );
}