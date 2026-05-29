import { prisma } from "@/lib/prisma";

export async function fetchPlayerAssignments(filters?: {
  coachId?: string;
  playerId?: string;
}) {
  return prisma.questionAssignment.findMany({
    where: {
      ...(filters?.coachId ? { coachId: filters.coachId } : {}),
      ...(filters?.playerId ? { playerId: filters.playerId } : {}),
    },
    include: {
      player: { include: { user: { select: { name: true, email: true } } } },
      question: true,
      answer: true,
      coach: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type PlayerAssignmentRow = Awaited<
  ReturnType<typeof fetchPlayerAssignments>
>[number];

export function groupAssignmentsByPlayer(assignments: PlayerAssignmentRow[]) {
  const groups = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      playerEmail: string;
      coachName: string;
      assignments: PlayerAssignmentRow[];
    }
  >();

  for (const assignment of assignments) {
    const existing = groups.get(assignment.playerId);
    if (existing) {
      existing.assignments.push(assignment);
      continue;
    }
    groups.set(assignment.playerId, {
      playerId: assignment.playerId,
      playerName: assignment.player.user.name,
      playerEmail: assignment.player.user.email,
      coachName: assignment.coach.name,
      assignments: [assignment],
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.playerName.localeCompare(b.playerName),
  );
}
