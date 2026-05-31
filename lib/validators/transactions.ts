import { z } from "zod"

export const AddTransactionSchema = z.object({
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "year_month 형식 오류"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date 형식 오류"),
  type: z.enum(["income", "expense"]),
  category_1st: z.string().min(1, "1차 카테고리는 필수"),
  category_2nd: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  amount: z.number().positive("금액은 양수"),
  is_paid: z.boolean().optional(),
  // is_fixed는 사용자 입력 X — 항상 false (createNextMonth만 true)
})

export const UpdateTransactionSchema = AddTransactionSchema.partial().extend({
  id: z.string().uuid(),
})

export const DeleteTransactionSchema = z.object({
  id: z.string().uuid(),
})

export const ToggleIsPaidSchema = z.object({
  id: z.string().uuid(),
  is_paid: z.boolean(),
})

export type AddTransactionInput = z.infer<typeof AddTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
export type DeleteTransactionInput = z.infer<typeof DeleteTransactionSchema>
export type ToggleIsPaidInput = z.infer<typeof ToggleIsPaidSchema>
