import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function NavDropdown({ label, items }) {
  const location = useLocation();
  const navigate = useNavigate();
  const anyActive = items.some((it) =>
    it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`px-2 py-1.5 text-[11px] font-mono uppercase tracking-wide transition-colors duration-150 flex items-center gap-1 ${
            anyActive
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-zinc-400 hover:text-white border-b-2 border-transparent"
          }`}
        >
          {label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="z-50 min-w-[180px] rounded-md border border-white/15 bg-zinc-950 p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1"
        >
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = it.end ? location.pathname === it.to : location.pathname.startsWith(it.to);
            return (
              <DropdownMenu.Item
                key={it.to}
                onSelect={() => navigate(it.to)}
                className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[11px] font-mono uppercase tracking-wide cursor-pointer outline-none ${
                  isActive
                    ? "text-emerald-400 bg-white/5"
                    : "text-zinc-200 data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {it.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}