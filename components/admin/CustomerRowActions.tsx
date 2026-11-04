"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateCustomerAction } from "@/app/admin/actions";

export function CustomerRowActions({ id, isActive, role, self }: { id: string; isActive: boolean; role: "customer" | "admin"; self: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (self) return <span className="text-xs text-zinc-500">Tu cuenta</span>;
  const run = (patch: { is_active?: boolean; role?: "customer" | "admin" }, question: string) => {
    if (!confirm(question)) return;
    start(async () => {
      const r = await updateCustomerAction(id, patch);
      if (r.error) alert(r.error);
      router.refresh();
    });
  };
  return (
    <div className="flex justify-end gap-2">
      <button
        disabled={pending}
        className="btn btn-ghost !px-3 !py-1.5 text-xs"
        onClick={() => run({ is_active: !isActive }, isActive ? "¿Desactivar esta cuenta? No podrá comprar." : "¿Reactivar esta cuenta?")}
      >
        {isActive ? "Desactivar" : "Activar"}
      </button>
      <button
        disabled={pending}
        className="btn btn-ghost !px-3 !py-1.5 text-xs"
        onClick={() =>
          run(
            { role: role === "admin" ? "customer" : "admin" },
            role === "admin" ? "¿Quitar permisos de administrador?" : "¿Otorgar acceso TOTAL al panel administrativo a este usuario?",
          )
        }
      >
        {role === "admin" ? "Quitar admin" : "Hacer admin"}
      </button>
    </div>
  );
}
