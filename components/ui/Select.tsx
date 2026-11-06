"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Selector con el diseño de la tienda (reemplaza al <select> nativo, cuyo menú
 * depende del sistema operativo). Accesible: rol listbox, teclado (↑ ↓ Inicio Fin Enter Esc)
 * y escritura para saltar a una opción. Con `name` envía su valor en formularios.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  name,
  id,
  className,
  buttonClassName,
  disabled,
  placement = "bottom",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  name?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  placement?: "bottom" | "top";
}) {
  const auto = useId();
  const btnId = id ?? `sel-${auto}`;
  const listId = `${btnId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      requestAnimationFrame(() => list.current?.focus());
    }
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    document.getElementById(btnId)?.focus();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") document.getElementById(btnId)?.focus();
      return;
    } else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").startsWith(typed.current.text));
      if (i >= 0) setActive(i);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={btnId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // Con la lista abierta el botón reenvía las teclas (por si el foco aún no pasó a la lista)
          if (open) return onListKey(e);
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "input flex items-center justify-between gap-3 text-left disabled:opacity-50",
          open && "!border-cyan-400/60",
          buttonClassName,
        )}
      >
        <span className="truncate">{current?.label ?? "Selecciona"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300", open && "rotate-180 text-cyan-300")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={btnId}
            aria-activedescendant={`${btnId}-opt-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute left-0 z-50 max-h-72 min-w-full overflow-y-auto rounded-2xl border border-white/10 bg-ink-850/95 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] outline-none backdrop-blur-xl",
              placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${btnId}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors",
                    i === active ? "bg-white/[0.08] text-white" : "text-zinc-300",
                    selected && "text-cyan-200",
                  )}
                >
                  {o.label}
                  {selected && <Check className="h-4 w-4 text-cyan-300" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
