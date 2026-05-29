"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { createUser } from "@/lib/actions/users";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getActionErrorMessage } from "@/lib/action-errors";

export function CreateUserForm({
  coaches,
}: {
  coaches: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<Role>(Role.PLAYER);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result && "error" in result && result.error) {
        setMessage({
          type: "error",
          text: getActionErrorMessage(result.error, "Check the form fields and try again."),
        });
        return;
      }

      formRef.current?.reset();
      setRole(Role.PLAYER);
      setMessage({ type: "success", text: "User created successfully." });
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="font-display font-semibold mb-4">Add user</h2>
      <form
        id="create-user-form"
        ref={formRef}
        action={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input name="name" placeholder="Full name" required />
        <Input
          name="email"
          type="email"
          placeholder={role === Role.PLAYER ? "Email (optional for players)" : "Email"}
          required={role !== Role.PLAYER}
        />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 8)"
          required
          minLength={8}
        />
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm"
          aria-label="User role"
        >
          <option value={Role.COACH}>Coach</option>
          <option value={Role.PLAYER}>Player</option>
          <option value={Role.ADMIN}>Admin</option>
        </select>
        {role === Role.PLAYER && (
          <>
            <select
              name="coachId"
              required
              className="rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm sm:col-span-2"
            >
              <option value="">Select coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input name="position" placeholder="Position (e.g. LCF)" />
            <Input name="squad" placeholder="Squad (e.g. Newark U17)" />
            <Input name="jerseyNo" type="number" placeholder="Jersey # (matches PitchIQ)" min={1} max={99} />
          </>
        )}
        <div className="sm:col-span-2 flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create user"}
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
