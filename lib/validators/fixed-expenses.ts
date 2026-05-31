import { z } from "zod"

export const AddFixedExpenseSchema = z.object({
  day_of_month: z
    .number()
    .int("일자는 정수")
    .min(0, "0-31 사이")
    .max(31, "0-31 사이"),
  type: z.enum(["income", "expense"]),
  category_1st: z.string().min(1, "1차 카테고리는 필수"),
  category_2nd: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  amount: z.number().nonnegative("금액은 0 이상"),
})

export const UpdateFixedExpenseSchema = AddFixedExpenseSchema.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
})

export const DeleteFixedExpenseSchema = z.object({
  id: z.string().uuid(),
})

export type AddFixedExpenseInput = z.infer<typeof AddFixedExpenseSchema>
export type UpdateFixedExpenseInput = z.infer<typeof UpdateFixedExpenseSchema>
export type DeleteFixedExpenseInput = z.infer<typeof DeleteFixedExpenseSchema>
