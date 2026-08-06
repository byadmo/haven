import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const RANGES = [
  { value: "month", label: "This Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

function inRange(date, range) {
  const d = new Date((date || "") + "T00:00:00");
  if (isNaN(d)) return false;
  const now = new Date();
  if (range === "all") return true;
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === "3m") { const c = new Date(); c.setMonth(c.getMonth() - 3); return d >= c; }
  if (range === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

export default function TransactionCsvExport({ transactions }) {
  const { toast } = useToast();
  const [range, setRange] = useState("month");

  function exportCsv() {
    const rows = (transactions || [])
      .filter((t) => inRange(t.date, range))
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const header = ["Date", "Description", "Amount", "Type", "Category", "Account", "Currency_Note"];
    const lines = [header.join(",")];
    rows.forEach((t) => {
      const cells = [
        t.date || "",
        `"${(t.description || "").replace(/"/g, '""')}"`,
        t.amount || 0,
        t.type || "",
        `"${(t.category || "").replace(/"/g, '""')}"`,
        `"${(t.account_id || "").replace(/"/g, '""')}"`,
        "amounts are plain numbers",
      ];
      lines.push(cells.join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${rows.length} transaction${rows.length === 1 ? "" : "s"} to CSV` });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={range}
        onChange={(e) => setRange(e.target.value)}
        className="h-9 rounded-md border border-white/10 bg-black px-2 text-xs text-white"
        aria-label="Export date range"
      >
        {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <Button size="sm" onClick={exportCsv} className="bg-emerald-500 text-black hover:bg-emerald-400">
        <Download className="h-3.5 w-3.5 mr-1" /> Export to CSV
      </Button>
    </div>
  );
}