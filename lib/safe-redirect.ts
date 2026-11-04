/** Evita redirecciones abiertas: solo rutas internas relativas. */
export function safeNext(next: unknown, fallback = "/cuenta"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
