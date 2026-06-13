import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCoachPlayerProfile } from "@/lib/coach-squad";
import { wellnessReadiness } from "@/lib/performance";
import { weeklyTrainingLoad } from "@/lib/training-load";
import { deriveSquadStatus } from "@/lib/squad-status";
import { formatDate } from "@/lib/utils";
import { PrintReportButton } from "@/components/coach/print-report-button";

export default async function PlayerExportReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const { id } = await params;
  const profile = await getCoachPlayerProfile(id, session);
  if (!profile) notFound();

  const derived = deriveSquadStatus(profile);
  const weeklyLoad = weeklyTrainingLoad(profile.trainingLoadReports);

  return (
    <div className="print-report max-w-3xl mx-auto space-y-6 bg-white text-black p-8 rounded-2xl border border-card-border print:border-0 print:p-0">
      <div className="flex justify-between items-start print:hidden">
        <h1 className="text-xl font-bold text-foreground">Player report preview</h1>
        <PrintReportButton />
      </div>

      <header className="border-b border-card-border pb-4">
        <h1 className="text-2xl font-bold">{profile.user.name}</h1>
        <p className="text-muted">{profile.user.email}</p>
        <p className="text-sm text-muted mt-2">
          {profile.position ?? "—"}
          {profile.jerseyNo ? ` · #${profile.jerseyNo}` : ""}
          {profile.squad ? ` · ${profile.squad}` : ""}
        </p>
        <p className="text-sm text-muted mt-2">Generated {new Date().toLocaleString("en-GB")}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Readiness</strong><br />{derived.readiness}%</div>
        <div><strong>Status</strong><br />{derived.status}</div>
        <div><strong>7-day training load</strong><br />{weeklyLoad}</div>
        <div><strong>Active injuries</strong><br />{derived.activeInjuries}</div>
      </section>

      <section>
        <h2 className="font-bold mb-2">Wellness (latest 7)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border">
              <th className="text-left py-1">Date</th>
              <th className="text-left py-1">Readiness</th>
              <th className="text-left py-1">Mood</th>
              <th className="text-left py-1">Energy</th>
            </tr>
          </thead>
          <tbody>
            {profile.wellnessReports.slice(0, 7).map((report) => (
              <tr key={report.id} className="border-b border-card-border/50">
                <td className="py-1">{formatDate(report.reportDate)}</td>
                <td className="py-1">{wellnessReadiness(report)}%</td>
                <td className="py-1">{report.mood}</td>
                <td className="py-1">{report.energy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-bold mb-2">Development goals</h2>
        <ul className="text-sm space-y-2">
          {profile.developmentGoals.length === 0 ? (
            <li className="text-muted">No goals</li>
          ) : (
            profile.developmentGoals.map((goal) => (
              <li key={goal.id}>
                <strong>{goal.title}</strong> — {goal.status}
                {goal.targetDate ? ` (target ${formatDate(goal.targetDate)})` : ""}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-bold mb-2">Active injuries</h2>
        <ul className="text-sm space-y-2">
          {profile.injuryReports.filter((i) => i.status !== "RESOLVED").length === 0 ? (
            <li className="text-muted">No active injuries</li>
          ) : (
            profile.injuryReports
              .filter((i) => i.status !== "RESOLVED")
              .map((injury) => (
                <li key={injury.id}>
                  {injury.bodyPart} — {injury.status} ({formatDate(injury.occurredAt)})
                </li>
              ))
          )}
        </ul>
      </section>
    </div>
  );
}
