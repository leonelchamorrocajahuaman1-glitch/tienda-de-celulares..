"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { PERU_DEPARTMENTS } from "@/lib/peru";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  id?: string;
  address?: Record<string, unknown>;
}

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Casa"),
  recipient: z.string().trim().min(2, "Ingresa el nombre de quien recibe").max(120),
  phone: z.string().trim().regex(/^[+0-9 ]{6,20}$/, "Teléfono inválido"),
  department: z.enum(PERU_DEPARTMENTS, { error: "Selecciona un departamento" }),
  province: z.string().trim().min(2, "Ingresa la provincia").max(60),
  district: z.string().trim().min(2, "Ingresa el distrito").max(60),
  line1: z.string().trim().min(4, "Ingresa la dirección").max(200),
  reference: z.string().trim().max(200).optional().default(""),
  is_default: z.boolean().default(false),
});

export async function saveAddressAction(input: unknown, id?: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id) {
    const { data, error } = await supabase.from("addresses").update(parsed.data).eq("id", id).eq("user_id", user.id).select("*").single();
    if (error || !data) return { error: "No se pudo actualizar la dirección" };
    revalidatePath("/cuenta/direcciones");
    return { ok: true, id, address: data };
  }
  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 10) return { error: "Máximo 10 direcciones por cuenta" };
  const { data, error } = await supabase
    .from("addresses")
    .insert({ ...parsed.data, user_id: user.id, is_default: parsed.data.is_default || count === 0 })
    .select("*")
    .single();
  if (error || !data) return { error: "No se pudo guardar la dirección" };
  revalidatePath("/cuenta/direcciones");
  return { ok: true, id: data.id, address: data };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { error: "Dirección inválida" };
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar" };
  revalidatePath("/cuenta/direcciones");
  return { ok: true };
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+0-9 ]{6,20}$/, "Teléfono inválido").or(z.literal("")),
  document_type: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]).nullable(),
  document_number: z.string().trim().regex(/^[A-Za-z0-9]{6,15}$/, "Documento inválido").or(z.literal("")).nullable(),
});

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Solo campos permitidos: el rol y el estado no se pueden modificar desde aquí (y RLS/trigger lo impiden)
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      document_type: parsed.data.document_number ? parsed.data.document_type : null,
      document_number: parsed.data.document_number || null,
    })
    .eq("id", user.id);
  if (error) return { error: "No se pudo actualizar el perfil" };
  revalidatePath("/cuenta");
  return { ok: true };
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!z.string().uuid().safeParse(orderId).success) return { error: "Pedido inválido" };
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) return { error: "El pedido no puede cancelarse" };
  revalidatePath(`/cuenta/pedidos/${orderId}`);
  revalidatePath("/cuenta/pedidos");
  return { ok: true };
}
