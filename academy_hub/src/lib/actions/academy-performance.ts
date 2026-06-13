"use server";

import { revalidatePath } from "next/cache";
import { AttendanceStatus, InjuryMechanism, InjuryStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { emptyToUndefined } from "@/lib/validators";
import { dayFromInput } from "@/lib/utils";

const score = z.coerce.number().int().min(1).max(10);

const wellnessSchema = z.object({
  reportDate: z.string().min(1),
  mood: score,
  energy: score,
  sleep: score,
  stress: score,
  soreness: score,
  restingHeartRate: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(30).max(240).optional(),
  ),
  symptom: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  comment: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

const injurySchema = z.object({
  bodyPart: z.string().min(2).max(80),
  specificPart: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(600).optional()),
  status: z.nativeEnum(InjuryStatus),
  mechanism: z.nativeEnum(InjuryMechanism),
  recurrence: z.coerce.boolean().default(false),
  occurredAt: z.string().min(1),
});

const eventSchema = z.object({
  title: z.string().min(2).max(120),
  eventDate: z.string().min(1),
  startTime: z.string().min(1).max(20),
  endTime: z.string().min(1).max(20),
  timezone: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
  location: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  field: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  playerIds: z.array(z.string()).min(1),
});

async function requirePlayerProfile() {
  const session = await requireRole(Role.PLAYER);
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) throw new Error("Player profile not found");
  return profile;
}

function revalidatePerformancePaths() {
  revalidatePath("/player");
  revalidatePath("/player/status");
  revalidatePath("/player/events");
  revalidatePath("/player/injuries");
  revalidatePath("/coach");
  revalidatePath("/coach/players");
  revalidatePath("/coach/events");
  revalidatePath("/coach/health");
  revalidatePath("/admin");
  revalidatePath("/admin/health");
}

export async function submitWellnessReport(formData: FormData) {
  const profile = await requirePlayerProfile();
  const parsed = wellnessSchema.safeParse({
    reportDate: formData.get("reportDate"),
    mood: formData.get("mood"),
    energy: formData.get("energy"),
    sleep: formData.get("sleep"),
    stress: formData.get("stress"),
    soreness: formData.get("soreness"),
    restingHeartRate: formData.get("restingHeartRate"),
    symptom: formData.get("symptom"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) return { error: "Check the wellness report fields." };

  await prisma.wellnessReport.upsert({
    where: {
      playerId_reportDate: {
        playerId: profile.id,
        reportDate: dayFromInput(parsed.data.reportDate),
      },
    },
    create: {
      ...parsed.data,
      reportDate: dayFromInput(parsed.data.reportDate),
      playerId: profile.id,
    },
    update: {
      ...parsed.data,
      reportDate: dayFromInput(parsed.data.reportDate),
    },
  });

  revalidatePerformancePaths();
  return { success: true };
}

export async function submitInjuryReport(formData: FormData) {
  const profile = await requirePlayerProfile();
  const parsed = injurySchema.safeParse({
    bodyPart: formData.get("bodyPart"),
    specificPart: formData.get("specificPart"),
    description: formData.get("description"),
    status: formData.get("status") || InjuryStatus.ACTIVE,
    mechanism: formData.get("mechanism") || InjuryMechanism.CONTACT,
    recurrence: formData.get("recurrence") === "true",
    occurredAt: formData.get("occurredAt"),
  });

  if (!parsed.success) return { error: "Check the injury report fields." };

  await prisma.injuryReport.create({
    data: {
      ...parsed.data,
      occurredAt: dayFromInput(parsed.data.occurredAt),
      playerId: profile.id,
    },
  });

  revalidatePerformancePaths();
  return { success: true };
}

export async function updateInjuryStatus(injuryId: string, status: InjuryStatus) {
  const profile = await requirePlayerProfile();

  await prisma.injuryReport.update({
    where: { id: injuryId, playerId: profile.id },
    data: { status },
  });

  revalidatePerformancePaths();
  return { success: true };
}

export async function createTeamEvent(formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const playerIdsRaw = formData.getAll("playerIds").filter((value): value is string => {
    return typeof value === "string" && value.length > 0;
  });

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventDate: formData.get("eventDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
    location: formData.get("location"),
    field: formData.get("field"),
    notes: formData.get("notes"),
    playerIds: playerIdsRaw,
  });

  if (!parsed.success) return { error: "Check the event fields and select players." };

  const players = await prisma.playerProfile.findMany({
    where: {
      id: { in: parsed.data.playerIds },
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
    },
    select: { id: true, coachId: true },
  });

  if (players.length !== parsed.data.playerIds.length) {
    return { error: "Some selected players were not found or are outside your squad." };
  }

  const playersByCoach = players.reduce<Record<string, typeof players>>((groups, player) => {
    groups[player.coachId] = groups[player.coachId] ?? [];
    groups[player.coachId].push(player);
    return groups;
  }, {});

  await prisma.$transaction(
    Object.entries(playersByCoach).map(([coachId, coachPlayers]) =>
      prisma.teamEvent.create({
        data: {
          title: parsed.data.title,
          eventDate: dayFromInput(parsed.data.eventDate),
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          timezone: parsed.data.timezone ?? "EDT",
          location: parsed.data.location,
          field: parsed.data.field,
          notes: parsed.data.notes,
          coachId,
          attendances: {
            create: coachPlayers.map((player) => ({ playerId: player.id })),
          },
        },
      }),
    ),
  );

  revalidatePerformancePaths();
  return { success: true };
}

export async function updateAttendance(attendanceId: string, status: AttendanceStatus) {
  const profile = await requirePlayerProfile();

  await prisma.eventAttendance.update({
    where: { id: attendanceId, playerId: profile.id },
    data: { status },
  });

  revalidatePerformancePaths();
  return { success: true };
}
