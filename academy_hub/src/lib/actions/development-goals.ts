"use server";

import { revalidatePath } from "next/cache";
import { GoalStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { developmentGoalSchema, updateGoalSchema } from "@/lib/validators";
import { dayFromInput } from "@/lib/utils";

export async function createDevelopmentGoal(formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN);

  const parsed = developmentGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    targetDate: formData.get("targetDate"),
    playerId: formData.get("playerId"),
  });
  if (!parsed.success) return { error: "Invalid goal data" };

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: parsed.data.playerId,
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
    },
  });
  if (!player) return { error: "Player not found" };

  const coachId = session.user.role === Role.COACH ? session.user.id : player.coachId;

  await prisma.developmentGoal.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      targetDate: parsed.data.targetDate ? dayFromInput(parsed.data.targetDate) : undefined,
      playerId: player.id,
      coachId,
      status: GoalStatus.NOT_STARTED,
    },
  });

  revalidatePath("/coach/players");
  revalidatePath(`/coach/players/${player.id}`);
  revalidatePath("/player/goals");
  return { success: true };
}

export async function updateDevelopmentGoal(goalId: string, formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN, Role.PLAYER);

  const parsed = updateGoalSchema.safeParse({
    status: formData.get("status") || undefined,
    progressNote: formData.get("progressNote"),
    title: formData.get("title"),
    description: formData.get("description"),
    targetDate: formData.get("targetDate"),
  });
  if (!parsed.success) return { error: "Invalid update" };

  const goal = await prisma.developmentGoal.findFirst({
    where: {
      id: goalId,
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
      ...(session.user.role === Role.PLAYER
        ? { player: { userId: session.user.id } }
        : {}),
    },
  });
  if (!goal) return { error: "Goal not found" };

  const data = parsed.data;
  const updates: {
    status?: GoalStatus;
    progressNote?: string;
    title?: string;
    description?: string;
    targetDate?: Date | null;
  } = {};

  if (data.status) updates.status = data.status;
  if (data.progressNote !== undefined) updates.progressNote = data.progressNote;
  if (session.user.role !== Role.PLAYER) {
    if (data.title) updates.title = data.title;
    if (data.description !== undefined) updates.description = data.description;
    if (data.targetDate) updates.targetDate = dayFromInput(data.targetDate);
  }

  await prisma.developmentGoal.update({
    where: { id: goalId },
    data: updates,
  });

  revalidatePath("/coach/players");
  revalidatePath(`/coach/players/${goal.playerId}`);
  revalidatePath("/player/goals");
  return { success: true };
}

export async function deleteDevelopmentGoal(goalId: string) {
  const session = await requireRole(Role.COACH, Role.ADMIN);

  const goal = await prisma.developmentGoal.findFirst({
    where: {
      id: goalId,
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
    },
  });
  if (!goal) return { error: "Goal not found" };

  await prisma.developmentGoal.delete({ where: { id: goalId } });

  revalidatePath("/coach/players");
  revalidatePath(`/coach/players/${goal.playerId}`);
  revalidatePath("/player/goals");
  return { success: true };
}
