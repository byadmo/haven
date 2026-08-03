import React from "react";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO, format, subMonths,
} from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const money = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: format(d, "MMMM yyyy") });
  }
  return opts;
}

export default function MonthlyReport() {
  const MONTHS = React.useMemo(buildMonthOptions, []);
  const [month, setMonth] = React.useState(MONTHS[0].value);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");

  async function generate() {
    setBusy(true);
    setStatus("Gathering your data…");
    try {
      const [year, m] = month.split("-").map(Number);
      const anchor = new Date(year, m - 1, 1);
      const start = startOfMonth(anchor);
      const end = endOfMonth(anchor);

      const [txns, payments, debts] = await Promise.all([
        base44.entities.Transaction.list("-date", 5000),
        base44.entities.DebtPayment.list("-date", 5000),
        base44.entities.Debt.list("-created_date"),
      ]);

      let income = 0, expenses = 0;
      const monthTxns = [];
      txns.forEach((t) => {
        try {
          if (!isWithinInterval(parseISO(t.date), { start, end })) return;
        } catch { return; }
        if (t.type === "income") income += t.amount || 0;
        else expenses += t.amount || 0;
        monthTxns.push(t);
      });

      const monthPayments = payments.filter((p) => {
        try { return isWithinInterval(parseISO(p.date), { start, end }); } catch { return false; }
      });
      const totalPaid = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

      const savings = income - expenses;
      const monthLabel = format(anchor, "MMMM yyyy");

      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = doc.internal.pageSize.getWidth();
      let y = 56;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15);
      doc.text("Monthly Financial Summary", 40, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(monthLabel, 40, y);
      y += 26;

      const section = (title) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15);
        doc.text(title, 40, y);
        y += 6;
        doc.setDrawColor(220);
        doc.line(40, y, W - 40, y);
        y += 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40);
      };

      const line = (k, v, vColor) => {
        doc.text(k, 40, y);
        if (vColor) doc.setTextColor(vColor);
        doc.text(v, W - 40, y, { align: "right" });
        doc.setTextColor(40);
        y += 22;
      };

      section("Overview");
      line("Total Income", money(income), 22);
      line("Total Expenses", money(expenses), 180);
      line("Net Savings", money(savings), savings < 0 ? 200 : 22);
      y += 10;
      line("Transactions Logged", String(monthTxns.length));
      y += 6;

      section("Debt Repayment Progress");
      line("Total Paid This Month", money(totalPaid), 22);
      const paidByDebt = {};
      monthPayments.forEach((p) => { paidByDebt[p.debt_id] = (paidByDebt[p.debt_id] || 0) + (p.amount || 0); });
      if (debts.length) {
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("Liability", 40, y);
        doc.text("Balance · % Paid", W - 40, y, { align: "right" });
        y += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40);
        debts.forEach((d) => {
          const name = (d.name || "Untitled").slice(0, 34);
          const bal = d.current_balance || 0;
          const orig = d.original_balance || bal;
          const pct = orig > 0 ? Math.max(0, Math.min(100, Math.round((1 - bal / orig) * 100))) : 0;
          doc.text(name, 40, y);
          doc.text(`${money(bal)} · ${pct}% paid`, W - 40, y, { align: "right" });
          y += 19;
          if (paidByDebt[d.id] > 0) {
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`  paid this month: ${money(paidByDebt[d.id])}`, 44, y);
            y += 14;
            doc.setFontSize(11);
            doc.setTextColor(40);
          }
          if (y > 740) { doc.addPage(); y = 56; }
        });
      }

      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(160);
      doc.text(`Generated by DebtFlow · ${format(new Date(), "MMM d, yyyy")}`, 40, y);

      doc.save(`monthly-summary-${month}.pdf`);
      setStatus("Report downloaded.");
    } catch (e) {
      setStatus("Could not generate report: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Monthly Report</h3>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Download a PDF summary of your income, expenses, and debt repayment progress for any month to track long-term improvement.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="bg-zinc-950 border-white/10 text-zinc-100 h-10 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 max-h-72">
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={busy} className="bg-indigo-600 hover:bg-indigo-500 text-white h-10">
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          {busy ? "Generating…" : "Download PDF"}
        </Button>
      </div>

      {status && <p className="text-xs text-zinc-400 mt-3">{status}</p>}
    </div>
  );
}