import { prisma } from "../src/lib/prisma";

async function main() {
  const player = await prisma.user.findUnique({
    where: { email: "player@academy.com" },
    include: { playerProfile: true },
  });
  const coach = await prisma.user.findUnique({
    where: { email: "coach@academy.com" },
    include: { coachedPlayers: true },
  });

  if (!player?.playerProfile || !coach) {
    throw new Error("Seed data missing — run npm run db:seed");
  }

  const profileId = player.playerProfile.id;
  const today = new Date().toISOString().slice(0, 10);

  // Wellness upsert
  await prisma.wellnessReport.upsert({
    where: { playerId_reportDate: { playerId: profileId, reportDate: new Date(`${today}T00:00:00.000Z`) } },
    create: {
      playerId: profileId,
      reportDate: new Date(`${today}T00:00:00.000Z`),
      mood: 8,
      energy: 7,
      sleep: 9,
      stress: 4,
      soreness: 2,
      comment: "Smoke test wellness",
    },
    update: { mood: 8, energy: 7, sleep: 9, stress: 4, soreness: 2, comment: "Smoke test wellness" },
  });
  console.log("wellness: OK");

  // Injury create
  const injury = await prisma.injuryReport.create({
    data: {
      playerId: profileId,
      bodyPart: "Lower Leg",
      specificPart: "Knee",
      description: "Smoke test injury",
      status: "ACTIVE",
      mechanism: "CONTACT",
      recurrence: false,
      occurredAt: new Date(`${today}T00:00:00.000Z`),
    },
  });
  console.log("injury: OK", injury.id);

  // Event + attendance
  const existingEvent = await prisma.teamEvent.findFirst({
    where: { coachId: coach.id, title: "Smoke Test Event" },
  });
  if (!existingEvent) {
    await prisma.teamEvent.create({
      data: {
        title: "Smoke Test Event",
        eventDate: new Date(`${today}T00:00:00.000Z`),
        startTime: "18:00",
        endTime: "20:00",
        timezone: "EDT",
        location: "Field 1",
        coachId: coach.id,
        attendances: { create: [{ playerId: profileId }] },
      },
    });
    console.log("event: OK");
  } else {
    console.log("event: already exists");
  }

  const attendance = await prisma.eventAttendance.findFirst({
    where: { playerId: profileId, event: { title: "Smoke Test Event" } },
  });
  if (attendance) {
    await prisma.eventAttendance.update({
      where: { id: attendance.id },
      data: { status: "ATTENDING" },
    });
    console.log("attendance: OK");
  }

  // Coach can read synced data
  const coachView = await prisma.playerProfile.findMany({
    where: { coachId: coach.id },
    include: {
      wellnessReports: { take: 1, orderBy: { reportDate: "desc" } },
      injuryReports: { where: { status: { not: "RESOLVED" } } },
      eventAttendances: { include: { event: true } },
    },
  });
  const synced = coachView.find((p) => p.id === profileId);
  if (!synced?.wellnessReports.length) throw new Error("Coach cannot see wellness");
  if (!synced.injuryReports.length) throw new Error("Coach cannot see injuries");
  console.log("coach sync: OK");

  console.log("\nAll action/DB integration tests passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
