"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { updateProfileAction } from "@/app/(store)/cuenta/actions";
import { Select } from "@/components/ui/Select";

export function ProfileForm({ initial }: { initial: { full_name: string; phone: string; document_type: string | null; document_number: string | null; email: string } }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [docType, setDocType] = useState(initial.document_type ?? "DNI");
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateProfileAction({
            full_name: String(fd.get("full_name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            document_type: (fd.get("document_type") as string) || null,
            document_number: String(fd.get("document_number") ?? ""),
          });
          setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Perfil actualizado" });
        });
      }}
    >
      <div className="sm:col-span-2">
        <label className="label">Correo electrónico</label>
        <input className="input opacity-60" value={initial.email} disabled readOnly />
      </div>
      <div>
        <label className="label" htmlFor="p-name">Nombre completo</label>
        <input id="p-name" name="full_name" required className="input" defaultValue={initial.full_name} maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">Celular</label>
        <input id="p-phone" name="phone" type="tel" className="input" defaultValue={initial.phone} />
      </div>
      <div>
        <label className="label" htmlFor="p-dt">Tipo de documento</label>
        <Select
          id="p-dt"
          name="document_type"
          value={docType}
          onChange={setDocType}
          options={["DNI", "CE", "RUC", "PASAPORTE"].map((v) => ({ value: v, label: v === "PASAPORTE" ? "Pasaporte" : v }))}
        />
      </div>
      <div>
        <label className="label" htmlFor="p-dn">Número de documento</label>
        <input id="p-dn" name="document_number" className="input" defaultValue={initial.document_number ?? ""} maxLength={15} />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
        </button>
        {msg && <p role="status" className={msg.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{msg.text}</p>}
      </div>
    </form>
  );
}
