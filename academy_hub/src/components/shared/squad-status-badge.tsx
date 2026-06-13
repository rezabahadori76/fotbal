import { cn } from "@/lib/utils";
import { squadStatusLabel, type SquadStatus } from "@/lib/performance";

const styles: Record<SquadStatus, string> = {
  ready: "bg-accent/15 text-accent border-accent/30",
  missing_wellness: "bg-warning/15 text-warning border-warning/30",
  injured: "bg-danger/15 text-danger border-danger/30",
  pending_questions: "bg-info/15 text-info border-info/30",
};

export function SquadStatusBadge({ status }: { status: SquadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[status],
      )}
    >
      {squadStatusLabel(status)}
    </span>
  );
}
