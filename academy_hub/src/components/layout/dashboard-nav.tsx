"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavBadges } from "@/lib/dashboard-badges";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function DashboardNav({
  items,
  badges,
  onNavigate,
}: {
  items: NavItem[];
  badges?: NavBadges;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
          (item.href !== "/" && pathname.startsWith(item.href) && item.href.length > 1);
        const active =
          item.href === "/player" || item.href === "/coach" || item.href === "/admin"
            ? pathname === item.href
            : isActive;
        const badge = badges?.[item.href] ?? 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-background text-foreground font-semibold"
                : "text-muted hover:text-foreground hover:bg-background",
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {badge > 0 && (
              <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
