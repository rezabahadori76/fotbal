import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SquadStatusBadge } from "@/components/shared/squad-status-badge";
import type { SquadPlayerRow } from "@/lib/squad-status";

export function SquadBoard({
  players,
  profileBasePath = "/coach/players",
}: {
  players: SquadPlayerRow[];
  profileBasePath?: string;
}) {
  if (players.length === 0) {
    return (
      <Card>
        <p className="text-muted">No players in your squad yet.</p>
      </Card>
    );
  }

  const counts = {
    ready: players.filter((p) => p.status === "ready").length,
    missing_wellness: players.filter((p) => p.status === "missing_wellness").length,
    injured: players.filter((p) => p.status === "injured").length,
    pending_questions: players.filter((p) => p.status === "pending_questions").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {counts.ready} ready
        </span>
        <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
          {counts.missing_wellness} no wellness today
        </span>
        <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
          {counts.injured} injured
        </span>
        <span className="rounded-full border border-info/30 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
          {counts.pending_questions} unanswered
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => (
          <Link key={player.id} href={`${profileBasePath}/${player.id}`}>
            <Card className="h-full transition-colors hover:border-accent/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{player.name}</p>
                  <p className="text-xs text-muted mt-1">
                    {player.position ?? "—"}
                    {player.jerseyNo ? ` · #${player.jerseyNo}` : ""}
                    {player.squad ? ` · ${player.squad}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-accent">{player.readiness}%</p>
                  <p className="text-[10px] uppercase text-muted">Readiness</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SquadStatusBadge status={player.status} />
                {player.unanswered > 0 && (
                  <span className="text-xs text-muted">{player.unanswered} unanswered</span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
