"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPEN } from "@/lib/format";

// Serie única por gráfico: un solo tono (azul eléctrico suave, validado contra la superficie oscura)
const SERIES = "#5b8cff";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = { fill: "#8b93a7", fontSize: 11 };

function TooltipBox({ active, payload, label, money = true }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-zinc-400">{label}</p>
      <p className="font-mono text-sm text-white">{money ? formatPEN(payload[0].value) : payload[0].value}</p>
      {"orders" in p && <p className="text-zinc-400">{String(p.orders)} pedidos</p>}
      {"units" in p && <p className="text-zinc-400">{String(p.units)} unidades</p>}
    </div>
  );
}

export function SalesChart({ data, height = 260 }: { data: { label: string; revenue: number; orders: number }[]; height?: number }) {
  if (!data.length) return <p className="grid place-items-center text-sm text-zinc-500" style={{ height }}>Sin ventas en el periodo</p>;
  return (
    <div style={{ height }} role="img" aria-label="Ingresos por periodo">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={SERIES} stopOpacity={0.35} />
              <stop offset="1" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `S/ ${Number(v).toLocaleString("es-PE")}`} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="revenue" stroke={SERIES} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: "#0c0f17", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data, height = 260 }: { data: { name: string; units: number; revenue: number }[]; height?: number }) {
  if (!data.length) return <p className="grid place-items-center text-sm text-zinc-500" style={{ height }}>Sin datos</p>;
  return (
    <div style={{ height }} role="img" aria-label="Unidades vendidas por producto">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={130} />
          <Tooltip content={<TooltipBox money={false} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="units" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
