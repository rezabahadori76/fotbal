import { Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { wellnessLabel, wellnessReadiness } from "@/lib/performance";
import { cn } from "@/lib/utils";

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
        take: 3,
      },
    },
  });

  if (!profile) {
    return (
      <Card>
        <p className="text-muted">Your player profile is not set up. Contact your coach.</p>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestWellness = profile.wellnessReports[0];
  const readiness = wellnessReadiness(latestWellness);
  const activeInjuries = profile.injuryReports.filter((injury) => injury.status !== "RESOLVED");
  const upcomingEvents = profile.eventAttendances.filter((row) => row.event.eventDate >= today);
  const availability = activeInjuries.length === 0 ? 100 : 0;
  const hasWellness = !!latestWellness;
  const hasWellnessToday =
    !!latestWellness && new Date(latestWellness.reportDate).toDateString() === today.toDateString();

  return (
    <div className="space-y-8 max-w-md mx-auto sm:max-w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Readiness */}
        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Readiness</p>
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted/30 fill-none stroke-current stroke-[4]">
              <circle cx="12" cy="12" r="9" />
              {hasWellness && <circle cx="12" cy="12" r="9" className="text-warning stroke-current" strokeDasharray="56" strokeDashoffset={56 - (56 * readiness) / 100} />}
            </svg>
            <span className="text-2xl font-display font-semibold text-muted/50">{hasWellness ? `${readiness}%` : "0%"}</span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            {hasWellness ? wellnessLabel(readiness).toUpperCase() : "NOT ENOUGH DATA"}
          </div>
        </Card>

        {/* Training Load */}
        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Training Load</p>
          <div className="flex items-center gap-2 mb-4">
            <svg viewBox="0 0 24 12" className="w-6 h-3 text-muted/30 fill-none stroke-current stroke-[4]">
              <path d="M3 12 A 9 9 0 0 1 21 12" />
            </svg>
            <span className="text-2xl font-display font-semibold text-muted/50">{upcomingEvents.length}</span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            {upcomingEvents.length > 0 ? "UPCOMING EVENTS" : "NOT ENOUGH DATA"}
          </div>
        </Card>

        {/* Performance */}
        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Performance</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-1.5 rounded-full bg-muted/30" />
            <span className="text-2xl font-display font-semibold text-muted/50">- 0.0</span>
          </div>
          <div className="mt-auto rounded-lg bg-card/60 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-muted/50">
            NOT ENOUGH DATA
          </div>
        </Card>

        {/* Availability */}
        <Card className="flex flex-col p-4 bg-background/50 border-card-border/60">
          <p className="text-sm font-semibold text-foreground mb-3">Availability</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full bg-accent" />
            <span className="text-2xl font-display font-semibold text-accent">{availability}%</span>
          </div>
          <div className="mt-auto rounded-lg bg-accent/20 px-2 py-1.5 text-center text-[10px] font-bold tracking-wider text-accent">
            {availability === 100 ? "AMAZING" : "ACTIVE INJURY"}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Wellness Report Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Wellness Report</h2>
              <p className="text-sm text-muted">Today, {new Date().toLocaleDateString('en-US')}</p>
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
            <div className="w-full text-center rounded-full bg-[#E5E5E5] text-black font-semibold py-3.5 text-sm hover:bg-white transition-colors">
              + Add Wellness Report
            </div>
          </Link>
        </div>

        <hr className="border-card-border/50" />

        {/* Injuries Overview Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Injuries Overview</h2>
            <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold tracking-wider border", 
              activeInjuries.length > 0 ? "bg-danger/20 text-danger border-danger/30" : "bg-danger text-white border-danger"
            )}>
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
