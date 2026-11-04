"use client";

import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAddressAction } from "@/app/(store)/cuenta/actions";
import { type Address, AddressForm } from "@/components/account/AddressForm";

export function AddressBook({ addresses, defaultRecipient }: { addresses: Address[]; defaultRecipient: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length ? null : "new");
  const [pending, start] = useTransition();
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <div className="space-y-4">
      {addresses.map((a) =>
        editing === a.id ? (
          <div key={a.id} className="card p-6">
            <AddressForm initial={a} onSaved={done} onCancel={() => setEditing(null)} />
          </div>
        ) : (
          <div key={a.id} className="card flex gap-4 p-5">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-cyan-300" />
            <div className="flex-1 text-sm">
              <p className="flex items-center gap-2 font-medium">
                {a.label}
                {a.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[0.65rem] text-cyan-300">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}
              </p>
              <p className="text-zinc-300">{a.recipient} · {a.phone}</p>
              <p className="text-zinc-400">{a.line1}, {a.district}, {a.province} — {a.department}</p>
              {a.reference && <p className="text-zinc-500">Ref.: {a.reference}</p>}
            </div>
            <div className="flex gap-1 self-start">
              <button onClick={() => setEditing(a.id)} className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Editar dirección">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (!confirm("¿Eliminar esta dirección?")) return;
                  start(async () => {
                    await deleteAddressAction(a.id);
                    router.refresh();
                  });
                }}
                className="rounded-full p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Eliminar dirección"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <div className="card p-6">
          <h2 className="mb-5 font-display text-lg font-semibold">Nueva dirección</h2>
          <AddressForm defaultRecipient={defaultRecipient} onSaved={done} onCancel={addresses.length ? () => setEditing(null) : undefined} />
        </div>
      ) : (
        <button onClick={() => setEditing("new")} className="btn btn-ghost">
          <Plus className="h-4 w-4" /> Agregar dirección
        </button>
      )}
    </div>
  );
}
