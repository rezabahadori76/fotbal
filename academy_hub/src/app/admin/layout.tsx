import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getNavBadges } from "@/lib/dashboard-badges";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.ADMIN);
  const badges = await getNavBadges(Role.ADMIN, session.user.id);

  return (
    <DashboardShell
      role={Role.ADMIN}
      userName={session.user.name ?? session.user.email}
      badges={badges}
    >
      {children}
    </DashboardShell>
  );
}
