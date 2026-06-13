import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { PlayerEventsPanel } from "@/components/player/player-events-panel";

export default async function PlayerEventsPage() {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      eventAttendances: {
        include: { event: { include: { coach: { select: { name: true } } } } },
        orderBy: { event: { eventDate: "asc" } },
      },
    },
  });

  if (!profile) {
    return (
      <Card>
        <p className="text-muted">Your player profile is not set up. Contact your coach.</p>
      </Card>
    );
  }

  const attendances = profile.eventAttendances.map((row) => ({
    id: row.id,
    status: row.status,
    event: {
      title: row.event.title,
      eventDate: row.event.eventDate.toISOString(),
      startTime: row.event.startTime,
      endTime: row.event.endTime,
      timezone: row.event.timezone,
      location: row.event.location,
      field: row.event.field,
      notes: row.event.notes,
      coach: { name: row.event.coach.name ?? "Coach" },
    },
  }));

  return (
    <div className="mx-auto max-w-md space-y-6 sm:max-w-full">
      <PlayerEventsPanel attendances={attendances} />
    </div>
  );
}
