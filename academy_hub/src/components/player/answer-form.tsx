"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer } from "@/lib/actions/questions";
import { Button } from "@/components/ui/button";
import { OPTION_LABELS } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { getActionErrorMessage } from "@/lib/action-errors";

export function AnswerForm({
  assignmentId,
  options,
}: {
  assignmentId: string;
  options: [string, string, string, string];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  return (
    <form
      action={(fd) => {
        if (selected === null) return;
        setMessage(null);
        fd.set("selectedOption", String(selected));
        startTransition(() => {
          void submitAnswer(assignmentId, fd).then((result) => {
            if (result?.error) {
              setMessage({
                type: "error",
                text: getActionErrorMessage(result.error, "Could not submit your answer."),
              });
              return;
            }

            setMessage({ type: "success", text: "Answer submitted." });
            setSelected(null);
            router.refresh();
          });
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-2">
        {options.map((label, index) => (
          <label
            key={index}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
              selected === index
                ? "border-accent bg-accent/10 text-foreground"
                : "border-card-border text-muted hover:border-accent/40",
            )}
          >
            <input
              type="radio"
              name="selectedOption"
              value={index}
              checked={selected === index}
              onChange={() => setSelected(index)}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="font-display font-semibold text-accent mr-2">
                {OPTION_LABELS[index]}
              </span>
              {label}
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={pending || selected === null}>
        {pending ? "Submitting…" : "Submit answer"}
      </Button>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-accent" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
