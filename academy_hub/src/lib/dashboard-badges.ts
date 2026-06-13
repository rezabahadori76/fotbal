import { AssignmentStatus, AttendanceStatus, GoalStatus, InjuryStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSameDay } from "@/lib/performance";

export type NavBadges = Record<string, number>;

export async function getNavBadges(role: Role, userId: string): Promise<NavBadges> {
  if (role === Role.PLAYER) {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
      include: {
        wellnessReports: { orderBy: { reportDate: "desc" }, take: 1 },
        assignments: { include: { answer: { select: { id: true } } } },
        eventAttendances: {
          where: { status: AttendanceStatus.PENDING },
          include: { event: { select: { eventDate: true } } },
        },
        coach: { select: { id: true } },
      },
    });
    if (!profile) return {};

    const badges: NavBadges = {};
    const latestWellness = profile.wellnessReports[0];
    if (!latestWellness || !isSameDay(latestWellness.reportDate)) {
      badges["/player/status"] = 1;
    }

    const unanswered = profile.assignments.filter((a) => !a.answer).length;
    if (unanswered > 0) badges["/player/questions"] = unanswered;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pendingEvents = profile.eventAttendances.filter(
      (row) => new Date(row.event.eventDate) >= today,
    ).length;
    if (pendingEvents > 0) badges["/player/events"] = pendingEvents;

    const unreadAnnouncements = await prisma.announcement.count({
      where: {
        coachId: profile.coachId,
        OR: profile.squad
          ? [{ targetSquad: null }, { targetSquad: profile.squad }]
          : [{ targetSquad: null }],
        reads: { none: { userId } },
      },
    });
    if (unreadAnnouncements > 0) badges["/player"] = unreadAnnouncements;

    const activeGoals = await prisma.developmentGoal.count({
      where: {
        playerId: profile.id,
        status: { not: GoalStatus.ACHIEVED },
      },
    });
    if (activeGoals > 0) badges["/player/goals"] = activeGoals;

    return badges;
  }

  const coachId = role === Role.COACH ? userId : undefined;
  const playerWhere = coachId ? { coachId } : undefined;

  const [pendingAnswers, activeInjuries, players] = await Promise.all([
    prisma.questionAssignment.count({
      where: {
        status: AssignmentStatus.PENDING,
        ...(coachId ? { coachId } : {}),
      },
    }),
    prisma.injuryReport.count({
      where: {
        status: { not: InjuryStatus.RESOLVED },
        ...(coachId ? { player: { coachId } } : {}),
      },
    }),
    prisma.playerProfile.findMany({
      where: playerWhere,
      include: {
        wellnessReports: { orderBy: { reportDate: "desc" }, take: 1 },
      },
    }),
  ]);

  const missingWellnessToday = players.filter((player) => {
    const latest = player.wellnessReports[0];
    return !latest || !isSameDay(latest.reportDate);
  }).length;

  const badges: NavBadges = {};
  if (pendingAnswers > 0) {
    badges["/coach/responses"] = pendingAnswers;
    badges["/admin/responses"] = pendingAnswers;
  }
  if (activeInjuries > 0) {
    badges["/coach/health"] = activeInjuries;
    badges["/admin/health"] = activeInjuries;
  }
  if (missingWellnessToday > 0) {
    badges["/coach"] = missingWellnessToday;
    badges["/coach/players"] = missingWellnessToday;
  }

  return badges;
}
