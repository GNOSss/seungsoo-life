import { z } from "zod"

export const KindSchema = z.enum(["todo", "wish"])
export const ImportanceSchema = z.enum(["high", "mid", "low"])

export const AddTodoItemSchema = z.object({
  kind: KindSchema,
  importance: ImportanceSchema.default("mid"),
  item_date: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable()
  ),
  item_time: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable()
  ),
  target: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().max(200).optional().nullable()
  ),
  title: z.string().trim().min(1, "항목은 필수").max(200),
  detail: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().max(20000).optional().nullable()
  ),
  sort_order: z.number().optional(),
})

export const UpdateTodoItemSchema = AddTodoItemSchema.partial().extend({
  id: z.string().uuid(),
})

export const DeleteTodoItemSchema = z.object({ id: z.string().uuid() })

export type TodoItemKind = z.infer<typeof KindSchema>
export type TodoItemImportance = z.infer<typeof ImportanceSchema>
export type AddTodoItemInput = z.infer<typeof AddTodoItemSchema>
export type UpdateTodoItemInput = z.infer<typeof UpdateTodoItemSchema>
export type DeleteTodoItemInput = z.infer<typeof DeleteTodoItemSchema>
