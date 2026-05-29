"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCustomQuestionTemplate } from "@/lib/actions/questions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionOptionsFields } from "@/components/ui/question-options-fields";
import { getActionErrorMessage } from "@/lib/action-errors";

export function SaveCustomTemplateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  return (
    <Card>
      <h2 className="font-display font-semibold mb-2 text-sm">Save reusable template</h2>
      <p className="text-xs text-muted mb-4">4-option questions for quick reuse</p>
      <form
        ref={formRef}
        action={(fd) => {
          setMessage(null);
          startTransition(() => {
            void saveCustomQuestionTemplate(fd).then((result) => {
              if (result?.error) {
                setMessage({
                  type: "error",
                  text: getActionErrorMessage(result.error, "Could not save template."),
                });
                return;
              }

              formRef.current?.reset();
              setMessage({ type: "success", text: "Template saved for reuse." });
              router.refresh();
            });
          });
        }}
        className="space-y-4"
      >
        <Textarea name="text" placeholder="Question" className="min-h-[80px]" required />
        <Input name="category" placeholder="Category" className="max-w-xs" />
        <QuestionOptionsFields />
        <Button type="submit" variant="secondary" disabled={pending}>
          Save template
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
