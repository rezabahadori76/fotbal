import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  detail?: string;
};

export function TodayChecklist({ items }: { items: ChecklistItem[] }) {
  const pending = items.filter((item) => !item.done).length;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Today&apos;s checklist</h2>
          <p className="text-sm text-muted">
            {pending === 0 ? "You are all caught up." : `${pending} item${pending === 1 ? "" : "s"} need attention`}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
            pending === 0
              ? "border-accent/30 bg-accent/15 text-accent"
              : "border-warning/30 bg-warning/15 text-warning",
          )}
        >
          {pending === 0 ? "Complete" : `${pending} pending`}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
              item.done
                ? "border-card-border/60 bg-background/30"
                : "border-warning/30 bg-warning/5 hover:border-warning/50",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  item.done ? "bg-accent/20 text-accent" : "bg-warning/20 text-warning",
                )}
              >
                {item.done ? "✓" : "!"}
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", item.done && "text-muted")}>{item.label}</p>
                {item.detail && <p className="text-xs text-muted truncate">{item.detail}</p>}
              </div>
            </div>
            {!item.done && <span className="text-xs font-semibold text-accent shrink-0">Open</span>}
          </Link>
        ))}
      </div>
    </Card>
  );
}
