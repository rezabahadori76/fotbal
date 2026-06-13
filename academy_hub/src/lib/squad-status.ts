import type { InjuryReport, QuestionAssignment, WellnessReport } from "@prisma/client";
import { isAnswered } from "@/lib/assignments";
import { isSameDay, squadStatusLabel, squadStatusPriority, type SquadStatus } from "@/lib/performance";

export type SquadPlayerRow = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  squad: string | null;
  jerseyNo: number | null;
  readiness: number;
  status: SquadStatus;
  unanswered: number;
  activeInjuries: number;
};

export function deriveSquadStatus(input: {
  wellnessReports: WellnessReport[];
  injuryReports: InjuryReport[];
  assignments: (QuestionAssignment & { answer?: { id: string } | null })[];
}): { status: SquadStatus; readiness: number; unanswered: number; activeInjuries: number } {
  const latest = input.wellnessReports[0];
  const activeInjuries = input.injuryReports.filter((i) => i.status !== "RESOLVED").length;
  const unanswered = input.assignments.filter((a) => !isAnswered(a)).length;

  let status: SquadStatus = "ready";
  if (activeInjuries > 0) status = "injured";
  else if (!latest || !isSameDay(latest.reportDate)) status = "missing_wellness";
  else if (unanswered > 0) status = "pending_questions";

  const readiness = latest
    ? Math.round(
        ((latest.mood + latest.energy + latest.sleep + (11 - latest.stress) + (11 - latest.soreness)) /
          50) *
          100,
      )
    : 0;

  return { status, readiness, unanswered, activeInjuries };
}

export function sortSquadPlayers(players: SquadPlayerRow[]) {
  return [...players].sort((a, b) => {
    const statusDiff = squadStatusPriority(a.status) - squadStatusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}

export { squadStatusLabel, squadStatusPriority };
