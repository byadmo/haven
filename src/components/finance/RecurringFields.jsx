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
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Next Date</Label>
            <Input
              type="date"
              value={nextDate || ""}
              onChange={(e) => onNextDateChange(e.target.value)}
              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
            />
          </div>
        </div>
      )}
    </div>
  );
}