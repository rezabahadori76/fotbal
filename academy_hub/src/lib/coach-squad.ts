import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deriveSquadStatus, sortSquadPlayers, type SquadPlayerRow } from "@/lib/squad-status";

export async function getSquadPlayers(coachId?: string): Promise<SquadPlayerRow[]> {
  const players = await prisma.playerProfile.findMany({
    where: coachId ? { coachId } : undefined,
    include: {
      user: { select: { name: true, email: true } },
      wellnessReports: { orderBy: { reportDate: "desc" }, take: 1 },
      injuryReports: { orderBy: { occurredAt: "desc" } },
      assignments: { include: { answer: { select: { id: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const rows = players.map((player) => {
    const derived = deriveSquadStatus(player);
    return {
      id: player.id,
      name: player.user.name,
      email: player.user.email,
      position: player.position,
      squad: player.squad,
      jerseyNo: player.jerseyNo,
      readiness: derived.readiness,
      status: derived.status,
      unanswered: derived.unanswered,
      activeInjuries: derived.activeInjuries,
    };
  });

  return sortSquadPlayers(rows);
}

export async function getCoachPlayerProfile(playerProfileId: string, session: { user: { id: string; role: Role } }) {
  const profile = await prisma.playerProfile.findFirst({
    where: {
      id: playerProfileId,
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
    },
    include: {
      user: true,
      coach: { select: { name: true } },
      wellnessReports: { orderBy: { reportDate: "desc" }, take: 14 },
      injuryReports: { orderBy: { occurredAt: "desc" } },
      assignments: {
        include: {
          question: true,
          answer: true,
          coach: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      eventAttendances: {
        include: { event: true },
        orderBy: { event: { eventDate: "desc" } },
        take: 8,
      },
      trainingLoadReports: { orderBy: { sessionDate: "desc" }, take: 14 },
      developmentGoals: { orderBy: { createdAt: "desc" } },
    },
  });

  return profile;
}
