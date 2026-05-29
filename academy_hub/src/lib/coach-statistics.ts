import { prisma } from "@/lib/prisma";
import { isAnswered } from "@/lib/assignments";
import { getOptionsList, getOptionLabel, getSelectedOptionText } from "@/lib/questions";

export async function getCoachStatistics(coachId?: string) {
  const assignments = await prisma.questionAssignment.findMany({
    where: coachId ? { coachId } : {},
    include: {
      question: true,
      answer: true,
      player: { include: { user: { select: { name: true } } } },
    },
  });

  const total = assignments.length;
  const answeredList = assignments.filter(isAnswered);
  const pending = total - answeredList.length;
  const responseRate = total > 0 ? Math.round((answeredList.length / total) * 100) : 0;

  const byCategory = new Map<string, { total: number; answered: number }>();

  for (const a of assignments) {
    const cat = a.question.category ?? "General";
    const entry = byCategory.get(cat) ?? { total: 0, answered: 0 };
    entry.total += 1;
    if (isAnswered(a)) entry.answered += 1;
    byCategory.set(cat, entry);
  }

  const categoryStats = [...byCategory.entries()]
    .map(([category, { total: t, answered: ans }]) => ({
      category,
      total: t,
      answered: ans,
      rate: t > 0 ? Math.round((ans / t) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const questionMap = new Map<
    string,
    {
      questionText: string;
      category: string | null;
      options: string[];
      counts: [number, number, number, number];
      total: number;
    }
  >();

  for (const a of answeredList) {
    if (a.answer == null) continue;
    const key = a.questionId;
    let entry = questionMap.get(key);
    if (!entry) {
      entry = {
        questionText: a.question.text,
        category: a.question.category,
        options: getOptionsList(a.question),
        counts: [0, 0, 0, 0],
        total: 0,
      };
      questionMap.set(key, entry);
    }
    entry.total += 1;
    const idx = a.answer.selectedOption;
    if (idx >= 0 && idx <= 3) entry.counts[idx] += 1;
  }

  const questionStats = [...questionMap.values()]
    .map((q) => ({
      ...q,
      breakdown: q.options.map((label, i) => ({
        label,
        option: getOptionLabel(i),
        count: q.counts[i],
        percent: q.total > 0 ? Math.round((q.counts[i] / q.total) * 100) : 0,
      })),
    }))
    .sort((a, b) => b.total - a.total);

  const playerMap = new Map<string, { name: string; answered: number; total: number }>();
  for (const a of assignments) {
    const id = a.playerId;
    const entry = playerMap.get(id) ?? {
      name: a.player.user.name,
      answered: 0,
      total: 0,
    };
    entry.total += 1;
    if (isAnswered(a)) entry.answered += 1;
    playerMap.set(id, entry);
  }

  const playerStats = [...playerMap.values()]
    .map((p) => ({
      ...p,
      rate: p.total > 0 ? Math.round((p.answered / p.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const recentAnswers = answeredList
    .filter((a) => a.answer)
    .sort((a, b) => b.answer!.createdAt.getTime() - a.answer!.createdAt.getTime())
    .slice(0, 8)
    .map((a) => ({
      playerName: a.player.user.name,
      question: a.question.text,
      answer: getSelectedOptionText(a.question, a.answer!.selectedOption),
      option: getOptionLabel(a.answer!.selectedOption),
      at: a.answer!.createdAt,
    }));

  return {
    overview: { total, answered: answeredList.length, pending, responseRate },
    categoryStats,
    questionStats,
    playerStats,
    recentAnswers,
  };
}
