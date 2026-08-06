import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Home, PlusCircle, CornerDownLeft, Activity, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIONS = [
  { id: "overview", label: "Go to Overview", hint: "Dashboard", icon: Home, to: "/" },
  { id: "cashflow", label: "Go to Cash Flow", hint: "Income & expenses", icon: Activity, to: "/cashflow" },
  { id: "portfolio", label: "Go to Portfolio", hint: "Holdings & P&L", icon: Briefcase, to: "/portfolio" },
  { id: "add-txn", label: "Add Transaction", hint: "Quick add", icon: PlusCircle, action: "add-txn" },
];

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase().trim()) ||
    a.hint.toLowerCase().includes(query.toLowerCase().trim())
  );

  function run(action) {
    setOpen(false);
    if (action.to) {
      navigate(action.to);
      return;
    }
    if (action.action === "add-txn") {
      if (location.pathname === "/") {
        window.dispatchEvent(new CustomEvent("dd:quickadd"));
      } else {
        navigate("/?add=1");
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-8 w-32 rounded-md border border-white/10 bg-transparent px-2.5 text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/25 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, filtered.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (filtered[active]) run(filtered[active]);
                    } else if (e.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                  placeholder="Jump to a screen or log a transaction…"
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
                />
                <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">esc</kbd>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-600">No matches.</p>
                ) : (
                  filtered.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => run(a)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                          i === active ? "bg-indigo-500/15 text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className={`h-7 w-7 rounded-md flex items-center justify-center ${i === active ? "bg-indigo-500/30 text-indigo-200" : "bg-zinc-800 text-zinc-400"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{a.label}</span>
                          <span className="block text-[11px] text-zinc-500">{a.hint}</span>
                        </span>
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-500" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}