import type { TrainingLoadReport } from "@prisma/client";

export function trainingLoadScore(rpe: number, durationMinutes: number) {
  return rpe * durationMinutes;
}

export function weeklyTrainingLoad(
  reports: Pick<TrainingLoadReport, "sessionDate" | "rpe" | "durationMinutes">[],
  days = 7,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return reports
    .filter((report) => new Date(report.sessionDate) >= cutoff)
    .reduce((sum, report) => sum + trainingLoadScore(report.rpe, report.durationMinutes), 0);
}

export function dailyTrainingLoad(
  reports: Pick<TrainingLoadReport, "sessionDate" | "rpe" | "durationMinutes">[],
  days = 7,
) {
  const map = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  for (const report of reports) {
    const date = new Date(report.sessionDate);
    if (date < cutoff) continue;
    const key = date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + trainingLoadScore(report.rpe, report.durationMinutes));
  }

  const points: { date: string; load: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      load: map.get(key) ?? 0,
    });
  }

  return points;
}

export function loadLabel(total: number) {
  if (total >= 2500) return "High";
  if (total >= 1500) return "Moderate";
  if (total > 0) return "Light";
  return "No data";
}

export const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  MATCH: "Match",
  RECOVERY: "Recovery",
  OTHER: "Other",
};
