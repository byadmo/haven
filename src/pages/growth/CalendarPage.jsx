import React from "react";
import GrowthCalendar from "@/components/growth/GrowthCalendar";

export default function CalendarPage() {
  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Calendar</h1>
        <p className="text-sm text-white/50 mt-1">View your habit completion history day by day.</p>
      </div>
      <GrowthCalendar />
    </div>
  );
}