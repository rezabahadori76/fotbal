import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "muted";

const styles: Record<BadgeVariant, string> = {
  default: "bg-accent/15 text-accent border-accent/30",
  success: "bg-accent/15 text-accent border-accent/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  muted: "bg-card-border/50 text-muted border-card-border",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
