import React from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard } from "lucide-react";

/**
 * Global keyboard shortcuts for finance pages.
 * - g o → /overview
 * - g a → /allocation
 * - g d → /debts
 * - g g → /goals
 * - g c → /credit-utilization
 * - g t → /transactions
 * - g b → /recurring-bills
 * - g s → /settings
 * - g h → /growth
 * - g e → /education
 * - g / → focus search bar
 * - ? → show shortcuts modal
 */
export default function useFinanceShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    let buffer = "";
    let timeout;

    function onKey(e) {
      // Don't capture when typing in an input
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((o) => !o);
        return;
      }

      // Accumulate "g" prefix
      if (e.key === "g") {
        buffer = "g";
        clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ""; }, 500);
        return;
      }

      // If buffer starts with "g", handle second key
      if (buffer === "g") {
        buffer = "";
        clearTimeout(timeout);
        const map = {
          o: "/overview",
          a: "/allocation",
          d: "/debts",
          g: "/goals",
          c: "/credit-utilization",
          t: "/transactions",
          b: "/recurring-bills",
          s: "/settings",
          h: "/growth",
          e: "/education",
          "/": "/overview", // g / → search
        };
        const dest = map[e.key];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        return;
      }

      buffer = "";
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const ShortcutsHelp = showHelp ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
        </div>
        <div className="space-y-2">
          {[
            ["g o", "Overview"],
            ["g a", "Allocation"],
            ["g d", "Debts"],
            ["g g", "Goals"],
            ["g c", "Credit Health"],
            ["g t", "Transactions"],
            ["g b", "Bills"],
            ["g s", "Settings"],
            ["g h", "Growth"],
            ["g e", "Education"],
            ["⌘K", "Command Palette"],
            ["?", "Toggle this help"],
          ].map(([shortcut, desc]) => (
            <div key={shortcut} className="flex items-center justify-between">
              <span className="text-xs text-zinc-300">{desc}</span>
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-mono">{shortcut}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return { ShortcutsHelp, showHelp, setShowHelp };
}