"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { StageState } from "@/components/three/HeroScene";
import { usePrefersReducedMotion, useWebGLSupport } from "@/components/three/useWebGL";
import type { CameraPreset } from "@/lib/catalog-data";
import { formatPEN } from "@/lib/format";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => null,
});

export interface HeroProduct {
  slug: string;
  name: string;
  brand: string;
  price: number;
  preset: CameraPreset;
  modelUrl: string | null;
  colors: { name: string; hex: string; image: string | null }[];
}

export function HeroExperience({ product }: { product: HeroProduct }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<StageState>({ x: 1.05, y: 0, rotX: 0.08, rotY: -0.45, scale: 1, glow: 1 });
  const [colorIdx, setColorIdx] = useState(0);
  const gl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const color = product.colors[colorIdx];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 1024px)",
          mobile: "(max-width: 1023px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions as { desktop: boolean; reduce: boolean };
          const s = stage.current;
          const base = desktop
            ? { x: 1.05, y: 0, scale: 1, rotY: -0.45, rotX: 0.08 }
            : { x: 0, y: -0.62, scale: 0.62, rotY: -0.35, rotX: 0.05 };
          Object.assign(s, base);

          // Movimiento reducido: solo el panel principal, sin animaciones ligadas al scroll
          if (reduce) return;

          // Entrada cinematográfica
          gsap.from(s, { y: base.y - 2.2, rotY: base.rotY - Math.PI * 1.2, duration: 2, ease: "expo.out" });
          gsap.from(".hero-reveal", { y: 36, autoAlpha: 0, stagger: 0.09, duration: 1.2, ease: "expo.out", delay: 0.25 });

          // Historia guiada por el scroll: frente → cámaras → perfil
          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.8 },
          });
          tl.to(".hero-panel-1", { autoAlpha: 0, y: -70, duration: 0.5 }, 0.15)
            .to(".hero-scroll-cue", { autoAlpha: 0, duration: 0.2 }, 0)
            .to(s, { rotY: Math.PI + 0.4, x: desktop ? -1.05 : 0, y: desktop ? 0 : -0.55, duration: 1.1 }, 0.15)
            .fromTo(".hero-panel-2", { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.75)
            .to(".hero-panel-2", { autoAlpha: 0, y: -70, duration: 0.5 }, 1.6)
            .to(
              s,
              {
                rotY: Math.PI * 1.5 + 0.25,
                rotX: 0.18,
                x: desktop ? 1.15 : 0,
                scale: desktop ? 1.18 : 0.7,
                glow: 1.6,
                duration: 1.1,
              },
              1.6,
            )
            .fromTo(".hero-panel-3", { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 2.2)
            .to(s, { rotY: Math.PI * 2 - 0.4, rotX: 0.06, duration: 0.9 }, 2.75);
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative motion-safe:lg:h-[330vh] motion-safe:h-[300vh]" aria-label="Presentación">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Escenario: luces volumétricas y retícula */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-20%] h-[80vh] w-[80vw] -translate-x-1/2 rounded-full bg-electric/20 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[60vh] w-[50vw] rounded-full bg-violet/20 blur-[120px]" />
          <div className="absolute bottom-0 left-[-10%] h-[40vh] w-[40vw] rounded-full bg-cyan-500/10 blur-[100px]" />
          <div
            className="absolute inset-x-0 bottom-0 h-[45vh] opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              transform: "perspective(600px) rotateX(60deg)",
              transformOrigin: "bottom",
            }}
          />
        </div>

        {/* Smartphone 3D (o alternativa visual) */}
        {gl === "ok" ? (
          <HeroScene stage={stage} color={color.hex} preset={product.preset} modelUrl={product.modelUrl} reduced={reduced} />
        ) : gl === "unsupported" && color.image ? (
          <div className="absolute inset-x-0 bottom-0 top-[42%] lg:left-[48%] lg:top-[12%]">
            <Image src={color.image} alt={`${product.name} ${color.name}`} fill priority sizes="50vw" className="object-contain motion-safe:animate-[float_6s_ease-in-out_infinite]" />
          </div>
        ) : null}

        {/* Panel 1 — Hero */}
        <div className="hero-panel-1 absolute inset-0 flex items-start pt-28 lg:items-center lg:pt-0">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-xl">
              <p className="hero-reveal eyebrow">NEXPHONE · Future Smartphone Store</p>
              <h1 className="hero-reveal mt-5 font-display text-[clamp(2.6rem,7vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
                THE FUTURE
                <br />
                <span className="text-gradient">IN YOUR HANDS</span>
              </h1>
              <p className="hero-reveal mt-6 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
                Los smartphones más avanzados del mundo, en una experiencia hecha para descubrirlos en 3D.
              </p>
              <div className="hero-reveal mt-8 flex flex-wrap gap-3">
                <Link href="/catalogo" className="btn btn-primary group !px-6 !py-3.5">
                  EXPLORAR COLECCIÓN
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/catalogo?offers=1" className="btn btn-ghost !px-6 !py-3.5">
                  Ver ofertas
                </Link>
              </div>
              <div className="hero-reveal glass mt-10 hidden w-fit items-center gap-4 rounded-2xl p-3 pr-5 sm:flex">
                <div className="flex gap-2 pl-1" role="radiogroup" aria-label="Color del modelo 3D">
                  {product.colors.map((c, i) => (
                    <button
                      key={c.name}
                      role="radio"
                      aria-checked={i === colorIdx}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setColorIdx(i)}
                      className={cn(
                        "h-6 w-6 rounded-full ring-1 ring-white/30 transition-transform hover:scale-110",
                        i === colorIdx && "ring-2 ring-cyan-300 ring-offset-2 ring-offset-ink-900",
                      )}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
                <div className="h-8 w-px bg-white/10" />
                <Link href={`/producto/${product.slug}`} className="group text-sm">
                  <span className="block text-zinc-400">{product.name} · {color.name}</span>
                  <span className="font-medium text-white group-hover:text-cyan-200">
                    Desde {formatPEN(product.price)} →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2 — Cámaras */}
        <div className="hero-panel-2 invisible absolute inset-0 flex items-start pt-28 opacity-0 lg:items-center lg:pt-0">
          <div className="mx-auto flex w-full max-w-7xl justify-end px-6">
            <div className="max-w-md lg:text-right">
              <p className="eyebrow">Óptica de próxima generación</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Cámaras que ven <span className="text-gradient">más allá.</span>
              </h2>
              <p className="mt-4 text-zinc-400">
                Sensores de hasta 200 MP, teleobjetivos periscópicos y procesamiento con IA en cada disparo.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-3">
                {[
                  ["200", "MP máx."],
                  ["100x", "Zoom IA"],
                  ["8K", "Video"],
                ].map(([v, l]) => (
                  <div key={l} className="glass rounded-2xl p-4 text-left">
                    <dt className="font-display text-2xl font-semibold">{v}</dt>
                    <dd className="text-xs text-zinc-400">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Panel 3 — Diseño */}
        <div className="hero-panel-3 invisible absolute inset-0 flex items-start pt-28 opacity-0 lg:items-center lg:pt-0">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-md">
              <p className="eyebrow">Ingeniería de materiales</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Titanio. Vidrio. <span className="text-gradient">Precisión.</span>
              </h2>
              <p className="mt-4 text-zinc-400">
                Perfiles ultradelgados, marcos aeroespaciales y cristales resistentes. Explora cada modelo en 360°.
              </p>
              <Link href={`/producto/${product.slug}`} className="btn btn-ghost mt-8">
                Ver en 3D <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-scroll-cue absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-zinc-500 motion-safe:flex">
          Desliza
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
