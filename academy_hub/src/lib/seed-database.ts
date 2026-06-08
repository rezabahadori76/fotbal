import { hash } from "bcryptjs";
import { AssignmentStatus, QuestionType, Role } from "@prisma/client";
import { resolvePlayerEmail } from "@/lib/player-profile";
import { prisma } from "@/lib/prisma";
import { getSelectedOptionText } from "@/lib/questions";
import { loadTeamRoster } from "@/lib/team-roster";

const PREDEFINED_QUESTIONS = [
  {
    text: "How did you feel during today's training session?",
    category: "Wellbeing",
    optionA: "Excellent — full of energy",
    optionB: "Good — normal effort",
    optionC: "Tired — below usual",
    optionD: "Struggling — need recovery",
  },
  {
    text: "Rate your energy level after the game.",
    category: "Fitness",
    optionA: "Very high (9–10)",
    optionB: "Moderate (6–8)",
    optionC: "Low (4–5)",
    optionD: "Very low (1–3)",
  },
  {
    text: "What was your main focus in training this week?",
    category: "Development",
    optionA: "Technical skills",
    optionB: "Tactical awareness",
    optionC: "Physical conditioning",
    optionD: "Mental / confidence",
  },
  {
    text: "Did you experience any pain or discomfort?",
    category: "Health",
    optionA: "No issues",
    optionB: "Minor soreness only",
    optionC: "Noticeable discomfort",
    optionD: "Pain — need to report",
  },
  {
    text: "How many hours of sleep did you get last night?",
    category: "Recovery",
    optionA: "8+ hours",
    optionB: "6–7 hours",
    optionC: "4–5 hours",
    optionD: "Less than 4 hours",
  },
  {
    text: "How confident do you feel about your role in the team?",
    category: "Mindset",
    optionA: "Very confident",
    optionB: "Fairly confident",
    optionC: "Unsure",
    optionD: "Not confident",
  },
];

/** PitchIQ demo login maps to this jersey on team 1. */
const DEMO_PLAYER = { jerseyNo: 26, name: "Enzo Lolos" };

export async function seedDatabase() {
  await prisma.answer.deleteMany();
  await prisma.questionAssignment.deleteMany();
  await prisma.questionTemplate.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("password123", 12);
  const roster = loadTeamRoster();

  const admin = await prisma.user.create({
    data: {
      email: "admin@academy.com",
      name: "Academy Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const coach = await prisma.user.create({
    data: {
      email: "coach@academy.com",
      name: "Alex Coach",
      passwordHash,
      role: Role.COACH,
    },
  });

  const profileByJersey = new Map<number, string>();

  for (const player of roster) {
    const isDemoLogin =
      player.number === DEMO_PLAYER.jerseyNo && player.name === DEMO_PLAYER.name;
    const emailResult = await resolvePlayerEmail(
      player.name,
      player.number,
      isDemoLogin ? "player@academy.com" : undefined,
    );
    if (typeof emailResult !== "string") {
      throw new Error(`Could not create email for ${player.name}: ${emailResult.error}`);
    }
    const email = emailResult;

    const user = await prisma.user.create({
      data: {
        name: player.name,
        email,
        passwordHash,
        role: Role.PLAYER,
        playerProfile: {
          create: {
            coachId: coach.id,
            position: player.position ?? undefined,
            squad: player.squad,
            jerseyNo: player.number,
          },
        },
      },
      include: { playerProfile: true },
    });

    if (user.playerProfile) {
      profileByJersey.set(player.number, user.playerProfile.id);
    }
  }

  await prisma.questionTemplate.createMany({
    data: PREDEFINED_QUESTIONS.map((q) => ({
      ...q,
      type: QuestionType.PREDEFINED,
    })),
  });

  const questions = await prisma.questionTemplate.findMany({ orderBy: { createdAt: "asc" } });
  if (questions.length === 0) {
    return buildResult(admin.id, roster.length);
  }

  const sampleQuestions = questions.slice(0, 5);
  const playerProfileIds = [...profileByJersey.values()];

  for (let i = 0; i < playerProfileIds.length; i += 1) {
    const playerId = playerProfileIds[i];
    const jerseyNo = roster[i]?.number ?? i + 1;

    for (let q = 0; q < sampleQuestions.length; q += 1) {
      const question = sampleQuestions[q];
      const selectedOption = (jerseyNo + i + q) % 4;

      const assignment = await prisma.questionAssignment.create({
        data: {
          coachId: coach.id,
          playerId,
          questionId: question.id,
          status: AssignmentStatus.ANSWERED,
        },
      });

      await prisma.answer.create({
        data: {
          assignmentId: assignment.id,
          selectedOption,
          text: getSelectedOptionText(question, selectedOption),
        },
      });
    }
  }

  return buildResult(admin.id, roster.length);
}

function buildResult(adminId: string, playerCount: number) {
  return {
    accounts: [
      { role: "admin", email: "admin@academy.com", password: "password123" },
      { role: "coach", email: "coach@academy.com", password: "password123" },
      {
        role: "player",
        email: "player@academy.com",
        password: "password123",
        note: `Demo login — ${DEMO_PLAYER.name} #${DEMO_PLAYER.jerseyNo}`,
      },
    ],
    adminId,
    playerCount,
    squads: ["Newark U17", "Bergen U17"],
  };
}
