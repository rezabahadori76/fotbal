import { AttendanceStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { TrainingLoadForm } from "@/components/player/training-load-form";
import { TrainingLoadChart } from "@/components/shared/training-load-chart";
import { dailyTrainingLoad, loadLabel, trainingLoadScore, weeklyTrainingLoad } from "@/lib/training-load";
import { formatDate } from "@/lib/utils";

export default async function PlayerTrainingPage() {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      trainingLoadReports: { orderBy: { sessionDate: "desc" }, take: 14 },
      eventAttendances: {
        where: { status: { in: [AttendanceStatus.ATTENDING, AttendanceStatus.PENDING] } },
        include: { event: true },
        orderBy: { event: { eventDate: "desc" } },
        take: 10,
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

  const weekly = weeklyTrainingLoad(profile.trainingLoadReports);
  const chartPoints = dailyTrainingLoad(profile.trainingLoadReports);
  const events = profile.eventAttendances.map((row) => ({
    id: row.event.id,
    title: row.event.title,
    eventDate: row.event.eventDate.toISOString(),
  }));

  return (
    <div className="space-y-8 max-w-md mx-auto sm:max-w-full">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Training Load</h1>
        <p className="text-muted mt-1">Log RPE after each session (RPE × minutes = load)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-3xl font-display font-bold text-accent">{weekly}</p>
          <p className="text-sm text-muted">7-day load</p>
          <p className="text-xs text-muted mt-2">{loadLabel(weekly)}</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold">{profile.trainingLoadReports.length}</p>
          <p className="text-sm text-muted">Sessions logged</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Weekly trend</h2>
        <TrainingLoadChart points={chartPoints} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Log session</h2>
        <TrainingLoadForm events={events} />
      </Card>

      {profile.trainingLoadReports.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Recent sessions</h2>
          {profile.trainingLoadReports.map((report) => (
            <Card key={report.id} className="text-sm space-y-1">
              <p className="font-medium">
                {formatDate(report.sessionDate)} · RPE {report.rpe} · {report.durationMinutes} min
              </p>
              <p className="text-muted">
                Load {trainingLoadScore(report.rpe, report.durationMinutes)} · {report.sessionType}
              </p>
              {report.notes && <p>{report.notes}</p>}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
