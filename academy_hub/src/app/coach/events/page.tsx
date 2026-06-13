import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateTeamEventForm } from "@/components/coach/create-team-event-form";
import { formatDate } from "@/lib/utils";

export default async function CoachEventsPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [players, events] = await Promise.all([
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : undefined,
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.teamEvent.findMany({
      where: coachId ? { coachId } : undefined,
      include: {
        coach: { select: { name: true } },
        attendances: { include: { player: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { eventDate: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Events & attendance</h1>
        <p className="text-muted mt-1">Create team events and track player responses.</p>
      </div>

      <CreateTeamEventForm
        players={players.map((player) => ({
          id: player.id,
          name: player.user.name,
          squad: player.squad,
        }))}
      />

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Event list</h2>
        {events.length === 0 ? (
          <Card>
            <p className="text-muted">No events created yet.</p>
          </Card>
        ) : (
          events.map((event) => {
            const attending = event.attendances.filter((row) => row.status === "ATTENDING").length;
            const notAttending = event.attendances.filter((row) => row.status === "NOT_ATTENDING").length;
            const pending = event.attendances.filter((row) => row.status === "PENDING").length;
            return (
              <Card key={event.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold">{event.title}</p>
                    <p className="text-sm text-muted">
                      {formatDate(event.eventDate)} · {event.startTime} - {event.endTime} ({event.timezone})
                    </p>
                    <p className="text-sm text-muted">
                      {event.location ?? "No location"} {event.field ? `· ${event.field}` : ""}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <span className="rounded-lg bg-accent/15 px-3 py-2 text-accent">
                      {attending}
                      <br />
                      Attend
                    </span>
                    <span className="rounded-lg bg-danger/15 px-3 py-2 text-danger">
                      {notAttending}
                      <br />
                      Out
                    </span>
                    <span className="rounded-lg bg-warning/15 px-3 py-2 text-warning">
                      {pending}
                      <br />
                      Pending
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {event.attendances.map((attendance) => (
                    <div key={attendance.id} className="rounded-xl border border-card-border bg-background p-3">
                      <p className="font-medium">{attendance.player.user.name}</p>
                      <p className="text-xs uppercase text-muted">{attendance.status.replace("_", " ")}</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
