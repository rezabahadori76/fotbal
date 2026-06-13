"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateAnnouncementForm({
  squads = [],
  coaches = [],
  requireCoachSelection = false,
}: {
  squads?: string[];
  coaches?: { id: string; name: string }[];
  requireCoachSelection?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(() => {
          void createAnnouncement(formData).then((result) => {
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
      {requireCoachSelection && coaches.length > 0 && (
        <div>
          <label className="block text-sm text-muted mb-1.5" htmlFor="coachId">Coach</label>
          <select id="coachId" name="coachId" className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm" required>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>{coach.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="title">Title</label>
        <Input id="title" name="title" placeholder="e.g. White kit tomorrow" required />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1.5" htmlFor="body">Message</label>
        <Textarea id="body" name="body" rows={4} placeholder="Team announcement..." required />
      </div>

      {squads.length > 0 && (
        <div>
          <label className="block text-sm text-muted mb-1.5" htmlFor="targetSquad">Target squad (optional)</label>
          <select id="targetSquad" name="targetSquad" className="w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm" defaultValue="">
            <option value="">All players</option>
            {squads.map((squad) => (
              <option key={squad} value={squad}>{squad}</option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={pending}>Post announcement</Button>
      {message && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
