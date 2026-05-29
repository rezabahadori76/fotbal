import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { buildPlayerEmail } from "@/lib/player-email";
import { findJerseyConflict, jerseyConflictMessage } from "@/lib/player-profile";
import { prisma } from "@/lib/prisma";

export async function findPitchiqPlayerProfile(jerseyNo?: number, name?: string) {
  if (jerseyNo) {
    const byJersey = await prisma.playerProfile.findFirst({
      where: { jerseyNo },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (byJersey) return byJersey;
  }

  const trimmed = name?.trim();
  if (!trimmed) return null;

  const exact = await prisma.playerProfile.findFirst({
    where: { user: { name: { equals: trimmed, mode: "insensitive" } } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (exact) return exact;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    if (part.length < 3) continue;
    const partial = await prisma.playerProfile.findFirst({
      where: { user: { name: { contains: part, mode: "insensitive" } } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (partial) return partial;
  }

  return null;
}

export async function ensurePitchiqPlayerProfile(input: {
  jerseyNo: number;
  name: string;
  position?: string;
  squad?: string;
}) {
  const jerseyNo = input.jerseyNo;
  const name = input.name.trim();
  if (!name) {
    throw new Error("name required");
  }

  let profile = await findPitchiqPlayerProfile(jerseyNo, name);
  if (profile) {
    const updates: { jerseyNo?: number; position?: string; squad?: string } = {};
    if (jerseyNo && profile.jerseyNo !== jerseyNo) {
      const conflict = await findJerseyConflict(jerseyNo, profile.id);
      if (conflict) {
        throw new Error(jerseyConflictMessage(jerseyNo, conflict.user.name));
      }
      updates.jerseyNo = jerseyNo;
    }
    if (input.position && profile.position !== input.position) updates.position = input.position;
    if (input.squad && profile.squad !== input.squad) updates.squad = input.squad;
    if (Object.keys(updates).length) {
      profile = await prisma.playerProfile.update({
        where: { id: profile.id },
        data: updates,
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }
    return { profile, created: false };
  }

  const coach = await prisma.user.findFirst({
    where: { role: Role.COACH },
    orderBy: { createdAt: "asc" },
  });
  if (!coach) {
    throw new Error("No coach account found");
  }

  const conflict = await findJerseyConflict(jerseyNo);
  if (conflict) {
    throw new Error(jerseyConflictMessage(jerseyNo, conflict.user.name));
  }

  let email = buildPlayerEmail(jerseyNo, name);
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    email = `pitchiq-j${jerseyNo}-${Date.now()}@academy.local`;
  }

  const passwordHash = await hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.PLAYER,
      playerProfile: {
        create: {
          coachId: coach.id,
          position: input.position || undefined,
          squad: input.squad || undefined,
          jerseyNo,
        },
      },
    },
    include: {
      playerProfile: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  profile = user.playerProfile!;
  return { profile, created: true };
}
