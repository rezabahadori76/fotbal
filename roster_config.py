"""Helpers: only roster players with jersey number + name from team config."""

from __future__ import annotations

from typing import Any, Iterator


def player_has_identity(player_entry: dict) -> bool:
    """True if JSON roster row has a valid number and non-empty name."""
    num = player_entry.get("number")
    if num is None:
        return False
    try:
        int(num)
    except (TypeError, ValueError):
        return False
    name = player_entry.get("name")
    if name is None:
        return False
    return bool(str(name).strip())


def iter_team_roster(
    team_config: dict, team_id: int
) -> Iterator[tuple[dict, int, str]]:
    """Yield (config_row, jersey_number, name) for named players only."""
    if team_id not in (1, 2):
        return
    team = team_config.get("match", {}).get(f"team_{team_id}", {})
    for p in team.get("players", []):
        if not player_has_identity(p):
            continue
        jersey = int(p["number"])
        name = str(p["name"]).strip()
        yield p, jersey, name


def named_roster_keys(team_config: dict) -> set[tuple[int, int]]:
    return {(team_id, jersey) for team_id in (1, 2) for _, jersey, _ in iter_team_roster(team_config, team_id)}


def count_named_roster(team_config: dict, team_id: int) -> int:
    return sum(1 for _ in iter_team_roster(team_config, team_id))
