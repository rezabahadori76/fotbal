import type { WellnessReport } from "@prisma/client";

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function dateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function wellnessReadiness(
  report?: Pick<WellnessReport, "mood" | "energy" | "sleep" | "stress" | "soreness"> | null,
) {
  if (!report) return 0;
  const stressPenalty = 11 - report.stress;
  const sorenessPenalty = 11 - report.soreness;
  return Math.round(((report.mood + report.energy + report.sleep + stressPenalty + sorenessPenalty) / 50) * 100);
}

export function wellnessLabel(value: number) {
  if (value >= 85) return "Amazing";
  if (value >= 70) return "Ready";
  if (value >= 50) return "Moderate";
  if (value > 0) return "Low";
  return "Not enough data";
}

export function scoreLabel(label: string, value: number) {
  if (label === "Stress" || label === "Soreness") {
    if (value <= 3) return `Mild ${label.toLowerCase()}`;
    if (value <= 6) return `Moderate ${label.toLowerCase()}`;
    return `High ${label.toLowerCase()}`;
  }

  if (value >= 8) return `Great ${label.toLowerCase()}`;
  if (value >= 5) return `Moderate ${label.toLowerCase()}`;
  return `Low ${label.toLowerCase()}`;
}

export function statusColorClass(value: number) {
  if (value >= 8) return "text-accent";
  if (value >= 5) return "text-warning";
  return "text-danger";
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date | string, b: Date = startOfToday()) {
  return new Date(a).toDateString() === b.toDateString();
}

export function moodEmoji(mood: number) {
  if (mood >= 8) return "😃";
  if (mood >= 6) return "😊";
  if (mood >= 4) return "😐";
  if (mood >= 2) return "🙁";
  return "😩";
}

export function moodText(mood: number) {
  if (mood >= 8) return "Happy";
  if (mood >= 6) return "Good";
  if (mood >= 4) return "Okay";
  if (mood >= 2) return "Down";
  return "Terrible";
}

export type SquadStatus = "ready" | "missing_wellness" | "injured" | "pending_questions";

export function squadStatusPriority(status: SquadStatus) {
  const order: Record<SquadStatus, number> = {
    injured: 0,
    missing_wellness: 1,
    pending_questions: 2,
    ready: 3,
  };
  return order[status];
}

export function squadStatusLabel(status: SquadStatus) {
  switch (status) {
    case "ready":
      return "Ready";
    case "missing_wellness":
      return "No wellness today";
    case "injured":
      return "Injured";
    case "pending_questions":
      return "Unanswered questions";
  }
}
