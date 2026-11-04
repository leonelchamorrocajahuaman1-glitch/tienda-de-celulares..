"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { saveAddressAction } from "@/app/(store)/cuenta/actions";
import { PERU_DEPARTMENTS } from "@/lib/peru";

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  line1: string;
  reference: string | null;
  is_default: boolean;
}

export function AddressForm({
  initial,
  defaultRecipient,
  defaultPhone,
  onSaved,
  onCancel,
}: {
  initial?: Address;
  defaultRecipient?: string;
  defaultPhone?: string;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data = {
          label: String(fd.get("label") || "Casa"),
          recipient: String(fd.get("recipient") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          department: String(fd.get("department") ?? ""),
          province: String(fd.get("province") ?? ""),
          district: String(fd.get("district") ?? ""),
          line1: String(fd.get("line1") ?? ""),
          reference: String(fd.get("reference") ?? ""),
          is_default: fd.get("is_default") === "on",
        };
        setError(null);
        start(async () => {
          const res = await saveAddressAction(data, initial?.id);
          if (res.error) setError(res.error);
          else if (res.address) onSaved(res.address as unknown as Address);
        });
      }}
    >
      {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200 sm:col-span-2">{error}</p>}
      <div>
        <label className="label" htmlFor="a-label">Nombre de la dirección</label>
        <input id="a-label" name="label" className="input" defaultValue={initial?.label ?? "Casa"} maxLength={40} />
      </div>
      <div>
        <label className="label" htmlFor="a-recipient">Quién recibe</label>
        <input id="a-recipient" name="recipient" required className="input" defaultValue={initial?.recipient ?? defaultRecipient} maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="a-phone">Teléfono de contacto</label>
        <input id="a-phone" name="phone" type="tel" required className="input" defaultValue={initial?.phone ?? defaultPhone} />
      </div>
      <div>
        <label className="label" htmlFor="a-dep">Departamento</label>
        <select id="a-dep" name="department" required className="input" defaultValue={initial?.department ?? "Lima"}>
          {PERU_DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="a-prov">Provincia</label>
        <input id="a-prov" name="province" required className="input" defaultValue={initial?.province ?? "Lima"} maxLength={60} />
      </div>
      <div>
        <label className="label" htmlFor="a-dist">Distrito</label>
        <input id="a-dist" name="district" required className="input" defaultValue={initial?.district} maxLength={60} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="a-line">Dirección</label>
        <input id="a-line" name="line1" required className="input" placeholder="Av. / Jr. / Calle, número, dpto." defaultValue={initial?.line1} maxLength={200} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="a-ref">Referencia (opcional)</label>
        <input id="a-ref" name="reference" className="input" defaultValue={initial?.reference ?? ""} maxLength={200} />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
        <input type="checkbox" name="is_default" defaultChecked={initial?.is_default} className="h-4 w-4 accent-cyan-400" />
        Usar como dirección principal
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar dirección
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
