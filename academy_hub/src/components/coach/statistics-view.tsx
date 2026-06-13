import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { BarChart, DonutChart } from "@/components/shared/simple-charts";
import { ExportButtons } from "@/components/coach/export-buttons";
import type { getCoachStatistics } from "@/lib/coach-statistics";

type Stats = Awaited<ReturnType<typeof getCoachStatistics>>;

export function StatisticsView({ stats }: { stats: Stats }) {
  const { overview, categoryStats, questionStats, playerStats, recentAnswers } = stats;

  const donutSegments = [
    { label: "Answered", value: overview.answered, colorClass: "stroke-accent" },
    { label: "Pending", value: overview.pending, colorClass: "stroke-warning" },
  ].filter((s) => s.value > 0);

  const playerBarData = playerStats.map((p) => ({
    label: p.name,
    value: p.rate,
    colorClass: p.rate >= 80 ? "bg-accent" : p.rate >= 50 ? "bg-warning" : "bg-danger",
  }));

  const categoryBarData = categoryStats.map((c) => ({
    label: c.category,
    value: c.rate,
    colorClass: "bg-pitch",
  }));

  return (
    <div className="space-y-8">
      <ExportButtons
        wellnessHref="/hub/api/export/wellness"
        responsesHref="/hub/api/export/responses"
        trainingLoadHref="/hub/api/export/training-load"
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-3xl font-display font-bold">{overview.total}</p>
          <p className="text-sm text-muted">Questions sent</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-accent">{overview.answered}</p>
          <p className="text-sm text-muted">Answered</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold text-warning">{overview.pending}</p>
          <p className="text-sm text-muted">Pending</p>
        </Card>
        <Card>
          <p className="text-3xl font-display font-bold">{overview.responseRate}%</p>
          <p className="text-sm text-muted">Response rate</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Response overview</h2>
          <DonutChart segments={donutSegments} />
        </Card>
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Player response rates</h2>
          <BarChart data={playerBarData} />
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">By category</h2>
        <Card>
          <BarChart data={categoryBarData} />
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Answer distribution</h2>
        {questionStats.length === 0 ? (
          <Card>
            <p className="text-muted text-sm">No answered questions yet.</p>
          </Card>
        ) : (
          questionStats.map((q) => (
            <Card key={q.questionText} className="space-y-3">
              <div>
                <p className="font-medium">{q.questionText}</p>
                <p className="text-xs text-muted">{q.category} · {q.total} responses</p>
              </div>
              <BarChart
                data={q.breakdown.map((b) => ({
                  label: `${b.option} ${b.label}`,
                  value: b.percent,
                  colorClass: "bg-pitch",
                }))}
              />
            </Card>
          ))
        )}
      </section>

      {recentAnswers.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Recent answers</h2>
          <div className="space-y-2">
            {recentAnswers.map((r, i) => (
              <Card key={i} className="py-3 text-sm">
                <p className="font-medium">{r.playerName}</p>
                <p className="text-muted mt-1">{r.question}</p>
                <p className="mt-1">
                  <span className="font-display text-accent font-semibold">{r.option}</span> — {r.answer}
                </p>
                <p className="text-xs text-muted mt-1">{formatDate(r.at)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
