import { notFound } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SquadStatusBadge } from "@/components/shared/squad-status-badge";
import { WellnessChart } from "@/components/shared/wellness-chart";
import { TrainingLoadChart } from "@/components/shared/training-load-chart";
import { GoalsPanel } from "@/components/shared/goals-panel";
import { CreateGoalForm } from "@/components/coach/create-goal-form";
import { ExportButtons } from "@/components/coach/export-buttons";
import { getCoachPlayerProfile } from "@/lib/coach-squad";
import { deriveSquadStatus } from "@/lib/squad-status";
import { formatDate } from "@/lib/utils";
import { getOptionLabel } from "@/lib/questions";
import { isAnswered } from "@/lib/assignments";
import { dailyTrainingLoad, weeklyTrainingLoad } from "@/lib/training-load";

export default async function CoachPlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const { id } = await params;
  const profile = await getCoachPlayerProfile(id, session);

  if (!profile) notFound();

  const derived = deriveSquadStatus(profile);
  const answered = profile.assignments.filter(isAnswered);
  const pending = profile.assignments.length - answered.length;
  const weeklyLoad = weeklyTrainingLoad(profile.trainingLoadReports);
  const loadPoints = dailyTrainingLoad(profile.trainingLoadReports);

  const goals = profile.developmentGoals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    targetDate: goal.targetDate?.toISOString() ?? null,
    progressNote: goal.progressNote,
    coachName: profile.coach.name ?? "Coach",
  }));

  return (
    <div className="space-y-8">
      <ExportButtons playerReportHref={`/coach/export/player/${profile.id}`} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/coach/players" className="text-sm text-muted hover:text-foreground">
            ← Back to players
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-wide mt-2">{profile.user.name}</h1>
          <p className="text-muted mt-1">{profile.user.email}</p>
          <p className="text-sm text-muted mt-2">
            {profile.position ?? "—"}
            {profile.jerseyNo ? ` · #${profile.jerseyNo}` : ""}
            {profile.squad ? ` · ${profile.squad}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SquadStatusBadge status={derived.status} />
          <Link href={`/coach/responses?playerId=${profile.id}`}>
            <Button variant="secondary" size="sm">
              View responses
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-3xl font-display font-bold text-accent">{derived.readiness}%</p>
          <p className="text-sm text-muted">Readiness</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-warning">{pending}</p>
          <p className="text-sm text-muted">Pending questions</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold">{answered.length}</p>
          <p className="text-sm text-muted">Answered questions</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-danger">{derived.activeInjuries}</p>
          <p className="text-sm text-muted">Active injuries</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold">{weeklyLoad}</p>
          <p className="text-sm text-muted">7-day training load</p>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Training load (7 days)</h2>
        <Card>
          <TrainingLoadChart points={loadPoints} />
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Development goals</h2>
        <Card className="space-y-4">
          <CreateGoalForm
            players={[{ id: profile.id, name: profile.user.name }]}
            defaultPlayerId={profile.id}
          />
        </Card>
        <GoalsPanel goals={goals} canManage />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Wellness trend (7 days)</h2>
        <Card>
          <WellnessChart reports={profile.wellnessReports} />
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Recent injuries</h2>
          {profile.injuryReports.length === 0 ? (
            <Card>
              <p className="text-muted text-sm">No injury reports.</p>
            </Card>
          ) : (
            profile.injuryReports.slice(0, 5).map((injury) => (
              <Card key={injury.id} className="text-sm space-y-1">
                <p className="font-medium">
                  {injury.bodyPart}
                  {injury.specificPart ? ` · ${injury.specificPart}` : ""}
                </p>
                <p className="text-muted">
                  {injury.status} · {formatDate(injury.occurredAt)}
                </p>
                {injury.description && <p>{injury.description}</p>}
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Recent events</h2>
          {profile.eventAttendances.length === 0 ? (
            <Card>
              <p className="text-muted text-sm">No events yet.</p>
            </Card>
          ) : (
            profile.eventAttendances.map((row) => (
              <Card key={row.id} className="text-sm space-y-1">
                <p className="font-medium">{row.event.title}</p>
                <p className="text-muted">
                  {formatDate(row.event.eventDate)} · {row.status}
                </p>
              </Card>
            ))
          )}
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Question history</h2>
        {profile.assignments.length === 0 ? (
          <Card>
            <p className="text-muted text-sm">No questions assigned yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profile.assignments.slice(0, 8).map((assignment) => (
              <Card key={assignment.id} className="text-sm space-y-2">
                <p className="font-medium">{assignment.question.text}</p>
                {assignment.answer ? (
                  <p>
                    <span className="font-semibold text-accent">
                      {getOptionLabel(assignment.answer.selectedOption)}
                    </span>{" "}
                    — {assignment.answer.text}
                  </p>
                ) : (
                  <p className="text-muted italic">Waiting for answer</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
