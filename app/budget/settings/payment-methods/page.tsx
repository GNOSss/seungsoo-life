import { createClient } from "@/lib/supabase/server"
import { PaymentMethodList } from "@/components/budget/settings/PaymentMethodList"

export default async function PaymentMethodsPage() {
  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from("payment_methods")
    .select("id, name, sort_order, active")
    .order("sort_order", { ascending: true })

  if (error) {
    return <p className="text-sm text-red-600">에러: {error.message}</p>
  }

  return <PaymentMethodList items={items ?? []} />
}
