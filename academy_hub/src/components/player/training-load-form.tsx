"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitTrainingLoad } from "@/lib/actions/training-load";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayInputValue } from "@/lib/performance";
import { sessionTypeLabels } from "@/lib/training-load";

type EventOption = { id: string; title: string; eventDate: string };

export function TrainingLoadForm({ events = [] }: { events?: EventOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(() => {
          void submitTrainingLoad(formData).then((result) => {
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
      <input type="hidden" name="sessionDate" value={todayInputValue()} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-muted mb-1.5" htmlFor="rpe">RPE (1–10)</label>
          <Input id="rpe" name="rpe" type="number" min={1} max={10} defaultValue={6} required />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1.5" htmlFor="durationMinutes">Duration (minutes)</label>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={1} max={300} defaultValue={90} required />
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="sessionType">Session type</label>
        <select
          id="sessionType"
          name="sessionType"
          className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
          defaultValue="TRAINING"
        >
          {Object.entries(sessionTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {events.length > 0 && (
        <div>
          <label className="block text-sm text-muted mb-1.5" htmlFor="eventId">Link to event (optional)</label>
          <select
            id="eventId"
            name="eventId"
            className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">No linked event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} — {new Date(event.eventDate).toLocaleDateString("en-US")}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="notes">Notes (optional)</label>
        <Input id="notes" name="notes" placeholder="e.g. High intensity session" />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Log training load"}
      </Button>
      {message && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
