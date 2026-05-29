import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CoachOverviewPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const assignments = await prisma.questionAssignment.findMany({
    where: coachId ? { coachId } : undefined,
    include: { answer: { select: { id: true } } },
  });

  const playerCount = await prisma.playerProfile.count({
    where: coachId ? { coachId } : undefined,
  });

  const answered = assignments.filter((a) => a.answer != null).length;
  const pending = assignments.length - answered;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Coach dashboard</h1>
        <p className="text-muted mt-1">Your squad at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/coach/players">
          <Button variant="secondary">Manage players</Button>
        </Link>
        <Link href="/coach/questions">
          <Button>Ask a question</Button>
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
