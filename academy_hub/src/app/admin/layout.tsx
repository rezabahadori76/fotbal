import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(Role.ADMIN);

  return (
    <DashboardShell role={Role.ADMIN} userName={session.user.name ?? session.user.email}>
      {children}
    </DashboardShell>
  );
}
