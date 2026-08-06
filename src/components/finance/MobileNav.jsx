import React, { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PiggyBank,
  Ellipsis,
  LineChart,
  PieChart,
  Sparkles,
  Wallet,
  Gauge,
  Activity,
  Briefcase,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const primary = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/budgeting", label: "Goals", icon: PiggyBank },
];

const secondary = [
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/cashflow", label: "Cash Flow", icon: Activity },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/forecast", label: "Forecast", icon: LineChart },
  { to: "/credit-utilization", label: "Credit Util.", icon: Gauge },
  { to: "/assistant", label: "Ask Wei", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const isItemActive = (to, end, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  const moreActive = secondary.some((s) => location.pathname === s.to);
  const primaryActiveIdx = primary.findIndex((p) =>
    isItemActive(p.to, p.end, location.pathname)
  );
  // Index into the 6-slot row (5 primary + More). -1 means none active.
  const activeIndex =
    primaryActiveIdx >= 0 ? primaryActiveIdx : moreActive ? primary.length : -1;

  const [pill, setPill] = useState({ x: 0, w: 0, visible: false });

  const measure = () => {
    const cont = containerRef.current;
    const node = itemRefs.current[activeIndex];
    if (!cont || !node || activeIndex < 0) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }
    const contRect = cont.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    setPill({
      x: nodeRect.left - contRect.left,
      w: nodeRect.width,
      visible: true,
    });
  };

  // Measure on the next animation frame so the browser has painted the
  // indicator at its OLD position first — this guarantees the CSS transform
  // transition fires (the pill slides) instead of snapping to the new spot.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
     
  }, [activeIndex]);

  // Re-measure (debounced) on resize/orientation change so the pill stays aligned.
  useLayoutEffect(() => {
    let t;
    let raf;
    const handler = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        raf = requestAnimationFrame(measure);
      }, 200);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
     
  }, [activeIndex]);

  const iconClass = (isActive) =>
    `relative h-[18px] w-[18px] transition-colors duration-200 ease-out ${
      isActive ? "text-emerald-300" : "text-white/45"
    }`;

  return (
    <>
      <nav
        className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        aria-label="Primary"
      >
        <div
          ref={containerRef}
          className="pointer-events-auto relative flex items-center justify-between rounded-full border border-white/10 bg-black/75 px-2"
          style={{
            height: 56,
            width: "min(94vw, 392px)",
            borderRadius: 999,
            boxShadow:
              "0 10px 30px -8px rgba(0,0,0,0.6), 0 2px 8px -4px rgba(0,0,0,0.4)",
          }}
        >
          {/* Sliding active indicator — animated via transform only. */}
          {pill.visible && (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full border border-emerald-400/30 bg-emerald-500/15"
              style={{
                top: 4,
                bottom: 4,
                left: 0,
                width: Math.max(pill.w - 8, 0),
                borderRadius: 999,
                transform: `translateX(${pill.x + 4}px)`,
                transition:
                  "transform 250ms cubic-bezier(0.4,0,0.2,1), width 250ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          )}

          {primary.map(({ to, label, icon: Icon, end }, i) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              ref={(el) => (itemRefs.current[i] = el)}
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              {({ isActive }) => (
                <Icon className={iconClass(isActive)} strokeWidth={1.75} />
              )}
            </NavLink>
          ))}

          {/* More button → secondary pages */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            ref={(el) => (itemRefs.current[primary.length] = el)}
            className="relative grid place-items-center rounded-full"
            style={{ height: 48, width: 48 }}
          >
            <Ellipsis
              className={iconClass(moreActive)}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-sm font-mono tracking-tight text-zinc-100">
              <Wallet className="h-4 w-4 text-emerald-400" /> More
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-6 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
            {secondary.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <button
                  key={to}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(to);
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-colors ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-black text-zinc-300 hover:border-white/25"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}