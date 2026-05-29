"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { getActionErrorMessage } from "@/lib/action-errors";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete ${email}?`)) return;
        startTransition(() => {
          void deleteUser(userId).then((result) => {
            if (result?.error) {
              alert(getActionErrorMessage(result.error, "Could not delete that user."));
              return;
            }

            router.refresh();
          });
        });
      }}
    >
      Delete
    </Button>
  );
}
