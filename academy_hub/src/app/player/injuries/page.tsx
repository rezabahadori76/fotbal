import { InjuryStatus, Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { InjuryReportForm } from "@/components/player/injury-report-form";
import { InjuryStatusButton } from "@/components/player/injury-status-button";
import { formatDate } from "@/lib/utils";

export default async function PlayerInjuriesPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
    include: { injuryReports: { orderBy: { occurredAt: "desc" } } },
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
        <Link href="/player/injuries" className="absolute left-0 top-0 p-2 z-10">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground fill-none stroke-current stroke-2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Link>
        <InjuryReportForm />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto sm:max-w-full">
      <Link href="/player/injuries?add=true" className="block w-full">
        <div className="w-full text-center rounded-full bg-[#E5E5E5] text-black font-semibold py-3.5 text-sm hover:bg-white transition-colors flex items-center justify-center gap-2">
          <span>+</span> New Injury
        </div>
      </Link>

      <div className="pt-4">
        <h2 className="font-display text-lg font-semibold mb-4">Injuries</h2>
        
        <div className="grid grid-cols-[1fr_1fr_1fr] text-[10px] font-bold text-muted uppercase tracking-wider mb-2 px-2">
          <span>Body Part</span>
          <span>Type</span>
          <span>Date & Event</span>
        </div>
        <hr className="border-card-border/50 mb-4" />

        {profile.injuryReports.length === 0 ? (
          <p className="text-muted text-center py-8">No injuries reported.</p>
        ) : (
          <div className="grid gap-3">
            {profile.injuryReports.map((injury) => (
              <div key={injury.id} className="rounded-2xl border border-card-border bg-background/50 p-4">
                <div className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2">
                  <div>
                    <p className="font-semibold text-sm">{injury.bodyPart}</p>
                    {injury.specificPart && <p className="text-xs text-muted mt-0.5">{injury.specificPart}</p>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{injury.mechanism.replace("_", "-").toLowerCase()}</p>
                    <p className="text-xs text-muted mt-0.5">{injury.recurrence ? "Recurrence" : "First-time"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatDate(injury.occurredAt)}</p>
                    <span className="inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-danger/20 text-danger border border-danger/30">
                      {injury.status}
                    </span>
                  </div>
                </div>
                
                {injury.description && (
                  <p className="text-sm text-muted mt-4 p-3 bg-card rounded-xl border border-card-border/50">
                    {injury.description}
                  </p>
                )}
                
                {injury.status !== InjuryStatus.RESOLVED && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-card-border/50">
                    <InjuryStatusButton
                      injuryId={injury.id}
                      status={InjuryStatus.RECOVERING}
                      label="Mark recovering"
                    />
                    <InjuryStatusButton
                      injuryId={injury.id}
                      status={InjuryStatus.RESOLVED}
                      label="Mark resolved"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
