import { cn } from "@/lib/utils";
import { wellnessLabel, wellnessReadiness } from "@/lib/performance";
import type { WellnessReport } from "@prisma/client";

type Point = { date: string; value: number; label: string };

export function WellnessChart({
  reports,
  className,
}: {
  reports: Pick<WellnessReport, "reportDate" | "mood" | "energy" | "sleep" | "stress" | "soreness">[];
  className?: string;
}) {
  const points: Point[] = [...reports]
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .slice(-7)
    .map((report) => ({
      date: new Date(report.reportDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: wellnessReadiness(report),
      label: wellnessLabel(wellnessReadiness(report)),
    }));

  if (points.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-card-border p-6 text-center", className)}>
        <p className="text-sm text-muted">No wellness data yet.</p>
      </div>
    );
  }

  const max = 100;
  const width = 280;
  const height = 120;
  const padding = 16;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding + index * step;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { ...point, x, y };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={cn("space-y-4", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {[25, 50, 75].map((tick) => {
          const y = height - padding - (tick / max) * (height - padding * 2);
          return (
            <line
              key={tick}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              className="stroke-card-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}
        <polyline
          fill="none"
          points={polyline}
          className="stroke-accent"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" className="fill-accent" />
            <text
              x={point.x}
              y={height - 2}
              textAnchor="middle"
              className="fill-muted text-[9px]"
            >
              {point.date}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2">
        {coords.map((point) => (
          <span
            key={`${point.date}-badge`}
            className="rounded-full border border-card-border bg-card px-2 py-1 text-[10px] text-muted"
          >
            {point.date}: <span className="font-semibold text-foreground">{point.value}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
