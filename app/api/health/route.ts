import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/system-status";

export const dynamic = "force-dynamic";

/** Estado público (sin detalles sensibles) para monitoreo y verificación del despliegue. */
export async function GET() {
  const checks = await getSystemStatus(false);
  const ok = checks.every((c) => c.ok !== false);
  return NextResponse.json(
    { ok, checks: checks.map(({ id, label, ok, detail }) => ({ id, label, ok, detail: id === "site" ? undefined : detail })) },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
