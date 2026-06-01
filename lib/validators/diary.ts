import { z } from "zod"

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export const AddDiaryActivitySchema = z.object({
  name: z.string().min(1, "이름 필수").max(50),
  color: z.string().regex(HEX_COLOR_RE, "hex 색상 형식 (#RRGGBB)"),
})
export const UpdateDiaryActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(HEX_COLOR_RE).optional(),
})
export const DeleteDiaryActivitySchema = z.object({ id: z.string().uuid() })
export const UpsertActivityColorByNameSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(HEX_COLOR_RE),
})
export type AddDiaryActivityInput = z.infer<typeof AddDiaryActivitySchema>
export type UpdateDiaryActivityInput = z.infer<typeof UpdateDiaryActivitySchema>
export type DeleteDiaryActivityInput = z.infer<typeof DeleteDiaryActivitySchema>
export type UpsertActivityColorByNameInput = z.infer<
  typeof UpsertActivityColorByNameSchema
>

export const AddDiaryQuestSchema = z.object({
  name: z.string().min(1).max(80),
})
export const UpdateDiaryQuestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
})
export const DeleteDiaryQuestSchema = z.object({ id: z.string().uuid() })
export type AddDiaryQuestInput = z.infer<typeof AddDiaryQuestSchema>
export type UpdateDiaryQuestInput = z.infer<typeof UpdateDiaryQuestSchema>
export type DeleteDiaryQuestInput = z.infer<typeof DeleteDiaryQuestSchema>

export const ToggleQuestCheckSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quest_id: z.string().uuid(),
  checked: z.boolean(),
})
export type ToggleQuestCheckInput = z.infer<typeof ToggleQuestCheckSchema>

export const UpsertRawInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  raw_input: z.string().max(20000),
})
export const DeleteDiaryDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type UpsertRawInputInput = z.infer<typeof UpsertRawInputSchema>
export type DeleteDiaryDateInput = z.infer<typeof DeleteDiaryDateSchema>
