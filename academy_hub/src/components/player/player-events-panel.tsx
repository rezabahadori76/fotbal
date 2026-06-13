"use client";

import { useMemo, useState } from "react";
import { AttendanceCalendar } from "@/components/player/attendance-calendar";
import { AttendanceButtons } from "@/components/player/attendance-buttons";
import { cn } from "@/lib/utils";

export type SerializedAttendance = {
  id: string;
  status: string;
  event: {
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    timezone: string;
    location: string | null;
    field: string | null;
    notes: string | null;
    coach: { name: string };
  };
};

function getDuration(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function statusLabel(status: string) {
  if (status === "ATTENDING") return "Attending";
  if (status === "NOT_ATTENDING") return "Not attending";
  return "Pending";
}

function statusBadgeClass(status: string) {
  if (status === "ATTENDING") return "bg-accent/20 text-accent border-accent/30";
  if (status === "NOT_ATTENDING") return "bg-danger/20 text-danger border-danger/30";
  return "bg-warning/20 text-warning border-warning/30";
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted fill-none stroke-current stroke-2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted fill-none stroke-current stroke-2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted fill-none stroke-current stroke-2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function PlayerEventsPanel({ attendances }: { attendances: SerializedAttendance[] }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcoming = useMemo(
    () => attendances.filter((row) => new Date(row.event.eventDate) >= today),
    [attendances, today],
  );
  const past = useMemo(
    () =>
      attendances
        .filter((row) => new Date(row.event.eventDate) < today)
        .sort((a, b) => new Date(b.event.eventDate).getTime() - new Date(a.event.eventDate).getTime()),
    [attendances, today],
  );

  const baseEvents = tab === "upcoming" ? upcoming : past;
  const events = selectedDate
    ? baseEvents.filter((row) => row.event.eventDate.slice(0, 10) === selectedDate)
    : baseEvents;

  const calendarRows = attendances.map((row) => ({
    id: row.id,
    status: row.status,
    eventDate: row.event.eventDate,
  }));

  const stats = useMemo(() => {
    const upcomingPending = upcoming.filter((row) => row.status === "PENDING").length;
    return { upcoming: upcoming.length, pending: upcomingPending, past: past.length };
  }, [upcoming, past]);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CalendarIcon />
          <h2 className="m-0 font-display text-lg font-semibold">Attendance Level</h2>
        </div>

        <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border border-danger/50 bg-danger/20" />
            <span>Not attending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border border-accent/50 bg-accent/20" />
            <span>Attending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm border border-warning/50 bg-warning/20" />
            <span>Pending</span>
          </div>
        </div>

        <AttendanceCalendar
          attendances={calendarRows}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="mt-3 text-xs font-semibold text-accent hover:underline"
          >
            Clear date filter
          </button>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon />
            <h2 className="m-0 font-display text-lg font-semibold">Event List</h2>
          </div>
          <div className="flex gap-3 text-xs text-muted">
            <span>{stats.upcoming} upcoming</span>
            <span>{stats.pending} pending</span>
            <span>{stats.past} past</span>
          </div>
        </div>

        <div className="mb-6 flex rounded-full border border-card-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              tab === "upcoming" ? "bg-foreground text-background" : "text-muted hover:text-foreground",
            )}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              tab === "past" ? "bg-foreground text-background" : "text-muted hover:text-foreground",
            )}
          >
            Past
          </button>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-card-border bg-background/30 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card">
                <CalendarIcon />
              </div>
              <p className="font-display text-base font-semibold">
                {selectedDate ? "No events on this date" : `No ${tab} events`}
              </p>
              <p className="mt-2 text-sm text-muted">
                {tab === "upcoming"
                  ? "Your coach will add training sessions and matches here. Check back soon."
                  : "Past sessions you responded to will appear here."}
              </p>
            </div>
          ) : (
            events.map((attendance) => {
              const eventDate = new Date(attendance.event.eventDate);
              const isUpcoming = eventDate >= today;
              const dayLabel = eventDate.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);

              return (
                <article
                  key={attendance.id}
                  className="relative overflow-hidden rounded-2xl border border-card-border bg-background/50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-2">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold">{attendance.event.title}</h3>
                        <p className="text-xs text-muted">Coach {attendance.event.coach.name}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider",
                        statusBadgeClass(attendance.status),
                      )}
                    >
                      {statusLabel(attendance.status).toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-card-border/50 bg-card p-3">
                      <div className="flex items-center gap-3">
                        <CalendarIcon />
                        <span className="text-sm font-medium">
                          {eventDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="rounded border border-card-border bg-background px-2 py-0.5 text-xs font-bold text-muted">
                        {dayLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-card-border/50 bg-card p-3">
                      <div className="flex items-center gap-3">
                        <ClockIcon />
                        <span className="text-sm font-medium">
                          {attendance.event.startTime} – {attendance.event.endTime} ({attendance.event.timezone})
                        </span>
                      </div>
                      <span className="rounded border border-card-border bg-background px-2 py-0.5 text-xs font-bold text-muted">
                        {getDuration(attendance.event.startTime, attendance.event.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-card-border/50 bg-card p-3">
                      <div className="flex items-center gap-3">
                        <MapPinIcon />
                        <span className="text-sm font-medium">{attendance.event.location || "TBD"}</span>
                      </div>
                      {attendance.event.field && (
                        <span className="rounded border border-card-border bg-background px-2 py-0.5 text-xs font-bold text-muted">
                          {attendance.event.field}
                        </span>
                      )}
                    </div>

                    {attendance.event.notes && (
                      <p className="rounded-xl border border-card-border/40 bg-card/60 px-3 py-2 text-sm text-muted">
                        {attendance.event.notes}
                      </p>
                    )}
                  </div>

                  {isUpcoming && attendance.status === "PENDING" ? (
                    <AttendanceButtons attendanceId={attendance.id} />
                  ) : (
                    <p className="text-center text-xs text-muted">
                      {isUpcoming
                        ? "You already responded to this event."
                        : "This session has ended."}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
