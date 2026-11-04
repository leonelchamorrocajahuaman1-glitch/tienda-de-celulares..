import type { Address } from "@/components/account/AddressForm";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { requireUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/data/catalog";
import { mpConfigured, mpIsTestMode } from "@/lib/payments/mercadopago";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { supabase, profile, user } = await requireUser("/checkout");
  const [{ data: addresses }, settings] = await Promise.all([
    supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at"),
    getStoreSettings(),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-6 pt-32">
      <p className="eyebrow">Pago seguro</p>
      <h1 className="mb-8 mt-3 font-display text-4xl font-semibold">Finalizar compra</h1>
      <CheckoutForm
        addresses={(addresses ?? []) as Address[]}
        settings={settings}
        profile={{
          full_name: profile?.full_name || user.email || "",
          phone: profile?.phone ?? "",
          document_type: profile?.document_type ?? null,
          document_number: profile?.document_number ?? null,
        }}
        mercadoPagoEnabled={mpConfigured()}
        testMode={mpIsTestMode()}
      />
    </div>
  );
}
