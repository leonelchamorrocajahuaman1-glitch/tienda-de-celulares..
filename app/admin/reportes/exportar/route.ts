import { NextResponse, type NextRequest } from "next/server";
import { addDays, isoDay, limaDayStart, parseLimaDay } from "@/lib/admin-dates";
import { getSession } from "@/lib/auth";

/** Exportación CSV de reportes (solo administradores). */
function csv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita inyección de fórmulas en Excel
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.profile?.role !== "admin" || !s.profile.is_active) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const today = limaDayStart();
  const from = parseLimaDay(sp.get("desde") ?? undefined, addDays(today, -29));
  const toDay = parseLimaDay(sp.get("hasta") ?? undefined, today);
  const to = addDays(toDay, 1);
  const tipo = sp.get("tipo") ?? "ventas";
  const sb = s.supabase;
  let body: string;

  if (tipo === "pedidos") {
    const { data } = await sb
      .from("orders")
      .select("order_number, created_at, paid_at, status, customer_name, customer_email, document_type, document_number, payment_method, shipping_method, subtotal, discount, shipping_cost, total, receipt_number, coupon_code")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .order("created_at");
    body = csv([
      ["Pedido", "Creado", "Pagado", "Estado", "Cliente", "Correo", "Tipo doc.", "N.° doc.", "Pago", "Entrega", "Subtotal", "Descuento", "Envío", "Total", "Comprobante", "Cupón"],
      ...(data ?? []).map((o) => [o.order_number, o.created_at, o.paid_at, o.status, o.customer_name, o.customer_email, o.document_type, o.document_number, o.payment_method, o.shipping_method, o.subtotal, o.discount, o.shipping_cost, o.total, o.receipt_number, o.coupon_code]),
    ]);
  } else if (tipo === "productos") {
    const { data } = await sb.rpc("admin_top_products", { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: 50 });
    body = csv([["Producto", "Unidades", "Ingresos (S/)"], ...((data ?? []) as { product_name: string; units: number; revenue: number }[]).map((r) => [r.product_name, r.units, r.revenue])]);
  } else {
    const bucket = sp.get("agrupar") === "month" ? "month" : "day";
    const { data } = await sb.rpc("admin_sales_summary", { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket });
    body = csv([["Periodo", "Pedidos", "Unidades", "Ingresos (S/)"], ...((data ?? []) as { period: string; orders: number; units: number; revenue: number }[]).map((r) => [r.period, r.orders, r.units, r.revenue])]);
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexphone-${tipo}-${isoDay(from)}_${isoDay(toDay)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
