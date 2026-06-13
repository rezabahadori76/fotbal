"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs: { name: string; href: string; exact?: boolean }[] = [
  { name: "Summary", href: "/player", exact: true },
  { name: "Status", href: "/player/status" },
  { name: "Events", href: "/player/events" },
  { name: "Injuries", href: "/player/injuries" },
  { name: "Questions", href: "/player/questions" },
];

export function PlayerTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-6 border-b border-card-border mb-8 overflow-x-auto pb-[2px] hide-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "whitespace-nowrap pb-3 text-sm font-semibold transition-colors relative",
              isActive ? "text-foreground" : "text-muted hover:text-foreground/80"
            )}
          >
            {tab.name}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground rounded-t-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
