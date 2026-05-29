import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.PLAYER);

  return (
    <DashboardShell role={Role.PLAYER} userName={session.user.name ?? session.user.email}>
      {children}
    </DashboardShell>
  );
}
