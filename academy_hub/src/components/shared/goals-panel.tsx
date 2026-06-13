"use client";

import { useTransition } from "react";
import { GoalStatus } from "@prisma/client";
import { updateDevelopmentGoal, deleteDevelopmentGoal } from "@/lib/actions/development-goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type GoalItem = {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  targetDate: string | null;
  progressNote: string | null;
  coachName: string;
};

const statusStyles: Record<GoalStatus, string> = {
  NOT_STARTED: "bg-muted/20 text-muted border-card-border",
  IN_PROGRESS: "bg-warning/15 text-warning border-warning/30",
  ACHIEVED: "bg-accent/15 text-accent border-accent/30",
};

const statusLabels: Record<GoalStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
};

export function GoalsPanel({
  goals,
  canManage = false,
}: {
  goals: GoalItem[];
  canManage?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (goals.length === 0) {
    return (
      <Card>
        <p className="text-muted text-sm">No development goals yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <Card key={goal.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{goal.title}</p>
              {goal.description && <p className="text-sm text-muted mt-1">{goal.description}</p>}
              <p className="text-xs text-muted mt-2">
                Coach {goal.coachName}
                {goal.targetDate ? ` · Target ${formatDate(goal.targetDate)}` : ""}
              </p>
            </div>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase", statusStyles[goal.status])}>
              {statusLabels[goal.status]}
            </span>
          </div>

          {goal.progressNote && (
            <p className="text-sm rounded-xl bg-background border border-card-border p-3">{goal.progressNote}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {(["NOT_STARTED", "IN_PROGRESS", "ACHIEVED"] as GoalStatus[]).map((status) => (
              <form
                key={status}
                action={(formData) => {
                  formData.set("status", status);
                  startTransition(() => {
                    void updateDevelopmentGoal(goal.id, formData);
                  });
                }}
              >
                <Button
                  type="submit"
                  size="sm"
                  variant={goal.status === status ? "primary" : "ghost"}
                  disabled={pending}
                >
                  {statusLabels[status]}
                </Button>
              </form>
            ))}
          </div>

          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                startTransition(() => {
                  void deleteDevelopmentGoal(goal.id);
                });
              }}
            >
              Delete goal
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
