import { Role } from "@prisma/client";
import { requireRole } from "@/lib/session";
import { getCoachStatistics } from "@/lib/coach-statistics";
import { StatisticsView } from "@/components/coach/statistics-view";

export default async function CoachStatisticsPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const stats = await getCoachStatistics(coachId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Squad statistics</h1>
        <p className="text-muted mt-1">
          Response rates and how players answered your 4-option questions
        </p>
      </div>
      <StatisticsView stats={stats} />
    </div>
  );
}
