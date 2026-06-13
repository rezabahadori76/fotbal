"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceStatus } from "@prisma/client";
import { updateAttendance } from "@/lib/actions/academy-performance";

export function AttendanceButtons({ attendanceId }: { attendanceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(status: AttendanceStatus) {
    startTransition(() => {
      void updateAttendance(attendanceId, status).then(() => router.refresh());
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("ATTENDING" as AttendanceStatus)}
        className="rounded-full border border-card-border bg-transparent text-foreground font-semibold py-3 text-sm hover:bg-card transition-colors disabled:opacity-50"
      >
        Attend
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit("NOT_ATTENDING" as AttendanceStatus)}
        className="rounded-full border border-card-border bg-transparent text-foreground font-semibold py-3 text-sm hover:bg-card transition-colors disabled:opacity-50"
      >
        Not Attend
      </button>
    </div>
  );
}
