import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";

export default function Education() {
  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <main className="relative max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
        <Link to="/" className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Haven Hub
        </Link>
        <PageTitle title="Haven Education" subtitle="Your learning workspace" icon={GraduationCap} />
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-12 sm:p-16 text-center">
            <div className="h-12 w-12 mx-auto grid place-items-center rounded-xl border border-sky-400/30 bg-sky-500/10 mb-4">
              <GraduationCap className="h-6 w-6 text-sky-300" strokeWidth={1.75} />
            </div>
            <p className="text-lg font-semibold tracking-tight text-white">Coming Soon</p>
            <p className="text-xs text-white/50 mt-2 max-w-sm mx-auto leading-relaxed">
              Haven Education is on its way. Check back here once content is ready.
            </p>
          </div>
        </Reveal>
      </main>
    </div>
  );
}