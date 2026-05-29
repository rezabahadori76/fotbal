import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AssignQuestionsForm } from "@/components/coach/assign-questions-form";
import { SaveCustomTemplateForm } from "@/components/coach/save-custom-template-form";

export default async function CoachQuestionsPage() {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.COACH ? session.user.id : undefined;

  const [players, questions] = await Promise.all([
    prisma.playerProfile.findMany({
      where: coachId ? { coachId } : {},
      include: { user: { select: { name: true } } },
    }),
    prisma.questionTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { category: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Ask questions</h1>
        <p className="text-muted mt-1">
          Send 4-option questions — players pick A, B, C, or D
        </p>
      </div>

      {session.user.role === Role.COACH && <SaveCustomTemplateForm />}

      <AssignQuestionsForm
        players={players.map((p) => ({ id: p.id, name: p.user.name }))}
        questions={questions.map((q) => ({
          id: q.id,
          text: q.text,
          category: q.category,
          type: q.type,
        }))}
      />
    </div>
  );
}
