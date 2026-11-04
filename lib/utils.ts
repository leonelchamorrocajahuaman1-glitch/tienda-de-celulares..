import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** UUID determinista (formato v4-like) a partir de un texto. Usado para IDs del catálogo semilla. */
export function stableId(input: string): string {
  // FNV-1a de 128 bits aproximado con 4 hashes de 32 bits
  const h = [0x811c9dc5, 0x01000193, 0x7fe4c3a1, 0x2a7b9e15].map((seed) => {
    let x = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
      x ^= input.charCodeAt(i);
      x = Math.imul(x, 0x01000193) >>> 0;
    }
    return x.toString(16).padStart(8, "0");
  });
  const hex = h.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
