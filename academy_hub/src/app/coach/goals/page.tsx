import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { CreateGoalForm } from "@/components/coach/create-goal-form";
import { GoalsPanel } from "@/components/shared/goals-panel";
import { Card } from "@/components/ui/card";

export default async function CoachGoalsPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [players, goals] = await Promise.all([
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : undefined,
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.developmentGoal.findMany({
      where: coachId ? { coachId } : undefined,
      include: {
        player: { include: { user: { select: { name: true } } } },
        coach: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const grouped = goals.map((goal) => ({
    playerName: goal.player.user.name,
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      targetDate: goal.targetDate?.toISOString() ?? null,
      progressNote: goal.progressNote,
      coachName: goal.coach.name ?? "Coach",
    },
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Development Goals</h1>
        <p className="text-muted mt-1">Set and track individual player targets</p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Create goal</h2>
        <CreateGoalForm players={players.map((p) => ({ id: p.id, name: p.user.name }))} />
      </Card>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">All goals</h2>
        {grouped.length === 0 ? (
          <Card><p className="text-muted text-sm">No goals created yet.</p></Card>
        ) : (
          grouped.map(({ playerName, goal }) => (
            <div key={goal.id} className="space-y-2">
              <p className="text-sm font-semibold text-muted">{playerName}</p>
              <GoalsPanel goals={[goal]} canManage />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
