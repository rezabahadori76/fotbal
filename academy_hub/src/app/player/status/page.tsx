import { Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { WellnessReportForm } from "@/components/player/wellness-report-form";
import { WellnessReportCard } from "@/components/player/wellness-report-card";

export default async function PlayerStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: { wellnessReports: { orderBy: { reportDate: "desc" }, take: 14 } },
  });

  const { add } = await searchParams;

  if (!profile) {
    return (
      <Card>
        <p className="text-muted">Your player profile is not set up. Contact your coach.</p>
      </Card>
    );
  }

  if (add === "true") {
    return (
      <div className="space-y-6 max-w-md mx-auto sm:max-w-full relative">
        <Link href="/player/status" className="absolute left-0 top-0 p-2 z-10">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground fill-none stroke-current stroke-2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Link>
        <h2 className="font-display text-lg font-semibold mx-auto text-center mb-6 pt-2">Add Wellness Report</h2>
        <WellnessReportForm />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto sm:max-w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">Readiness Status</h1>
          <p className="text-muted text-sm mt-1">
            {new Date().toLocaleDateString("en-US")} •{" "}
            {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      <Link href="/player/status?add=true" className="block w-full">
        <div className="w-full text-center rounded-full bg-cta text-cta-foreground font-semibold py-3.5 text-sm hover:bg-white transition-colors">
          + Add Wellness Report
        </div>
      </Link>

      <section className="space-y-4 pt-4">
        {profile.wellnessReports.length === 0 ? (
          <p className="text-muted text-center py-8">No wellness reports yet.</p>
        ) : (
          <div className="grid gap-4">
            {profile.wellnessReports.map((report) => (
              <WellnessReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
