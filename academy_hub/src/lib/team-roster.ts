import fs from "node:fs";
import path from "node:path";

export interface TeamConfigPlayer {
  number: number;
  name: string;
  position: string | null;
  status?: string;
}

export interface RosterEntry {
  teamId: 1 | 2;
  teamName: string;
  squad: string;
  number: number;
  name: string;
  position: string | null;
  status?: string;
}

const SQUAD_LABELS: Record<1 | 2, string> = {
  1: "Newark U17",
  2: "Bergen U17",
};

export function resolveTeamConfigPath(): string {
  const candidates = [
    path.join(process.cwd(), "..", "team config.json"),
    path.join(process.cwd(), "data", "team-config.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("team config.json not found (expected at repo root or academy_hub/data/team-config.json)");
}

export function loadTeamRoster(configPath?: string): RosterEntry[] {
  const file = configPath ?? resolveTeamConfigPath();
  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as {
    match?: Record<string, { name?: string; players?: TeamConfigPlayer[] }>;
  };

  const entries: RosterEntry[] = [];
  for (const teamId of [1, 2] as const) {
    const team = raw.match?.[`team_${teamId}`];
    if (!team) continue;
    const teamName = team.name ?? `Team ${teamId}`;
    for (const player of team.players ?? []) {
      entries.push({
        teamId,
        teamName,
        squad: SQUAD_LABELS[teamId],
        number: player.number,
        name: player.name,
        position: player.position ?? null,
        status: player.status,
      });
    }
  }
  return entries;
}
