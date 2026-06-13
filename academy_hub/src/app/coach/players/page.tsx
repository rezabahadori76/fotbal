import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreatePlayerForm } from "@/components/coach/create-player-form";
import { SquadBoard } from "@/components/coach/squad-board";
import { getSquadPlayers } from "@/lib/coach-squad";

export default async function CoachPlayersPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [squadPlayers, coaches] = await Promise.all([
    getSquadPlayers(coachId),
    session.user.role === Role.ADMIN
      ? prisma.user.findMany({
          where: { role: Role.COACH },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Players</h1>
        <p className="text-muted mt-1">Manage your academy squad and open player profiles</p>
      </div>

      <CreatePlayerForm
        coaches={coaches}
        requireCoachSelection={session.user.role === Role.ADMIN}
      />

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Squad overview</h2>
        <SquadBoard players={squadPlayers} />
      </section>

      {squadPlayers.length === 0 && (
        <Card>
          <p className="text-muted">No players yet. Add your first player above.</p>
        </Card>
      )}
    </div>
  );
}
