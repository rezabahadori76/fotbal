import { Role } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { WellnessReportForm } from "@/components/player/wellness-report-form";
import { scoreLabel, wellnessReadiness } from "@/lib/performance";
import { cn } from "@/lib/utils";

const emojiForMood = (mood: number) => {
  if (mood >= 8) return "😃";
  if (mood >= 6) return "😊";
  if (mood >= 4) return "😐";
  if (mood >= 2) return "🙁";
  return "😩";
};

const textForMood = (mood: number) => {
  if (mood >= 8) return "Happy";
  if (mood >= 6) return "Good";
  if (mood >= 4) return "Okay";
  if (mood >= 2) return "Down";
  return "Terrible";
};

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
          <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString('en-US')} • {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-warning fill-none stroke-current stroke-[4]">
            <circle cx="12" cy="12" r="8" strokeDasharray="50" strokeDashoffset="10" />
          </svg>
        </div>
      </div>

      <Link href="/player/status?add=true" className="block w-full">
        <div className="w-full text-center rounded-full bg-[#E5E5E5] text-black font-semibold py-3.5 text-sm hover:bg-white transition-colors">
          + Add Wellness Report
        </div>
      </Link>

      <section className="space-y-4 pt-4">
        {profile.wellnessReports.length === 0 ? (
          <p className="text-muted text-center py-8">No wellness reports yet.</p>
        ) : (
          <div className="grid gap-4">
            {profile.wellnessReports.map((report) => {
              const readiness = wellnessReadiness(report);
              return (
                <div key={report.id} className="rounded-2xl border border-card-border bg-background/50 p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Wellness Report</h2>
                      <p className="text-sm text-muted">Submitted at {new Date(report.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <button className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold border border-card-border text-foreground hover:bg-card/80">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                      More
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {/* Date Card */}
                    <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center gap-2 h-[84px]">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 text-muted fill-none stroke-current stroke-2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span className="text-xs font-semibold">{report.reportDate.toLocaleDateString('en-US')}</span>
                    </div>
                    {/* Mood Card */}
                    <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center gap-2 h-[84px]">
                      <span className="text-2xl">{emojiForMood(report.mood)}</span>
                      <span className="text-xs font-semibold text-muted">{textForMood(report.mood)}</span>
                    </div>
                    {/* Readiness Donut Card */}
                    <div className="rounded-xl bg-card border border-card-border/50 p-3 flex flex-col items-center justify-center h-[84px]">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full text-muted/30 fill-none stroke-current stroke-[4]">
                          <circle cx="12" cy="12" r="9" />
                          <circle cx="12" cy="12" r="9" className="text-warning stroke-current" strokeDasharray="56" strokeDashoffset={56 - (56 * readiness) / 100} />
                        </svg>
                        <span className="text-[11px] font-bold z-10">{readiness}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Energy", value: report.energy, colorClass: "bg-warning" },
                      { label: "Sleep", value: report.sleep, colorClass: "bg-accent" },
                      { label: "Stress", value: report.stress, colorClass: "bg-warning" },
                      { label: "Soreness", value: report.soreness, colorClass: "bg-accent" },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-xl bg-card border border-card-border/50 p-2.5 flex flex-col h-[84px]">
                        <p className="text-[11px] font-semibold text-foreground mb-1">{metric.label}</p>
                        <p className={cn("text-lg font-bold mb-auto", metric.colorClass.replace("bg-", "text-"))}>{metric.value}</p>
                        
                        <div className="w-full h-1 bg-background rounded-full overflow-hidden mb-2">
                          <div className={cn("h-full", metric.colorClass)} style={{ width: `${(metric.value / 10) * 100}%` }} />
                        </div>
                        
                        <div className={cn("rounded-sm px-1 py-0.5 text-[8px] font-bold text-center uppercase tracking-tighter truncate", metric.colorClass.replace("bg-", "text-"), metric.colorClass.replace("bg-", "bg-").concat("/20"))}>
                          {scoreLabel(metric.label, metric.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {report.comment && (
                    <div className="mt-3 p-3 rounded-xl bg-card border border-card-border/50">
                      <p className="text-xs font-semibold text-muted mb-1">Comment</p>
                      <p className="text-sm">{report.comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
