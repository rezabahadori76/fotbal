"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { announcementSchema } from "@/lib/validators";

export async function createAnnouncement(formData: FormData) {
  const session = await requireRole(Role.COACH, Role.ADMIN);
  const coachId = session.user.role === Role.ADMIN
    ? (formData.get("coachId") as string) || session.user.id
    : session.user.id;

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    targetSquad: formData.get("targetSquad"),
  });
  if (!parsed.success) return { error: "Invalid announcement" };

  await prisma.announcement.create({
    data: {
      coachId,
      title: parsed.data.title,
      body: parsed.data.body,
      targetSquad: parsed.data.targetSquad,
    },
  });

  revalidatePath("/coach/announcements");
  revalidatePath("/player");
  revalidatePath("/admin");
  return { success: true };
}

export async function markAnnouncementRead(announcementId: string) {
  const session = await requireRole(Role.PLAYER);

  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId: session.user.id,
      },
    },
    create: {
      announcementId,
      userId: session.user.id,
    },
    update: {
      readAt: new Date(),
    },
  });

  revalidatePath("/player");
  return { success: true };
}
