import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Plain anchor so navigation leaves /hub and returns to PitchIQ at site root. */
export function BackToPitchIQ({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <>
      {/* eslint-disable @next/next/no-html-link-for-pages -- leave /hub basePath for PitchIQ */}
      <a
        href="/"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 font-semibold text-accent transition-colors hover:bg-accent/20 hover:border-accent/50",
          compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm",
          className,
        )}
      >
        <ArrowLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Back to PitchIQ
      </a>
      {/* eslint-enable @next/next/no-html-link-for-pages */}
    </>
  );
}
