import type { WellnessReport } from "@prisma/client";

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function dateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function wellnessReadiness(report?: WellnessReport | null) {
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
