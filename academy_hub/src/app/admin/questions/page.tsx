import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateQuestionForm } from "@/components/admin/create-question-form";
import { OPTION_LABELS } from "@/lib/questions";

export default async function AdminQuestionsPage() {
  const questions = await prisma.questionTemplate.findMany({
    orderBy: [{ type: "asc" }, { category: "asc" }],
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Question library</h1>
        <p className="text-muted mt-1">
          Design multiple-choice questions for the academy. Assign them to players from Assign
          questions.
        </p>
      </div>

      <CreateQuestionForm />

      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id} className="space-y-3 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{q.text}</p>
                <p className="text-xs text-muted mt-1">
                  {q.category ?? "General"}
                  {q.author ? ` · by ${q.author.name}` : ""}
                </p>
              </div>
              <Badge variant={q.type === "PREDEFINED" ? "success" : "muted"}>{q.type}</Badge>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2 text-sm text-muted">
              {OPTION_LABELS.map((label, i) => (
                <li key={label}>
                  <span className="font-display text-accent font-semibold">{label}</span>{" "}
                  {[q.optionA, q.optionB, q.optionC, q.optionD][i]}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
