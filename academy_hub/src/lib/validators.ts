import { z } from "zod";
import { Role } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function emptyToUndefined(val: unknown) {
  if (val == null) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return val;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(100).optional());
const optionalJersey = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(99).optional(),
);

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email("Enter a valid email").optional(),
  ),
  password: z.string().min(8).max(100),
  role: z.nativeEnum(Role),
  coachId: z.preprocess(emptyToUndefined, z.string().optional()),
  position: optionalText,
  squad: optionalText,
  jerseyNo: optionalJersey,
});

export const updatePlayerSchema = z.object({
  position: optionalText,
  squad: optionalText,
  jerseyNo: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(99).optional().nullable(),
  ),
});

export const assignPlayerCoachSchema = z.object({
  playerProfileId: z.string().min(1),
  coachId: z.string().min(1),
});

const optionField = z.string().min(1, "Required").max(200);

export const questionOptionsSchema = z.object({
  text: z.string().min(5).max(500),
  category: z.string().max(50).optional(),
  optionA: optionField,
  optionB: optionField,
  optionC: optionField,
  optionD: optionField,
});

export const assignQuestionSchema = z.object({
  playerIds: z.array(z.string()).min(1),
  questionId: z.preprocess(emptyToUndefined, z.string().optional()),
  customText: z.preprocess(emptyToUndefined, z.string().min(5).max(500).optional()),
  optionA: z.preprocess(emptyToUndefined, optionField.optional()),
  optionB: z.preprocess(emptyToUndefined, optionField.optional()),
  optionC: z.preprocess(emptyToUndefined, optionField.optional()),
  optionD: z.preprocess(emptyToUndefined, optionField.optional()),
  dueDate: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const answerSchema = z.object({
  selectedOption: z.coerce.number().int().min(0).max(3),
});

export const trainingLoadSchema = z.object({
  sessionDate: z.string().min(1),
  rpe: z.coerce.number().int().min(1).max(10),
  durationMinutes: z.coerce.number().int().min(1).max(300),
  sessionType: z.enum(["TRAINING", "MATCH", "RECOVERY", "OTHER"]).default("TRAINING"),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  eventId: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const announcementSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(2000),
  targetSquad: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
});

export const developmentGoalSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  targetDate: z.preprocess(emptyToUndefined, z.string().optional()),
  playerId: z.string().min(1),
});

export const updateGoalSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "ACHIEVED"]).optional(),
  progressNote: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  title: z.preprocess(emptyToUndefined, z.string().min(2).max(200).optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(1000).optional()),
  targetDate: z.preprocess(emptyToUndefined, z.string().optional()),
});
