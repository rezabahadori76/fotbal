"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { moodEmoji, moodText, scoreLabel, wellnessReadiness } from "@/lib/performance";

type WellnessReportData = {
  id: string;
  reportDate: Date | string;
  createdAt: Date | string;
  mood: number;
  energy: number;
  sleep: number;
  stress: number;
  soreness: number;
  restingHeartRate: number | null;
  comment: string | null;
};

export function WellnessReportCard({ report }: { report: WellnessReportData }) {
  const [expanded, setExpanded] = useState(false);
  const readiness = wellnessReadiness(report);

  return (
    <div className="rounded-2xl border border-card-border bg-background/50 p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Wellness Report</h2>
          <p className="text-sm text-muted">
            Submitted at{" "}
            {new Date(report.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold border border-card-border text-foreground hover:bg-card/80"
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center gap-2 h-[84px]">
          <span className="text-xs font-semibold">
            {new Date(report.reportDate).toLocaleDateString("en-US")}
          </span>
        </div>
        <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center gap-2 h-[84px]">
          <span className="text-2xl">{moodEmoji(report.mood)}</span>
          <span className="text-xs font-semibold text-muted">{moodText(report.mood)}</span>
        </div>
        <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center h-[84px]">
          <span className="text-[11px] font-bold">{readiness}%</span>
          <span className="text-[10px] text-muted uppercase">Readiness</span>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Energy", value: report.energy, colorClass: "bg-warning" },
            { label: "Sleep", value: report.sleep, colorClass: "bg-accent" },
            { label: "Stress", value: report.stress, colorClass: "bg-warning" },
            { label: "Soreness", value: report.soreness, colorClass: "bg-accent" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl bg-card border border-card-border/50 p-2.5 flex flex-col h-[84px]"
            >
              <p className="text-[11px] font-semibold text-foreground mb-1">{metric.label}</p>
              <p
                className={cn(
                  "text-lg font-bold mb-auto",
                  metric.colorClass.replace("bg-", "text-"),
                )}
              >
                {metric.value}
              </p>
              <div className="w-full h-1 bg-background rounded-full overflow-hidden mb-2">
                <div
                  className={cn("h-full", metric.colorClass)}
                  style={{ width: `${(metric.value / 10) * 100}%` }}
                />
              </div>
              <div
                className={cn(
                  "rounded-sm px-1 py-0.5 text-[8px] font-bold text-center uppercase tracking-tighter truncate",
                  metric.colorClass.replace("bg-", "text-"),
                  metric.colorClass.replace("bg-", "bg-").concat("/20"),
                )}
              >
                {scoreLabel(metric.label, metric.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && report.restingHeartRate != null && (
        <p className="mt-3 text-sm text-muted">Resting HR: {report.restingHeartRate} bpm</p>
      )}

      {expanded && report.comment && (
        <div className="mt-3 p-3 rounded-xl bg-card border border-card-border/50">
          <p className="text-xs font-semibold text-muted mb-1">Comment</p>
          <p className="text-sm">{report.comment}</p>
        </div>
      )}
    </div>
  );
}
