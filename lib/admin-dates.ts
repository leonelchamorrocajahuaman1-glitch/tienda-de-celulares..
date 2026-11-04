/** Utilidades de fechas en zona horaria de Lima (UTC−5, sin horario de verano). */
const OFFSET_MS = 5 * 3600 * 1000;

export function limaDayStart(d = new Date()): Date {
  const local = new Date(d.getTime() - OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET_MS);
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86400000);
}

export function isoDay(d: Date) {
  return new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

/** Convierte "YYYY-MM-DD" (fecha local de Lima) en el instante de inicio de ese día. */
export function parseLimaDay(s: string | undefined, fallback: Date): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + OFFSET_MS;
  return Number.isFinite(t) ? new Date(t) : fallback;
}
