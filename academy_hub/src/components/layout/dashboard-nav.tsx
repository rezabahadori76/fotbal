"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function DashboardNav({ items }: { items: NavItem[] }) {
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

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-background text-foreground font-semibold"
                : "text-muted hover:text-foreground hover:bg-background",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
