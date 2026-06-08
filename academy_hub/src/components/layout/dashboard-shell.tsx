import Link from "next/link";
import { Role } from "@prisma/client";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { BackToPitchIQ } from "@/components/layout/back-to-pitchiq";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const navByRole: Record<Role, NavItem[]> = {
  [Role.ADMIN]: [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/questions", label: "Questions", icon: <MessageSquare className="h-4 w-4" /> },
    {
      href: "/admin/assignments",
      label: "Assign questions",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    { href: "/admin/responses", label: "Player responses", icon: <Shield className="h-4 w-4" /> },
  ],
  [Role.COACH]: [
    { href: "/coach", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/coach/players", label: "Players", icon: <Users className="h-4 w-4" /> },
    { href: "/coach/questions", label: "Ask questions", icon: <MessageSquare className="h-4 w-4" /> },
    { href: "/coach/statistics", label: "Statistics", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/coach/responses", label: "Responses", icon: <Shield className="h-4 w-4" /> },
  ],
  [Role.PLAYER]: [
    { href: "/player", label: "My questions", icon: <MessageSquare className="h-4 w-4" /> },
  ],
};

const roleLabel: Record<Role, string> = {
  [Role.ADMIN]: "admin",
  [Role.COACH]: "coach",
  [Role.PLAYER]: "player",
};

export function DashboardShell({
  role,
  userName,
  children,
}: {
  role: Role;
  userName: string;
  children: React.ReactNode;
}) {
  const nav = navByRole[role];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-card-border bg-card/80 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-card-border">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pitch text-accent font-display font-bold text-sm">
              FA
            </span>
            <div>
              <p className="font-display font-semibold text-sm leading-tight tracking-wide">
                Academy Hub
              </p>
              <p className="text-xs text-muted capitalize">{roleLabel[role]}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="mb-4 pb-4 border-b border-card-border">
            <BackToPitchIQ className="w-full justify-center" />
          </div>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-card-border space-y-2">
          <p className="text-xs text-muted truncate">{userName}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-card-border bg-background/90 backdrop-blur px-6 py-3 lg:px-8">
          <BackToPitchIQ compact />
          <span className="text-xs text-muted hidden sm:inline">
            Return to game video &amp; analytics
          </span>
        </div>
        <div className="p-8 max-w-6xl flex-1">{children}</div>
      </main>
    </div>
  );
}
