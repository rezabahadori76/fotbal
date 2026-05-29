import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getOptionLabel } from "@/lib/questions";
import {
  groupAssignmentsByPlayer,
  type PlayerAssignmentRow,
} from "@/lib/player-responses";
import { isAnswered } from "@/lib/assignments";

function AssignmentCard({
  assignment,
  showCoach,
}: {
  assignment: PlayerAssignmentRow;
  showCoach: boolean;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-background p-4 space-y-2">
      <p className="text-sm font-medium">{assignment.question.text}</p>
      {showCoach && (
        <p className="text-xs text-muted">Coach: {assignment.coach.name}</p>
      )}
      {assignment.answer ? (
        <div className="text-sm">
          <span className="font-display font-semibold text-accent">
            {getOptionLabel(assignment.answer.selectedOption)}
          </span>{" "}
          — {assignment.answer.text}
          <p className="text-xs text-muted mt-2">
            Answered {formatDate(assignment.answer.updatedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted italic">Waiting for answer…</p>
      )}
      <p className="text-xs text-muted">Sent {formatDate(assignment.createdAt)}</p>
    </div>
  );
}

export function PlayerResponsesView({
  assignments,
  showCoach = false,
  emptyMessage = "No questions assigned yet.",
}: {
  assignments: PlayerAssignmentRow[];
  showCoach?: boolean;
  emptyMessage?: string;
}) {
  const groups = groupAssignmentsByPlayer(assignments);

  if (groups.length === 0) {
    return (
      <Card>
        <p className="text-muted">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const answered = group.assignments.filter(isAnswered).length;
        return (
          <Card key={group.playerId} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{group.playerName}</h2>
                <p className="text-sm text-muted">{group.playerEmail}</p>
                {showCoach && (
                  <p className="text-xs text-muted mt-1">Coach: {group.coachName}</p>
                )}
              </div>
              <p className="text-sm text-muted">
                {answered}/{group.assignments.length} answered
              </p>
            </div>
            <div className="space-y-3">
              {group.assignments.map((a) => (
                <AssignmentCard key={a.id} assignment={a} showCoach={showCoach} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function PlayerResponsesFilters({
  coaches,
  players,
  currentCoachId,
  currentPlayerId,
  basePath,
}: {
  coaches: { id: string; name: string }[];
  players: { id: string; name: string; coachId: string }[];
  currentCoachId?: string;
  currentPlayerId?: string;
  basePath: string;
}) {
  const filteredPlayers = currentCoachId
    ? players.filter((p) => p.coachId === currentCoachId)
    : players;

  const showCoachFilter = coaches.length > 0;

  return (
    <Card className="flex flex-wrap items-end gap-4">
      <form method="get" className="flex flex-wrap items-end gap-4">
        {showCoachFilter && (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Coach</span>
            <select
              name="coachId"
              defaultValue={currentCoachId ?? ""}
              className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">All coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Player</span>
          <select
            name="playerId"
            defaultValue={currentPlayerId ?? ""}
            className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">All players</option>
            {filteredPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-pitch"
        >
          Filter
        </button>
        {(currentCoachId || currentPlayerId) && (
          <Link href={basePath} className="text-sm text-muted hover:text-foreground pb-2">
            Clear
          </Link>
        )}
      </form>
    </Card>
  );
}
