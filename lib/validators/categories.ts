import { z } from "zod"

export const AddCategorySchema = z.object({
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
  type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().nullable(),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
})

export const DeleteCategorySchema = z.object({
  id: z.string().uuid(),
})

export const ReorderCategoriesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  type: z.enum(["income", "expense"]),
  parent_id: z.string().uuid().nullable(),
})

export type AddCategoryInput = z.infer<typeof AddCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>
