import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { fetchPlayerAssignments } from "@/lib/player-responses";
import {
  PlayerResponsesFilters,
  PlayerResponsesView,
} from "@/components/shared/player-responses-view";

export default async function CoachResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string }>;
}) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const params = await searchParams;
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;
  const playerId = params.playerId || undefined;

  const [assignments, players] = await Promise.all([
    fetchPlayerAssignments({
      coachId,
      playerId,
    }),
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : {},
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const isAdminOnCoachRoute = session.user.role === Role.ADMIN;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Player responses</h1>
        <p className="text-muted mt-1">
          {coachId
            ? "Review each player's answers from your squad"
            : "Review all player answers (admin view)"}
        </p>
      </div>

      {players.length > 0 && (
        <PlayerResponsesFilters
          basePath="/coach/responses"
          coaches={[]}
          players={players.map((p) => ({
            id: p.id,
            name: p.user.name,
            coachId: p.coachId,
          }))}
          currentPlayerId={playerId}
        />
      )}

      <PlayerResponsesView
        assignments={assignments}
        showCoach={isAdminOnCoachRoute}
        emptyMessage={
          coachId
            ? "No questions assigned to your players yet."
            : "No assignments found."
        }
      />
    </div>
  );
}
