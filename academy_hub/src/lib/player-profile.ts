import { prisma } from "@/lib/prisma";
import { buildPlayerEmail } from "@/lib/player-email";

export async function findJerseyConflict(jerseyNo: number, excludeProfileId?: string) {
  return prisma.playerProfile.findFirst({
    where: {
      jerseyNo,
      ...(excludeProfileId ? { id: { not: excludeProfileId } } : {}),
    },
    include: { user: { select: { name: true } } },
  });
}

export async function resolvePlayerEmail(
  name: string,
  jerseyNo?: number,
  preferred?: string,
): Promise<string | { error: string }> {
  const trimmedPreferred = preferred?.trim().toLowerCase();
  if (trimmedPreferred) {
    const taken = await prisma.user.findUnique({ where: { email: trimmedPreferred } });
    if (taken) return { error: "Email already in use" };
    return trimmedPreferred;
  }

  if (!jerseyNo) {
    return { error: "Enter an email or a jersey number so we can generate a login address" };
  }

  let email = buildPlayerEmail(jerseyNo, name);
  if (!(await prisma.user.findUnique({ where: { email } }))) return email;

  for (let i = 2; i < 20; i += 1) {
    email = buildPlayerEmail(jerseyNo, name, `-${i}`);
    if (!(await prisma.user.findUnique({ where: { email } }))) return email;
  }

  return buildPlayerEmail(jerseyNo, name, `-${Date.now()}`);
}

export function jerseyConflictMessage(jerseyNo: number, playerName: string) {
  return `Jersey #${jerseyNo} is already assigned to ${playerName}`;
}
