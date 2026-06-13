import { AttendanceStatus, Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { TodayChecklist } from "@/components/player/today-checklist";
import { isSameDay, wellnessLabel, wellnessReadiness } from "@/lib/performance";
import { cn } from "@/lib/utils";
import { AnnouncementsFeed } from "@/components/player/announcements-feed";
import { loadLabel, weeklyTrainingLoad } from "@/lib/training-load";
import { isAnswered } from "@/lib/assignments";

export default async function PlayerDashboardPage() {
  const session = await requireRole(Role.PLAYER);

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      wellnessReports: { orderBy: { reportDate: "desc" }, take: 1 },
      injuryReports: { orderBy: { occurredAt: "desc" } },
      assignments: { include: { answer: { select: { id: true } } } },
      eventAttendances: {
        include: { event: true },
        orderBy: { event: { eventDate: "asc" } },
      },
      trainingLoadReports: { orderBy: { sessionDate: "desc" }, take: 14 },
    },
  });

  if (!profile) {
    return (
      <Card>
        <p className="text-muted">Your player profile is not set up. Contact your coach.</p>
      </Card>
    );
  }

  const announcements = await prisma.announcement.findMany({
    where: {
      coachId: profile.coachId,
      OR: profile.squad
        ? [{ targetSquad: null }, { targetSquad: profile.squad }]
        : [{ targetSquad: null }],
    },
    include: {
      coach: { select: { name: true } },
      reads: { where: { userId: session.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestWellness = profile.wellnessReports[0];
  const readiness = wellnessReadiness(latestWellness);
  const activeInjuries = profile.injuryReports.filter((injury) => injury.status !== "RESOLVED");
  const upcomingEvents = profile.eventAttendances.filter((row) => new Date(row.event.eventDate) >= today);
  const pendingRsvp = upcomingEvents.filter((row) => row.status === AttendanceStatus.PENDING);
  const unanswered = profile.assignments.filter((assignment) => !isAnswered(assignment));
  const hasWellness = !!latestWellness;
  const hasWellnessToday = !!latestWellness && isSameDay(latestWellness.reportDate);
  const availability =
    activeInjuries.length === 0 ? 100 : activeInjuries.some((i) => i.status === "ACTIVE") ? 0 : 50;

  const weeklyLoad = weeklyTrainingLoad(profile.trainingLoadReports);
  const hasTrainingToday = profile.trainingLoadReports.some((report) => isSameDay(report.sessionDate));

  const checklist = [
    {
      id: "wellness",
      label: "Submit today's wellness report",
      done: hasWellnessToday,
      href: "/player/status?add=true",
      detail: hasWellnessToday ? "Submitted for today" : "Daily readiness check-in",
    },
    {
      id: "training",
      label: "Log training load (RPE)",
      done: hasTrainingToday,
      href: "/player/training",
      detail: hasTrainingToday ? `7-day load: ${weeklyLoad}` : "Log RPE after today's session",
    },
    {
      id: "questions",
      label: "Answer coach questions",
      done: unanswered.length === 0,
      href: "/player/questions",
      detail:
        unanswered.length === 0
          ? "No pending questions"
          : `${unanswered.length} question${unanswered.length === 1 ? "" : "s"} waiting`,
    },
    {
      id: "events",
      label: "Confirm event attendance",
      done: pendingRsvp.length === 0,
      href: "/player/events",
      detail:
        pendingRsvp.length === 0
          ? "All upcoming events confirmed"
          : `${pendingRsvp.length} event${pendingRsvp.length === 1 ? "" : "s"} need RSVP`,
    },
    {
      id: "injuries",
      label: "Review injury status",
      done: activeInjuries.length === 0,
      href: "/player/injuries",
      detail:
        activeInjuries.length === 0
          ? "No active injuries"
          : `${activeInjuries.length} active injury report${activeInjuries.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="space-y-8 max-w-md mx-auto sm:max-w-full">
      <TodayChecklist items={checklist} />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Team announcements</h2>
        <AnnouncementsFeed
          announcements={announcements.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            createdAt: item.createdAt.toISOString(),
            coachName: item.coach.name ?? "Coach",
            isRead: item.reads.length > 0,
          }))}
        />
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Readiness</p>
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted/30 fill-none stroke-current stroke-[4]">
              <circle cx="12" cy="12" r="9" />
              {hasWellness && (
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  className="text-warning stroke-current"
                  strokeDasharray="56"
                  strokeDashoffset={56 - (56 * readiness) / 100}
                />
              )}
            </svg>
            <span className="text-2xl font-display font-semibold text-muted/50">
              {hasWellness ? `${readiness}%` : "0%"}
            </span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            {hasWellness ? wellnessLabel(readiness).toUpperCase() : "NOT ENOUGH DATA"}
          </div>
        </Card>

        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Upcoming Events</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-display font-semibold text-muted/50">{upcomingEvents.length}</span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            {pendingRsvp.length > 0 ? `${pendingRsvp.length} NEED RSVP` : "ALL CONFIRMED"}
          </div>
        </Card>

        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Training Load</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-display font-semibold text-muted/50">{weeklyLoad}</span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            {loadLabel(weeklyLoad).toUpperCase()} · 7 DAYS
          </div>
        </Card>

        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60 col-span-2 sm:col-span-1">
          <p className="text-sm font-semibold text-foreground mb-3">Availability</p>
          <div className="flex items-center gap-2 mb-4">
            <div
              className={cn(
                "w-5 h-5 rounded-full",
                availability === 100 ? "bg-accent" : availability === 50 ? "bg-warning" : "bg-danger",
              )}
            />
            <span
              className={cn(
                "text-2xl font-display font-semibold",
                availability === 100 ? "text-accent" : availability === 50 ? "text-warning" : "text-danger",
              )}
            >
              {availability}%
            </span>
          </div>
          <div
            className={cn(
              "mt-auto rounded-lg px-2 py-1.5 text-center text-[10px] font-bold tracking-wider",
              availability === 100
                ? "bg-accent/20 text-accent"
                : availability === 50
                  ? "bg-warning/20 text-warning"
                  : "bg-danger/20 text-danger",
            )}
          >
            {availability === 100 ? "AVAILABLE" : availability === 50 ? "RECOVERING" : "UNAVAILABLE"}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Wellness Report</h2>
              <p className="text-sm text-muted">Today, {new Date().toLocaleDateString("en-US")}</p>
            </div>
            {!hasWellnessToday && (
              <span className="rounded-full bg-warning/20 px-3 py-1 text-[11px] font-bold text-warning border border-warning/30 tracking-wider">
                PENDING
              </span>
            )}
            {hasWellnessToday && (
              <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold text-accent border border-accent/30 tracking-wider">
                SUBMITTED
              </span>
            )}
          </div>
          <Link href="/player/status?add=true" className="block">
            <div className="w-full text-center rounded-full bg-cta text-cta-foreground font-semibold py-3.5 text-sm hover:bg-white transition-colors">
              + Add Wellness Report
            </div>
          </Link>
        </div>

        <hr className="border-card-border/50" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Injuries Overview</h2>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold tracking-wider border",
                activeInjuries.length > 0
                  ? "bg-danger/20 text-danger border-danger/30"
                  : "bg-accent/20 text-accent border-accent/30",
              )}
            >
              {activeInjuries.length} ACTIVE
            </span>
          </div>
          <Link href="/player/injuries?add=true" className="block">
            <div className="w-full text-center rounded-full bg-background border border-card-border text-foreground font-semibold py-3.5 text-sm hover:bg-card transition-colors">
              + New Injury
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
