import { AddressBook } from "@/components/account/AddressBook";
import type { Address } from "@/components/account/AddressForm";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Mis direcciones" };

export default async function AddressesPage() {
  const { supabase, profile } = await requireUser("/cuenta/direcciones");
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return <AddressBook addresses={(data ?? []) as Address[]} defaultRecipient={profile?.full_name ?? ""} />;
}
