import { Role } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.COACH, Role.ADMIN);

  return (
    <DashboardShell role={Role.COACH} userName={session.user.name ?? session.user.email}>
      {children}
    </DashboardShell>
  );
}
