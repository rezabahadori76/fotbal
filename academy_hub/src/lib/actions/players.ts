"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  findJerseyConflict,
  jerseyConflictMessage,
  resolvePlayerEmail,
} from "@/lib/player-profile";
import {
  assignPlayerCoachSchema,
  createUserSchema,
  updatePlayerSchema,
} from "@/lib/validators";

export async function createPlayer(formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN);

  const coachId =
    session.user.role === Role.ADMIN
      ? (formData.get("coachId") as string)
      : session.user.id;

  if (!coachId) return { error: "Coach is required" };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: Role.PLAYER,
    coachId,
    position: formData.get("position"),
    squad: formData.get("squad"),
    jerseyNo: formData.get("jerseyNo"),
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  if (data.jerseyNo) {
    const conflict = await findJerseyConflict(data.jerseyNo);
    if (conflict) {
      return { error: jerseyConflictMessage(data.jerseyNo, conflict.user.name) };
    }
  }

  const emailResult = await resolvePlayerEmail(
    data.name,
    data.jerseyNo,
    data.email,
  );
  if (typeof emailResult !== "string") {
    return { error: emailResult.error };
  }

  const passwordHash = await hash(data.password, 12);

  await prisma.user.create({
    data: {
      name: data.name,
      email: emailResult,
      passwordHash,
      role: Role.PLAYER,
      playerProfile: {
        create: {
          coachId,
          position: data.position,
          squad: data.squad,
          jerseyNo: data.jerseyNo ?? undefined,
        },
      },
    },
  });

  revalidatePath("/coach");
  revalidatePath("/coach/players");
  revalidatePath("/admin/users");
  return { success: true, email: emailResult };
}

export async function updatePlayer(playerProfileId: string, formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN);

  const parsed = updatePlayerSchema.safeParse({
    position: formData.get("position"),
    squad: formData.get("squad"),
    jerseyNo: formData.get("jerseyNo"),
  });
  if (!parsed.success) return { error: "Invalid data" };

  const profile = await prisma.playerProfile.findFirst({
    where: {
      id: playerProfileId,
      ...(session.user.role === Role.COACH ? { coachId: session.user.id } : {}),
    },
  });
  if (!profile) return { error: "Player not found" };

  if (parsed.data.jerseyNo) {
    const conflict = await findJerseyConflict(parsed.data.jerseyNo, playerProfileId);
    if (conflict) {
      return { error: jerseyConflictMessage(parsed.data.jerseyNo, conflict.user.name) };
    }
  }

  await prisma.playerProfile.update({
    where: { id: playerProfileId },
    data: {
      position: parsed.data.position,
      squad: parsed.data.squad,
      jerseyNo: parsed.data.jerseyNo ?? undefined,
    },
  });

  revalidatePath("/coach/players");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function assignPlayerCoach(playerProfileId: string, coachId: string) {
  await requireRole(Role.ADMIN);

  const parsed = assignPlayerCoachSchema.safeParse({ playerProfileId, coachId });
  if (!parsed.success) return { error: "Invalid assignment" };

  const [profile, coach] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { id: parsed.data.playerProfileId } }),
    prisma.user.findFirst({
      where: { id: parsed.data.coachId, role: Role.COACH },
    }),
  ]);

  if (!profile) return { error: "Player not found" };
  if (!coach) return { error: "Coach not found" };

  await prisma.playerProfile.update({
    where: { id: profile.id },
    data: { coachId: coach.id },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/assignments");
  revalidatePath("/coach");
  revalidatePath("/coach/players");
  return { success: true };
}
