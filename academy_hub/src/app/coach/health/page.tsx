import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { wellnessReadiness } from "@/lib/performance";

export default async function CoachHealthPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const players = await prisma.playerProfile.findMany({
    where: coachId ? { coachId } : undefined,
    include: {
      user: { select: { name: true, email: true } },
      wellnessReports: { orderBy: { reportDate: "desc" }, take: 1 },
      injuryReports: { orderBy: { occurredAt: "desc" }, take: 5 },
    },
    orderBy: { user: { name: "asc" } },
  });

  const activeInjuries = players.flatMap((player) =>
    player.injuryReports.filter((injury) => injury.status !== "RESOLVED"),
  );
  const reportedToday = players.filter((player) => player.wellnessReports.length > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Health & readiness</h1>
        <p className="text-muted mt-1">Wellness and injury data submitted by players.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-3xl font-display font-bold">{players.length}</p>
          <p className="text-sm text-muted">Players tracked</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-accent">{reportedToday}</p>
          <p className="text-sm text-muted">With wellness data</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-danger">{activeInjuries.length}</p>
          <p className="text-sm text-muted">Active injuries</p>
        </Card>
      </div>

      <div className="grid gap-4">
        {players.length === 0 ? (
          <Card>
            <p className="text-muted">No players assigned yet.</p>
          </Card>
        ) : (
          players.map((player) => {
            const latest = player.wellnessReports[0];
            const injuries = player.injuryReports.filter((injury) => injury.status !== "RESOLVED");
            return (
              <Card key={player.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold">{player.user.name}</p>
                    <p className="text-sm text-muted">{player.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-accent">{wellnessReadiness(latest)}%</p>
                    <p className="text-xs uppercase text-muted">Readiness</p>
                  </div>
                </div>
                {latest ? (
                  <div className="grid gap-2 sm:grid-cols-5">
                    {[
                      ["Energy", latest.energy],
                      ["Sleep", latest.sleep],
                      ["Stress", latest.stress],
                      ["Soreness", latest.soreness],
                      ["Mood", latest.mood],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-background p-3">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="text-xl font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No wellness report yet.</p>
                )}
                {injuries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-danger">Active injuries</p>
                    {injuries.map((injury) => (
                      <div key={injury.id} className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
                        <p className="font-medium">
                          {injury.bodyPart}
                          {injury.specificPart ? ` · ${injury.specificPart}` : ""}
                        </p>
                        <p className="text-muted">
                          {injury.status} · {formatDate(injury.occurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
