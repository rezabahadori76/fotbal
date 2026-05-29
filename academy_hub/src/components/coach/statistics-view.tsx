import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { getCoachStatistics } from "@/lib/coach-statistics";

type Stats = Awaited<ReturnType<typeof getCoachStatistics>>;

export function StatisticsView({ stats }: { stats: Stats }) {
  const { overview, categoryStats, questionStats, playerStats, recentAnswers } = stats;

  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">By category</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {categoryStats.length === 0 ? (
            <Card>
              <p className="text-muted text-sm">No data yet.</p>
            </Card>
          ) : (
            categoryStats.map((c) => (
              <Card key={c.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="text-muted">
                    {c.answered}/{c.total} · {c.rate}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${c.rate}%` }}
                  />
                </div>
              </Card>
            ))
          )}
        </div>
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
              <div className="space-y-2">
                {q.breakdown.map((b) => (
                  <div key={b.option} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        <span className="font-display font-semibold text-accent">{b.option}</span>{" "}
                        {b.label}
                      </span>
                      <span className="text-muted">
                        {b.count} ({b.percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-background overflow-hidden">
                      <div
                        className="h-full bg-pitch rounded-full"
                        style={{ width: `${b.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Player response rates</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {playerStats.map((p) => (
            <Card key={p.name} className="flex justify-between items-center">
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-muted">
                {p.answered}/{p.total} ({p.rate}%)
              </span>
            </Card>
          ))}
        </div>
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
