import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ExportButtons({
  wellnessHref,
  responsesHref,
  trainingLoadHref,
  playerReportHref,
}: {
  wellnessHref?: string;
  responsesHref?: string;
  trainingLoadHref?: string;
  playerReportHref?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {wellnessHref && (
        <a href={wellnessHref}>
          <Button variant="secondary" size="sm">Export wellness CSV</Button>
        </a>
      )}
      {responsesHref && (
        <a href={responsesHref}>
          <Button variant="secondary" size="sm">Export responses CSV</Button>
        </a>
      )}
      {trainingLoadHref && (
        <a href={trainingLoadHref}>
          <Button variant="secondary" size="sm">Export training load CSV</Button>
        </a>
      )}
      {playerReportHref && (
        <Link href={playerReportHref} target="_blank">
          <Button variant="ghost" size="sm">Print player report (PDF)</Button>
        </Link>
      )}
    </div>
  );
}
