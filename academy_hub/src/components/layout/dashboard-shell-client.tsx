"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Role } from "@prisma/client";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { BackToPitchIQ } from "@/components/layout/back-to-pitchiq";
import type { NavBadges } from "@/lib/dashboard-badges";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const roleLabel: Record<Role, string> = {
  [Role.ADMIN]: "admin",
  [Role.COACH]: "coach",
  [Role.PLAYER]: "player",
};

export function DashboardShellClient({
  role,
  displayRole,
  userName,
  nav,
  badges,
  children,
}: {
  role: Role;
  displayRole?: Role;
  userName: string;
  nav: NavItem[];
  badges?: NavBadges;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const shownRole = displayRole ?? role;

  return (
    <div className="min-h-screen flex">
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-card-border bg-card/95 backdrop-blur-md flex flex-col transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="p-6 border-b border-card-border flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch text-accent font-display font-bold text-sm">
              FA
            </span>
            <div>
              <p className="font-display font-semibold text-sm leading-tight tracking-wide">
                Academy Hub
              </p>
              <p className="text-xs text-muted capitalize">{roleLabel[shownRole]}</p>
            </div>
          </Link>
          <button
            type="button"
            className="lg:hidden rounded-lg p-2 text-muted hover:text-foreground hover:bg-background"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="mb-4 pb-4 border-b border-card-border">
            <BackToPitchIQ className="w-full justify-center" />
          </div>
          <DashboardNav items={nav} badges={badges} onNavigate={() => setOpen(false)} />
        </nav>
        <div className="p-4 border-t border-card-border space-y-2">
          <p className="text-xs text-muted truncate">{userName}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-card-border bg-background/90 backdrop-blur px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden rounded-lg p-2 text-muted hover:text-foreground hover:bg-card"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BackToPitchIQ compact />
          <span className="text-xs text-muted hidden sm:inline">
            Return to game video &amp; analytics
          </span>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl flex-1">{children}</div>
      </main>
    </div>
  );
}
