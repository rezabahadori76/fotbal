import { Role } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getNavBadges } from "@/lib/dashboard-badges";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const badges = await getNavBadges(session.user.role, session.user.id);

  return (
    <DashboardShell
      role={Role.COACH}
      displayRole={session.user.role}
      userName={session.user.name ?? session.user.email}
      badges={badges}
    >
      {children}
    </DashboardShell>
  );
}
