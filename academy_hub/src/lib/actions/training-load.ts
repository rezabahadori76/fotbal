"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { trainingLoadSchema } from "@/lib/validators";
import { dayFromInput } from "@/lib/utils";

export async function submitTrainingLoad(formData: FormData) {
  const session = await requireRole(Role.PLAYER);

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "Player profile not found" };

  const parsed = trainingLoadSchema.safeParse({
    sessionDate: formData.get("sessionDate"),
    rpe: formData.get("rpe"),
    durationMinutes: formData.get("durationMinutes"),
    sessionType: formData.get("sessionType") ?? "TRAINING",
    notes: formData.get("notes"),
    eventId: formData.get("eventId"),
  });
  if (!parsed.success) return { error: "Invalid training load data" };

  const data = parsed.data;
  const sessionDate = dayFromInput(data.sessionDate);

  if (data.eventId) {
    const attendance = await prisma.eventAttendance.findFirst({
      where: { eventId: data.eventId, playerId: profile.id },
    });
    if (!attendance) return { error: "Event not found" };
  }

  await prisma.trainingLoadReport.create({
    data: {
      playerId: profile.id,
      sessionDate,
      rpe: data.rpe,
      durationMinutes: data.durationMinutes,
      sessionType: data.sessionType,
      notes: data.notes,
      eventId: data.eventId,
    },
  });

  revalidatePath("/player");
  revalidatePath("/player/training");
  revalidatePath("/coach");
  revalidatePath(`/coach/players/${profile.id}`);
  return { success: true };
}
