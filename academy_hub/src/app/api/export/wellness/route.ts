import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/export-csv";
import { wellnessReadiness } from "@/lib/performance";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== Role.COACH && session.user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const reports = await prisma.wellnessReport.findMany({
    where: coachId ? { player: { coachId } } : undefined,
    include: {
      player: { include: { user: { select: { name: true } } } },
    },
    orderBy: { reportDate: "desc" },
  });

  const csv = toCsv(
    ["Player", "Date", "Mood", "Energy", "Sleep", "Stress", "Soreness", "Readiness %", "Comment"],
    reports.map((report) => [
      report.player.user.name,
      report.reportDate.toISOString().slice(0, 10),
      report.mood,
      report.energy,
      report.sleep,
      report.stress,
      report.soreness,
      wellnessReadiness(report),
      report.comment,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wellness-export.csv"',
    },
  });
}
