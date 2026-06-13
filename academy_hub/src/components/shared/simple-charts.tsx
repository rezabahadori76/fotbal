import { cn } from "@/lib/utils";

type BarPoint = { label: string; value: number; colorClass?: string };

export function BarChart({
  data,
  maxValue,
  className,
}: {
  data: BarPoint[];
  maxValue?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No data yet.</p>;
  }

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium truncate pr-2">{point.label}</span>
            <span className="text-muted shrink-0">{point.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", point.colorClass ?? "bg-accent")}
              style={{ width: `${Math.min(100, (point.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  segments,
  size = 120,
}: {
  segments: { label: string; value: number; colorClass: string }[];
  size?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="text-sm text-muted">No data yet.</p>;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0">
        <circle cx="50" cy="50" r={radius} className="stroke-card-border fill-none" strokeWidth="12" />
        {segments.map((segment) => {
          const dash = (segment.value / total) * circumference;
          const circle = (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              className={cn("fill-none stroke-[12]", segment.colorClass)}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="50" y="54" textAnchor="middle" className="fill-foreground text-[11px] font-bold">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full", segment.colorClass.replace("stroke-", "bg-"))} />
            <span>{segment.label}</span>
            <span className="text-muted">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  points,
  className,
}: {
  points: { label: string; value: number }[];
  className?: string;
}) {
  if (points.length === 0) return <p className="text-sm text-muted">No data yet.</p>;

  const width = 320;
  const height = 140;
  const padding = 20;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    ...point,
    x: padding + index * step,
    y: height - padding - (point.value / max) * (height - padding * 2),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full h-auto", className)}>
      <polyline
        fill="none"
        points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
        className="stroke-pitch"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {coords.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" className="fill-accent" />
          <text x={point.x} y={height - 4} textAnchor="middle" className="fill-muted text-[8px]">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
