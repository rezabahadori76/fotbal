import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { GoalsPanel } from "@/components/shared/goals-panel";

export default async function PlayerGoalsPage() {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      developmentGoals: {
        include: { coach: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
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

  const goals = profile.developmentGoals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    targetDate: goal.targetDate?.toISOString() ?? null,
    progressNote: goal.progressNote,
    coachName: goal.coach.name ?? "Coach",
  }));

  return (
    <div className="space-y-8 max-w-md mx-auto sm:max-w-full">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Development Goals</h1>
        <p className="text-muted mt-1">Individual targets set by your coach</p>
      </div>
      <GoalsPanel goals={goals} />
    </div>
  );
}
