import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SquadBoard } from "@/components/coach/squad-board";
import { getSquadPlayers } from "@/lib/coach-squad";

export default async function CoachOverviewPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [squadPlayers, assignments, playerCount, activeInjuries, upcomingEvents] = await Promise.all([
    getSquadPlayers(coachId),
    prisma.questionAssignment.findMany({
      where: coachId ? { coachId } : undefined,
      include: { answer: { select: { id: true } } },
    }),
    prisma.playerProfile.count({
      where: coachId ? { coachId } : undefined,
    }),
    prisma.injuryReport.count({
      where: coachId ? { player: { coachId }, status: { not: "RESOLVED" } } : { status: { not: "RESOLVED" } },
    }),
    prisma.teamEvent.count({
      where: coachId ? { coachId, eventDate: { gte: new Date() } } : { eventDate: { gte: new Date() } },
    }),
  ]);

  const answered = assignments.filter((a) => a.answer != null).length;
  const pending = assignments.length - answered;
  const needsAttention = squadPlayers.filter((p) => p.status !== "ready");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Coach dashboard</h1>
        <p className="text-muted mt-1">Your squad at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-3xl font-display font-bold">{playerCount}</p>
          <p className="text-sm text-muted">Players in squad</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-warning">{pending}</p>
          <p className="text-sm text-muted">Awaiting answers</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-accent">{answered}</p>
          <p className="text-sm text-muted">Answered</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold">{upcomingEvents}</p>
          <p className="text-sm text-muted">Upcoming events</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-danger">{activeInjuries}</p>
          <p className="text-sm text-muted">Active injuries</p>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Squad board</h2>
            <p className="text-sm text-muted">
              {needsAttention.length > 0
                ? `${needsAttention.length} player${needsAttention.length === 1 ? "" : "s"} need attention`
                : "All players are on track"}
            </p>
          </div>
          <Link href="/coach/players">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </div>
        <SquadBoard players={squadPlayers} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/coach/players">
          <Button variant="secondary">Manage players</Button>
        </Link>
        <Link href="/coach/questions">
          <Button>Ask a question</Button>
        </Link>
        <Link href="/coach/events">
          <Button variant="secondary">Create event</Button>
        </Link>
        <Link href="/coach/health">
          <Button variant="secondary">View health</Button>
        </Link>
        <Link href="/coach/statistics">
          <Button variant="secondary">View statistics</Button>
        </Link>
        <Link href="/coach/responses">
          <Button variant="ghost">All responses</Button>
        </Link>
      </div>
    </div>
  );
}
