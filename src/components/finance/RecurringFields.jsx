import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RecurringFields({
  scheduled,
  onScheduledChange,
  frequency,
  onFrequencyChange,
  nextDate,
  onNextDateChange,
  customInterval,
  onCustomIntervalChange,
  customUnit,
  onCustomUnitChange,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
        <div>
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Recurring</Label>
          <p className="text-[10px] text-white/40 mt-0.5">Repeats this transaction automatically</p>
        </div>
        <Switch checked={!!scheduled} onCheckedChange={onScheduledChange} />
      </div>
      {scheduled && (
        <React.Fragment>
          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Frequency</Label>
            <Select value={frequency} onValueChange={onFrequencyChange}>
              <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Every</Label>
                <Input
                  type="number"
                  min="1"
                  value={customInterval ?? ""}
                  onChange={(e) => onCustomIntervalChange?.(e.target.value)}
                  className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
                />
              </div>
              <div>
                <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Unit</Label>
                <Select value={customUnit} onValueChange={(v) => onCustomUnitChange?.(v)}>
                  <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Next Date</Label>
            <Input
              type="date"
              value={nextDate || ""}
              onChange={(e) => onNextDateChange?.(e.target.value)}
              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
            />
          </div>
        </React.Fragment>
      )}
    </div>
  );
}