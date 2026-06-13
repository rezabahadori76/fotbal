import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/export-csv";
import { isAnswered } from "@/lib/assignments";
import { getOptionLabel } from "@/lib/questions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== Role.COACH && session.user.role !== Role.ADMIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const assignments = await prisma.questionAssignment.findMany({
    where: coachId ? { coachId } : undefined,
    include: {
      player: { include: { user: { select: { name: true } } } },
      question: true,
      answer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    ["Player", "Question", "Category", "Status", "Answer", "Answer text", "Sent", "Answered"],
    assignments.map((assignment) => [
      assignment.player.user.name,
      assignment.question.text,
      assignment.question.category,
      isAnswered(assignment) ? "ANSWERED" : "PENDING",
      assignment.answer ? getOptionLabel(assignment.answer.selectedOption) : "",
      assignment.answer?.text ?? "",
      assignment.createdAt.toISOString(),
      assignment.answer?.createdAt.toISOString() ?? "",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="responses-export.csv"',
    },
  });
}
