import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/export-csv";
import { trainingLoadScore } from "@/lib/training-load";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== Role.COACH && session.user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const reports = await prisma.trainingLoadReport.findMany({
    where: coachId ? { player: { coachId } } : undefined,
    include: {
      player: { include: { user: { select: { name: true } } } },
      event: { select: { title: true } },
    },
    orderBy: { sessionDate: "desc" },
  });

  const csv = toCsv(
    ["Player", "Date", "RPE", "Duration", "Load", "Type", "Event", "Notes"],
    reports.map((report) => [
      report.player.user.name,
      report.sessionDate.toISOString().slice(0, 10),
      report.rpe,
      report.durationMinutes,
      trainingLoadScore(report.rpe, report.durationMinutes),
      report.sessionType,
      report.event?.title ?? "",
      report.notes,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="training-load-export.csv"',
    },
  });
}
