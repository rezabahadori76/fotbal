/**
 * Seeds sample data for feature testing (goals, training load, announcements).
 * Safe to re-run — uses upsert / unique titles.
 */
import { GoalStatus, SessionType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const GOAL_TITLES = ["Improve first touch", "Increase sprint speed", "Better positioning"];
const ANNOUNCEMENT_TITLES = ["Feature test: All squad", "Feature test: Newark only"];

async function main() {
  const coach = await prisma.user.findUnique({
    where: { email: "coach@academy.com" },
    include: { coachedPlayers: { include: { user: true }, orderBy: { jerseyNo: "asc" } } },
  });
  if (!coach) throw new Error("Coach not found — run npm run db:seed");

  const players = coach.coachedPlayers;
  console.log(`Players with accounts: ${players.length}`);

  // Development goals — one per first 5 players
  let goalsCreated = 0;
  for (let i = 0; i < Math.min(5, players.length); i++) {
    const player = players[i];
    const title = `${GOAL_TITLES[i % GOAL_TITLES.length]} (#${player.jerseyNo})`;
    const existing = await prisma.developmentGoal.findFirst({
      where: { playerId: player.id, title },
    });
    if (!existing) {
      await prisma.developmentGoal.create({
        data: {
          title,
          description: `Test goal for ${player.user.name}`,
          playerId: player.id,
          coachId: coach.id,
          status: i === 0 ? GoalStatus.NOT_STARTED : i === 1 ? GoalStatus.IN_PROGRESS : GoalStatus.ACHIEVED,
          targetDate: new Date(Date.now() + 30 * 86400000),
          progressNote: i === 1 ? "Making good progress" : undefined,
        },
      });
      goalsCreated++;
    }
  }
  console.log(`Development goals: +${goalsCreated} created`);

  // Training load — last 7 days for first 3 players
  let trainingCreated = 0;
  for (let p = 0; p < Math.min(3, players.length); p++) {
    const player = players[p];
    for (let d = 0; d < 7; d++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - d);
      sessionDate.setHours(0, 0, 0, 0);

      const existing = await prisma.trainingLoadReport.findFirst({
        where: { playerId: player.id, sessionDate },
      });
      if (!existing) {
        const rpe = 5 + ((player.jerseyNo ?? 0) + d) % 5;
        const duration = 60 + (d % 3) * 15;
        await prisma.trainingLoadReport.create({
          data: {
            playerId: player.id,
            sessionDate,
            rpe,
            durationMinutes: duration,
            sessionType: d % 2 === 0 ? SessionType.TRAINING : SessionType.MATCH,
            notes: `Feature test session day -${d}`,
          },
        });
        trainingCreated++;
      }
    }
  }
  console.log(`Training load: +${trainingCreated} sessions created`);

  // Announcements
  let announcementsCreated = 0;
  for (const [idx, title] of ANNOUNCEMENT_TITLES.entries()) {
    const existing = await prisma.announcement.findFirst({ where: { title } });
    if (!existing) {
      await prisma.announcement.create({
        data: {
          coachId: coach.id,
          title,
          body: idx === 0
            ? "This message goes to all players in the squad."
            : "This message is only for Newark U17 players.",
          targetSquad: idx === 0 ? null : "Newark U17",
        },
      });
      announcementsCreated++;
    }
  }
  console.log(`Announcements: +${announcementsCreated} created`);

  const counts = {
    players: await prisma.playerProfile.count(),
    goals: await prisma.developmentGoal.count(),
    training: await prisma.trainingLoadReport.count(),
    announcements: await prisma.announcement.count(),
  };
  console.log("\nDB totals:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
