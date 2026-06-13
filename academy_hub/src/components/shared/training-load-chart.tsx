import { cn } from "@/lib/utils";

export function TrainingLoadChart({
  points,
  className,
}: {
  points: { date: string; load: number }[];
  className?: string;
}) {
  if (points.every((p) => p.load === 0)) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-card-border p-6 text-center", className)}>
        <p className="text-sm text-muted">No training load logged yet.</p>
      </div>
    );
  }

  const width = 320;
  const height = 140;
  const padding = 20;
  const max = Math.max(...points.map((p) => p.load), 1);
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    ...point,
    x: padding + index * step,
    y: height - padding - (point.load / max) * (height - padding * 2),
  }));

  return (
    <div className={cn("space-y-3", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {coords.map((point) => (
          <rect
            key={point.date}
            x={point.x - 10}
            y={point.y}
            width="20"
            height={height - padding - point.y}
            className="fill-pitch/80"
            rx="4"
          />
        ))}
        {coords.map((point) => (
          <text key={`${point.date}-label`} x={point.x} y={height - 4} textAnchor="middle" className="fill-muted text-[8px]">
            {point.date}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2">
        {coords.map((point) => (
          <span key={`${point.date}-badge`} className="rounded-full border border-card-border bg-card px-2 py-1 text-[10px] text-muted">
            {point.date}: <span className="font-semibold text-foreground">{point.load}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
