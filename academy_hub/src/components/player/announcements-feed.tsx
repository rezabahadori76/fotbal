"use client";

import { useTransition } from "react";
import { markAnnouncementRead } from "@/lib/actions/announcements";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  coachName: string;
  isRead: boolean;
};

export function AnnouncementsFeed({ announcements }: { announcements: AnnouncementItem[] }) {
  const [pending, startTransition] = useTransition();

  if (announcements.length === 0) {
    return (
      <Card>
        <p className="text-muted text-sm">No announcements yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((item) => (
        <Card
          key={item.id}
          className={cn("space-y-2", !item.isRead && "border-accent/40 bg-accent/5")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-muted mt-1">
                Coach {item.coachName} · {formatDate(item.createdAt)}
              </p>
            </div>
            {!item.isRead && (
              <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                NEW
              </span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{item.body}</p>
          {!item.isRead && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(() => {
                  void markAnnouncementRead(item.id);
                });
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Mark as read
            </button>
          )}
        </Card>
      ))}
    </div>
  );
}
