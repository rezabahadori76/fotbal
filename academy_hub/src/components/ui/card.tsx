import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-card-border bg-card/90 backdrop-blur-md p-6 shadow-xl shadow-black/30",
        className,
      )}
      {...props}
    />
  );
}
