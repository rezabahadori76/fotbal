import { prisma } from "@/lib/prisma";
import { AssignQuestionsForm } from "@/components/coach/assign-questions-form";

export default async function AdminAssignmentsPage() {
  const [players, questions] = await Promise.all([
    prisma.playerProfile.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.questionTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { category: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Assign questions</h1>
        <p className="text-muted mt-1">
          Send questions from the library (or create a one-off) to one or more players
        </p>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-muted">
          No players yet. Add players under Users and assign each one to a coach first.
        </p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted">
          No questions in the library yet. Create questions under Questions first.
        </p>
      ) : (
        <AssignQuestionsForm
          players={players.map((p) => ({ id: p.id, name: p.user.name }))}
          questions={questions.map((q) => ({
            id: q.id,
            text: q.text,
            category: q.category,
            type: q.type,
          }))}
        />
      )}
    </div>
  );
}
