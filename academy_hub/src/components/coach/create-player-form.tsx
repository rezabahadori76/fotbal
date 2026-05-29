"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlayer } from "@/lib/actions/players";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActionErrorMessage } from "@/lib/action-errors";

export function CreatePlayerForm({
  coaches = [],
  requireCoachSelection = false,
}: {
  coaches?: { id: string; name: string }[];
  requireCoachSelection?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const hasCoachOptions = coaches.length > 0;
  const canSubmit = !requireCoachSelection || hasCoachOptions;

  return (
    <Card>
      <h2 className="font-display font-semibold mb-4">Add player</h2>
      <form
        ref={formRef}
        action={(fd) =>
          startTransition(async () => {
            const result = await createPlayer(fd);
            if (result?.error) {
              setMessage({
                type: "error",
                text: getActionErrorMessage(result.error, "Could not create player."),
              });
              return;
            }

            formRef.current?.reset();
            setMessage({
              type: "success",
              text: result.email
                ? `Player added. Login email: ${result.email}`
                : "Player added successfully.",
            });
            router.refresh();
          })
        }
        className="grid gap-4 sm:grid-cols-2"
      >
        {requireCoachSelection && (
          <select
            name="coachId"
            required
            defaultValue=""
            className="rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm sm:col-span-2"
          >
            <option value="">Select coach</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>
        )}
        {requireCoachSelection && !hasCoachOptions && (
          <p className="text-sm text-warning sm:col-span-2">
            Create a coach account first, then assign the player to that coach.
          </p>
        )}
        <Input name="name" placeholder="Full name" required />
        <Input
          name="email"
          type="email"
          placeholder="Email (optional — auto-generated from jersey #)"
        />
        <Input
          name="password"
          type="password"
          placeholder="Temporary password (e.g. password123)"
          required
          minLength={8}
        />
        <Input name="position" placeholder="Position (e.g. LCF)" />
        <Input name="squad" placeholder="Squad (e.g. Newark U17)" />
        <Input name="jerseyNo" type="number" placeholder="Jersey # (matches PitchIQ)" min={1} max={99} />
        <div className="sm:col-span-2 flex gap-4 items-center">
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? "Adding…" : "Add player"}
          </Button>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-accent" : "text-danger"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
