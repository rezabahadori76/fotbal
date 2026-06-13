import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateAnnouncementForm } from "@/components/coach/create-announcement-form";
import { formatDate } from "@/lib/utils";

export default async function CoachAnnouncementsPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [announcements, players, coaches] = await Promise.all([
    prisma.announcement.findMany({
      where: coachId ? { coachId } : undefined,
      include: {
        coach: { select: { name: true } },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : undefined,
      select: { squad: true },
    }),
    session.user.role === Role.ADMIN
      ? prisma.user.findMany({ where: { role: Role.COACH }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const squads = [...new Set(players.map((p) => p.squad).filter(Boolean))] as string[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Announcements</h1>
        <p className="text-muted mt-1">Send team messages to your squad</p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">New announcement</h2>
        <CreateAnnouncementForm
          squads={squads}
          coaches={coaches}
          requireCoachSelection={session.user.role === Role.ADMIN}
        />
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent announcements</h2>
        {announcements.length === 0 ? (
          <Card><p className="text-muted text-sm">No announcements posted yet.</p></Card>
        ) : (
          announcements.map((item) => (
            <Card key={item.id} className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-muted">{formatDate(item.createdAt)}</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{item.body}</p>
              <p className="text-xs text-muted">
                {item.targetSquad ? `Squad: ${item.targetSquad}` : "All players"} · Read by {item._count.reads}
              </p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
