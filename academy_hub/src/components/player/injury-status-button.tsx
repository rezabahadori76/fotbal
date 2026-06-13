"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InjuryStatus } from "@prisma/client";
import { updateInjuryStatus } from "@/lib/actions/academy-performance";
import { Button } from "@/components/ui/button";

export function InjuryStatusButton({
  injuryId,
  status,
  label,
}: {
  injuryId: string;
  status: InjuryStatus;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void updateInjuryStatus(injuryId, status).then(() => router.refresh());
        });
      }}
    >
      {label}
    </Button>
  );
}
