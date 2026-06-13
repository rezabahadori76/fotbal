import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getNavBadges } from "@/lib/dashboard-badges";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.PLAYER);
  const badges = await getNavBadges(Role.PLAYER, session.user.id);

  return (
    <DashboardShell
      role={Role.PLAYER}
      userName={session.user.name ?? session.user.email}
      badges={badges}
    >
      {children}
    </DashboardShell>
  );
}
