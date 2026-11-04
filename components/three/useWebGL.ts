"use client";

import { useEffect, useState } from "react";

export type GLSupport = "checking" | "ok" | "unsupported";

/** Detecta si el dispositivo puede renderizar WebGL de forma fiable. */
export function useWebGLSupport(): GLSupport {
  const [state, setState] = useState<GLSupport>("checking");
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
      if (!gl) return setState("unsupported");
      const lowMemory =
        typeof navigator !== "undefined" &&
        "deviceMemory" in navigator &&
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 2;
      const saveData =
        typeof navigator !== "undefined" &&
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
      setState(lowMemory || saveData ? "unsupported" : "ok");
    } catch {
      setState("unsupported");
    }
  }, []);
  return state;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
