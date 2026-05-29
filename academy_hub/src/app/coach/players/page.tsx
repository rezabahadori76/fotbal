import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreatePlayerForm } from "@/components/coach/create-player-form";
import { isAnswered } from "@/lib/assignments";

export default async function CoachPlayersPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [players, coaches] = await Promise.all([
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : undefined,
      include: {
        user: true,
        assignments: { include: { answer: { select: { id: true } } } },
      },
      orderBy: { user: { name: "asc" } },
    }),
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
        <p className="text-muted mt-1">Manage your academy squad</p>
      </div>

      <CreatePlayerForm
        coaches={coaches}
        requireCoachSelection={session.user.role === Role.ADMIN}
      />

      <div className="grid gap-4">
        {players.length === 0 ? (
          <Card>
            <p className="text-muted">No players yet. Add your first player above.</p>
          </Card>
        ) : (
          players.map((p) => {
            const unanswered = p.assignments.filter((a) => !isAnswered(a)).length;
            return (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{p.user.name}</p>
                  <p className="text-sm text-muted">{p.user.email}</p>
                  <p className="text-xs text-muted mt-1">
                    {p.position ?? "—"} · Squad {p.squad ?? "—"}
                    {p.jerseyNo ? ` · #${p.jerseyNo}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {unanswered > 0 && (
                    <p className="text-sm text-warning">{unanswered} unanswered</p>
                  )}
                  <Link href={`/coach/responses?playerId=${p.id}`}>
                    <Button variant="ghost" size="sm">
                      View responses
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
