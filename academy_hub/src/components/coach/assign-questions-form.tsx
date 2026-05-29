"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignQuestions } from "@/lib/actions/questions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionOptionsFields } from "@/components/ui/question-options-fields";

type Player = { id: string; name: string };
type Question = { id: string; text: string; category: string | null; type: string };

export function AssignQuestionsForm({
  players,
  questions,
}: {
  players: Player[];
  questions: Question[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"predefined" | "custom">("predefined");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  function togglePlayer(id: string) {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleSubmit(formData: FormData) {
    if (selectedPlayers.length === 0) {
      setMessage("Select at least one player");
      return;
    }
    formData.set("playerIds", selectedPlayers.join(","));
    setMessage("");
    startTransition(async () => {
      const result = await assignQuestions(formData);
      if (result?.error) {
        setMessage(result.error);
        return;
      }

      formRef.current?.reset();
      setSelectedPlayers([]);
      setMode("predefined");
      if (result.skipped && result.skipped > 0) {
        setMessage(
          `Sent to ${result.assigned} player${result.assigned === 1 ? "" : "s"}. Skipped ${result.skipped} who already had this question.`,
        );
      } else {
        setMessage("Questions sent to players.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display font-semibold mb-4">Select players</h2>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlayer(p.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedPlayers.includes(p.id)
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-card-border text-muted hover:border-accent/40"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === "predefined" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setMode("predefined")}
          >
            Library
          </Button>
          <Button
            type="button"
            variant={mode === "custom" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setMode("custom")}
          >
            Custom (4 options)
          </Button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {mode === "predefined" ? (
            <select
              name="questionId"
              required
              className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm"
            >
              <option value="">Choose a question</option>
              {questions.map((q) => (
              <option key={q.id} value={q.id}>
                  [{q.category ?? "General"}] {q.text.slice(0, 80)}
                  {q.text.length > 80 ? "…" : ""}
                </option>
              ))}
            </select>
          ) : (
            <>
              <Textarea
                name="customText"
                placeholder="Your question for the selected players…"
                required
                minLength={5}
              />
              <QuestionOptionsFields />
            </>
          )}
          <Input name="dueDate" type="date" placeholder="Due date (optional)" />
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send question"}
            </Button>
            {message && (
              <p
                className={`text-sm ${
                  message.includes("sent") ||
                  message.includes("Questions") ||
                  message.includes("Sent to")
                    ? "text-accent"
                    : "text-danger"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
