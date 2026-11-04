import { CustomerRowActions } from "@/components/admin/CustomerRowActions";
import { Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPEN } from "@/lib/format";

export const metadata = { title: "Clientes" };

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  role: "customer" | "admin";
  is_active: boolean;
  created_at: string;
  orders: number;
  spent: number;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireAdmin();
  const { data } = await supabase.rpc("admin_customers");
  const q = (sp.q ?? "").toLowerCase().trim();
  const rows = ((data ?? []) as Row[]).filter((r) => !q || `${r.full_name} ${r.email} ${r.document_number}`.toLowerCase().includes(q));
  return (
    <>
      <PageHeader title="Clientes" subtitle={`${rows.length} cuentas registradas`} />
      <Panel>
        <form className="mb-4 flex gap-3">
          <input name="q" defaultValue={sp.q} placeholder="Nombre, correo o documento" className="input max-w-sm" />
          <button className="btn btn-ghost">Buscar</button>
        </form>
        {rows.length === 0 ? (
          <Empty>No hay clientes.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><th>Cliente</th><th>Contacto</th><th>Documento</th><th>Registro</th><th className="!text-right">Pedidos</th><th className="!text-right">Comprado</th><th>Rol</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                  <td className="font-medium">{r.full_name || "—"}{!r.is_active && <span className="ml-2 text-xs text-rose-300">desactivada</span>}</td>
                  <td>{r.email}<span className="block text-xs text-zinc-500">{r.phone}</span></td>
                  <td className="text-xs">{r.document_number ? `${r.document_type} ${r.document_number}` : "—"}</td>
                  <td className="text-xs text-zinc-400">{formatDate(r.created_at)}</td>
                  <td className="text-right">{r.orders}</td>
                  <td className="text-right font-mono">{formatPEN(r.spent)}</td>
                  <td>{r.role === "admin" ? <span className="text-violet-300">Admin</span> : "Cliente"}</td>
                  <td><CustomerRowActions id={r.id} isActive={r.is_active} role={r.role} self={r.id === user.id} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="mt-4 text-xs text-zinc-500">Por privacidad (Ley N.° 29733) solo se muestran los datos necesarios para la gestión comercial. Las contraseñas nunca son accesibles.</p>
      </Panel>
    </>
  );
}
