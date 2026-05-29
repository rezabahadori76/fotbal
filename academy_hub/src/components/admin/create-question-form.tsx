"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPredefinedQuestion } from "@/lib/actions/questions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionOptionsFields } from "@/components/ui/question-options-fields";
import { getActionErrorMessage } from "@/lib/action-errors";

export function CreateQuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  return (
    <Card>
      <h2 className="font-display font-semibold mb-1">Design question</h2>
      <p className="text-xs text-muted mb-4">
        Write the question and four answer options (A–D). Coaches and admins can assign it to
        players.
      </p>
      <form
        ref={formRef}
        action={(fd) => {
          setMessage(null);
          startTransition(() => {
            void createPredefinedQuestion(fd).then((result) => {
              if (result?.error) {
                setMessage({
                  type: "error",
                  text: getActionErrorMessage(result.error, "Could not save question."),
                });
                return;
              }

              formRef.current?.reset();
              setMessage({ type: "success", text: "Question added to the library." });
              router.refresh();
            });
          });
        }}
        className="space-y-4"
      >
        <Textarea name="text" placeholder="Question text" required minLength={5} />
        <Input name="category" placeholder="Category (e.g. Wellbeing)" />
        <QuestionOptionsFields />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add question"}
        </Button>
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-accent" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </form>
    </Card>
  );
}
