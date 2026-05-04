"use client";

import * as React from "react";
import { IconCalendar, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getPresetRange } from "@/app/services/dashboardApi";
import { cn } from "@/lib/utils";

const PRESETS = [
  { key: "7d",         label: "7 days" },
  { key: "30d",        label: "30 days" },
  { key: "this_month", label: "This month" },
  { key: "3m",         label: "3 months" },
  { key: "all",        label: "All time" },
];

function fmtDisplay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DateRangeToolbar({
  dateRange,
  setDateRange,
  activePreset,
  setActivePreset,
  loading,
  refresh,
}) {
  const [customFrom, setCustomFrom] = React.useState(dateRange.from);
  const [customTo, setCustomTo] = React.useState(dateRange.to);
  const [open, setOpen] = React.useState(false);

  function applyPreset(key) {
    const range = getPresetRange(key);
    setActivePreset(key);
    setDateRange(range);
    setCustomFrom(range.from);
    setCustomTo(range.to);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    if (new Date(customFrom) > new Date(customTo)) return;
    setActivePreset("custom");
    setDateRange({ from: customFrom, to: customTo });
    setOpen(false);
  }

  const isCustom = activePreset === "custom";

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              activePreset === p.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 text-sm",
              isCustom && "border-primary text-primary"
            )}
          >
            <IconCalendar className="size-3.5" />
            {isCustom
              ? `${fmtDisplay(dateRange.from)} – ${fmtDisplay(dateRange.to)}`
              : "Custom range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Custom date range</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="custom-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="custom-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                max={new Date().toISOString().slice(0, 10)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1"
                onClick={applyCustom}
                disabled={!customFrom || !customTo || new Date(customFrom) > new Date(customTo)}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active range label */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {fmtDisplay(dateRange.from)} – {fmtDisplay(dateRange.to)}
      </span>

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto size-8"
        onClick={refresh}
        disabled={loading}
        title="Refresh"
      >
        <IconRefresh className={cn("size-4", loading && "animate-spin")} />
      </Button>
    </div>
  );
}