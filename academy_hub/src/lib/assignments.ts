import { AssignmentStatus } from "@prisma/client";

export function isAnswered(assignment: {
  status?: AssignmentStatus;
  answer?: unknown | null;
}): boolean {
  return assignment.status === AssignmentStatus.ANSWERED || assignment.answer != null;
}
