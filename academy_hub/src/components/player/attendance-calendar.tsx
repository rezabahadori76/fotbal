"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type CalendarAttendance = {
  id: string;
  status: string;
  eventDate: string;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function statusTone(status: string) {
  if (status === "ATTENDING") return "accent";
  if (status === "NOT_ATTENDING") return "danger";
  return "warning";
}

function EventDayIcon({ tone }: { tone: "accent" | "danger" | "warning" }) {
  const colors = {
    accent: "border-accent/50 text-accent bg-accent/15",
    danger: "border-danger/50 text-danger bg-danger/15",
    warning: "border-warning/50 text-warning bg-warning/15",
  };

  return (
    <div
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-sm border",
        colors[tone],
      )}
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current stroke-2">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
      </svg>
    </div>
  );
}

export function AttendanceCalendar({
  attendances,
  selectedDate,
  onSelectDate,
}: {
  attendances: CalendarAttendance[];
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarAttendance[]>();
    for (const row of attendances) {
      const key = row.eventDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [attendances]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const startOffset = (viewMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function pickDay(day: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const key = dateKey(d);
    onSelectDate(selectedDate === key ? null : key);
  }

  return (
    <div className="rounded-2xl border border-card-border/80 bg-background/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted">
          {today.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", year: "numeric" })}
        </span>
        <div className="flex items-center gap-3 text-sm font-bold">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full px-2 py-1 text-muted transition-colors hover:bg-card hover:text-foreground"
            aria-label="Previous month"
          >
            {"<"}
          </button>
          <span className="min-w-[7rem] text-center">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full px-2 py-1 text-muted transition-colors hover:bg-card hover:text-foreground"
            aria-label="Next month"
          >
            {">"}
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-bold text-foreground">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;

          const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
          const key = dateKey(cellDate);
          const rows = byDate.get(key) ?? [];
          const isToday = key === dateKey(today);
          const isSelected = key === selectedDate;
          const dominantStatus = rows[0]?.status ?? "PENDING";

          return (
            <button
              key={key}
              type="button"
              onClick={() => pickDay(day)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-1 transition-colors",
                isSelected && "bg-accent/15 ring-1 ring-accent/40",
                isToday && !isSelected && "bg-card/80",
                rows.length > 0 && "hover:bg-card/60",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "font-bold text-accent",
                  isSelected && "bg-accent text-background font-bold",
                )}
              >
                {day}
              </span>
              {rows.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {rows.slice(0, 2).map((row) => (
                    <EventDayIcon key={row.id} tone={statusTone(row.status)} />
                  ))}
                  {rows.length > 2 && (
                    <span className="text-[9px] font-bold text-muted">+{rows.length - 2}</span>
                  )}
                </div>
              )}
              {rows.length === 1 && (
                <span className="sr-only">{dominantStatus} event</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
