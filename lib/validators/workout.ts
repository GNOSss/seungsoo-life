import { z } from "zod"

export const BodyPartEnum = z.enum([
  "Arms","Back","Cardio","Chest","Core","Full Body","Legs","Olympic","Other","Shoulders",
])
export const CategoryEnum = z.enum([
  "Barbell","Dumbbell","Machine","Cable","Bodyweight","Assisted Bodyweight","Reps Only","Cardio","Duration","Other",
])
export const SetTypeEnum = z.enum(["warmup", "working", "failure"])

export const ExerciseInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(100),
  body_part: BodyPartEnum,
  category: CategoryEnum,
})

export const FolderInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(80),
})

export const RoutineInputSchema = z.object({
  name: z.string().trim().min(1, "이름 필수").max(80),
  folder_id: z.string().uuid().nullable(),
})

export const RoutineExerciseInputSchema = z.object({
  routine_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  default_sets: z.number().int().min(1).max(20),
})

export const SetInputSchema = z.object({
  session_exercise_id: z.string().uuid(),
  set_type: SetTypeEnum,
  weight_kg: z.number().nullable(),
  reps: z.number().int().min(0).nullable(),
  duration_seconds: z.number().int().min(0).nullable(),
  completed: z.boolean(),
})

export type BodyPart = z.infer<typeof BodyPartEnum>
export type Category = z.infer<typeof CategoryEnum>
export type SetType = z.infer<typeof SetTypeEnum>
