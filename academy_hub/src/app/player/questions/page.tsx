import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { AnswerForm } from "@/components/player/answer-form";
import { getOptionsList, getOptionLabel } from "@/lib/questions";
import { isAnswered } from "@/lib/assignments";

export default async function PlayerQuestionsPage() {
  const session = await requireRole(Role.PLAYER);

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <Card>
        <p className="text-muted">Your player profile is not set up. Contact your coach.</p>
      </Card>
    );
  }

  const assignments = await prisma.questionAssignment.findMany({
    where: { playerId: profile.id },
    include: { question: true, answer: true, coach: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const toAnswer = assignments.filter((a) => !isAnswered(a));
  const completed = assignments.filter(isAnswered);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">My questions</h1>
        <p className="text-muted mt-1">Choose one of four options for each question</p>
      </div>

      {toAnswer.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">To answer</h2>
          {toAnswer.map((a) => {
            const options = getOptionsList(a.question);
            return (
              <Card key={a.id} className="space-y-4">
                <p className="font-medium">{a.question.text}</p>
                <p className="text-xs text-muted">
                  From Coach {a.coach.name}
                  {a.dueDate ? ` · Due ${formatDate(a.dueDate)}` : ""}
                </p>
                <AnswerForm
                  assignmentId={a.id}
                  options={[options[0], options[1], options[2], options[3]]}
                />
              </Card>
            );
          })}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-accent">Completed</h2>
          {completed.map((a) => (
            <Card key={a.id} className="space-y-3 opacity-90">
              <p className="font-medium">{a.question.text}</p>
              {a.answer && (
                <div className="rounded-xl bg-background border border-card-border p-4 text-sm">
                  <span className="font-display font-semibold text-accent">
                    {getOptionLabel(a.answer.selectedOption)}
                  </span>{" "}
                  - {a.answer.text}
                </div>
              )}
              <p className="text-xs text-muted">{formatDate(a.createdAt)}</p>
            </Card>
          ))}
        </section>
      )}

      {assignments.length === 0 && (
        <Card>
          <p className="text-muted">No questions right now. Check back after training.</p>
        </Card>
      )}
    </div>
  );
}
