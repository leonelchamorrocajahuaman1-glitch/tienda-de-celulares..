import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicSupabase } from "@/lib/supabase/server";

const schema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/),
  items: z.array(z.object({ variant_id: z.string().uuid(), quantity: z.number().int().min(1).max(10) })).min(1).max(30),
});

/** Valida un cupón contra los precios reales de la BD (función validate_coupon). */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, message: "Código inválido" }, { status: 400 });
  const sb = getPublicSupabase();
  if (!sb) return NextResponse.json({ valid: false, message: "Cupones disponibles al conectar Supabase" });
  const { data, error } = await sb.rpc("validate_coupon", { p_code: parsed.data.code, p_items: parsed.data.items });
  if (error) return NextResponse.json({ valid: false, message: "No se pudo validar el cupón" }, { status: 500 });
  return NextResponse.json(data);
}
