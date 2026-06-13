import { Role } from "@prisma/client";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Shield,
  Target,
  Users,
  Dumbbell,
} from "lucide-react";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import type { NavBadges } from "@/lib/dashboard-badges";

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
    { href: "/admin/events", label: "Events", icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/admin/health", label: "Health", icon: <HeartPulse className="h-4 w-4" /> },
    { href: "/admin/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
    { href: "/admin/goals", label: "Development goals", icon: <Target className="h-4 w-4" /> },
    { href: "/admin/responses", label: "Player responses", icon: <Shield className="h-4 w-4" /> },
  ],
  [Role.COACH]: [
    { href: "/coach", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/coach/players", label: "Players", icon: <Users className="h-4 w-4" /> },
    { href: "/coach/events", label: "Events", icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/coach/health", label: "Health", icon: <HeartPulse className="h-4 w-4" /> },
    { href: "/coach/announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
    { href: "/coach/goals", label: "Development goals", icon: <Target className="h-4 w-4" /> },
    { href: "/coach/questions", label: "Ask questions", icon: <MessageSquare className="h-4 w-4" /> },
    { href: "/coach/statistics", label: "Statistics", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/coach/responses", label: "Responses", icon: <Shield className="h-4 w-4" /> },
  ],
  [Role.PLAYER]: [
    { href: "/player", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/player/status", label: "Status", icon: <HeartPulse className="h-4 w-4" /> },
    { href: "/player/training", label: "Training load", icon: <Dumbbell className="h-4 w-4" /> },
    { href: "/player/goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
    { href: "/player/events", label: "Events", icon: <CalendarDays className="h-4 w-4" /> },
    { href: "/player/injuries", label: "Injuries", icon: <Shield className="h-4 w-4" /> },
    { href: "/player/questions", label: "Questions", icon: <MessageSquare className="h-4 w-4" /> },
  ],
};

export function DashboardShell({
  role,
  userName,
  badges,
  displayRole,
  children,
}: {
  role: Role;
  userName: string;
  badges?: NavBadges;
  displayRole?: Role;
  children: React.ReactNode;
}) {
  const nav = navByRole[role];

  return (
    <DashboardShellClient
      role={role}
      displayRole={displayRole}
      userName={userName}
      nav={nav}
      badges={badges}
    >
      {children}
    </DashboardShellClient>
  );
}
