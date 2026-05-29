"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignPlayerCoach } from "@/lib/actions/players";

export function AssignPlayerCoachSelect({
  playerProfileId,
  currentCoachId,
  coaches,
}: {
  playerProfileId: string;
  currentCoachId: string;
  coaches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={currentCoachId}
      disabled={pending}
      onChange={(e) => {
        const coachId = e.target.value;
        if (coachId === currentCoachId) return;
        startTransition(async () => {
          await assignPlayerCoach(playerProfileId, coachId);
          router.refresh();
        });
      }}
      className="max-w-[180px] rounded-lg border border-card-border bg-background px-2 py-1.5 text-xs"
      aria-label="Assign coach"
    >
      {coaches.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
