import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchPlayerAssignments } from "@/lib/player-responses";
import {
  PlayerResponsesFilters,
  PlayerResponsesView,
} from "@/components/shared/player-responses-view";

export default async function AdminResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; playerId?: string }>;
}) {
  const params = await searchParams;
  const coachId = params.coachId || undefined;
  const playerId = params.playerId || undefined;

  const [assignments, coaches, players] = await Promise.all([
    fetchPlayerAssignments({ coachId, playerId }),
    prisma.user.findMany({
      where: { role: Role.COACH },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.playerProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Player responses</h1>
        <p className="text-muted mt-1">
          See each player&apos;s answers to assigned questions across all coaches
        </p>
      </div>

      <PlayerResponsesFilters
        basePath="/admin/responses"
        coaches={coaches}
        players={players.map((p) => ({
          id: p.id,
          name: p.user.name,
          coachId: p.coachId,
        }))}
        currentCoachId={coachId}
        currentPlayerId={playerId}
      />

      <PlayerResponsesView
        assignments={assignments}
        showCoach
        emptyMessage="No assignments match your filters."
      />
    </div>
  );
}
