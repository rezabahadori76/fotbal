"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeamEvent } from "@/lib/actions/academy-performance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayInputValue } from "@/lib/performance";

export function CreateTeamEventForm({
  players,
}: {
  players: { id: string; name: string; squad?: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">New team event</h2>
        <p className="text-sm text-muted">Assigned players will see it in their Events tab.</p>
      </div>
      <form
        action={(formData) => {
          setMessage(null);
          startTransition(() => {
            void createTeamEvent(formData).then((result) => {
              if (result?.error) {
                setMessage(result.error);
                return;
              }
              setMessage("Event created.");
              router.refresh();
            });
          });
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Title</span>
            <Input name="title" placeholder="Training, match, recovery..." required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Date</span>
            <Input name="eventDate" type="date" defaultValue={todayInputValue()} required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Start</span>
            <Input name="startTime" type="time" required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">End</span>
            <Input name="endTime" type="time" required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Timezone</span>
            <Input name="timezone" defaultValue="EDT" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Location</span>
            <Input name="location" placeholder="40.9796683,-74.1194403" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Field</span>
            <Input name="field" placeholder="Field 1" />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Notes</span>
          <Textarea name="notes" placeholder="Any context for players." />
        </label>
        <fieldset className="rounded-2xl border border-card-border bg-background/70 p-4">
          <legend className="px-1 text-sm text-muted">Players</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <label key={player.id} className="rounded-xl border border-card-border px-3 py-2 text-sm">
                <input name="playerIds" type="checkbox" value={player.id} className="mr-2 accent-accent" />
                {player.name}
                {player.squad ? <span className="text-muted"> · {player.squad}</span> : null}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create event"}
        </Button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </form>
    </Card>
  );
}
