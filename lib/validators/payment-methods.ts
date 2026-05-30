import { z } from "zod"

export const AddPaymentMethodSchema = z.object({
  name: z.string().min(1, "이름은 필수").max(60, "이름은 60자 이내"),
})

export const UpdatePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60).optional(),
  active: z.boolean().optional(),
})

export const DeletePaymentMethodSchema = z.object({
  id: z.string().uuid(),
})

export const MovePaymentMethodSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
})

export type AddPaymentMethodInput = z.infer<typeof AddPaymentMethodSchema>
export type UpdatePaymentMethodInput = z.infer<typeof UpdatePaymentMethodSchema>
export type DeletePaymentMethodInput = z.infer<typeof DeletePaymentMethodSchema>
export type MovePaymentMethodInput = z.infer<typeof MovePaymentMethodSchema>
