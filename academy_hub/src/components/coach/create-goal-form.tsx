"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDevelopmentGoal } from "@/lib/actions/development-goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateGoalForm({
  players,
  defaultPlayerId,
}: {
  players: { id: string; name: string }[];
  defaultPlayerId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(() => {
          void createDevelopmentGoal(formData).then((result) => {
            if (result?.error) {
              setMessage(result.error);
              return;
            }
            router.refresh();
          });
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="playerId">Player</label>
        <select
          id="playerId"
          name="playerId"
          className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
          defaultValue={defaultPlayerId ?? players[0]?.id}
          required
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="title">Goal title</label>
        <Input id="title" name="title" placeholder="e.g. Improve short passing under pressure" required />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="description">Description (optional)</label>
        <Textarea id="description" name="description" rows={3} placeholder="What does success look like?" />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="targetDate">Target date (optional)</label>
        <Input id="targetDate" name="targetDate" type="date" />
      </div>

      <Button type="submit" disabled={pending}>Create goal</Button>
      {message && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
