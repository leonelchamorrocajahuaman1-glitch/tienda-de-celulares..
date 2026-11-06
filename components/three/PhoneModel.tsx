"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CameraPreset } from "@/lib/catalog-data";

/**
 * Smartphone 3D fotorrealista construido con geometría real (sin imágenes ni modelos de terceros):
 *  - chasis con cantos redondeados y proporciones distintas por familia de diseño,
 *  - marco metálico (titanio cepillado o aluminio pulido) con bandas de antena,
 *  - vidrio trasero esmerilado con micro-textura y meseta de cámara brillante,
 *  - lentes de varias capas (bisel torneado, carcasa, anillos internos, recubrimiento iridiscente y cristal),
 *  - flash LED, sensores, micrófonos, puerto USB-C, rejillas de altavoz, bandeja SIM y botones,
 *  - pantalla OLED con biseles finos, isla dinámica / cámara perforada y auricular.
 * Los materiales "frame", "back" y "body" llevan nombres estándar para teñirse por variante (también en GLB exportados).
 */
export const PHONE = { w: 0.76, h: 1.6, d: 0.085, r: 0.11 };

interface BodySpec {
  w: number;
  h: number;
  d: number;
  /** radio de las esquinas vistas de frente */
  r: number;
  /** radio del canto (perfil lateral): pequeño = cantos planos, grande = cantos curvos */
  edge: number;
  bezel: number;
  brushed: boolean;
  backRoughness: number;
}

const BODY: Record<CameraPreset, BodySpec> = {
  square: { w: 0.77, h: 1.6, d: 0.083, r: 0.118, edge: 0.007, bezel: 0.02, brushed: true, backRoughness: 0.42 },
  vertical: { w: 0.77, h: 1.63, d: 0.08, r: 0.075, edge: 0.012, bezel: 0.016, brushed: false, backRoughness: 0.3 },
  circle: { w: 0.76, h: 1.62, d: 0.088, r: 0.1, edge: 0.024, bezel: 0.015, brushed: false, backRoughness: 0.36 },
  bar: { w: 0.74, h: 1.58, d: 0.086, r: 0.125, edge: 0.016, bezel: 0.019, brushed: false, backRoughness: 0.55 },
};

// ---------------------------------------------------------------- geometría
function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Losa redondeada centrada en z=0 con canto curvo (bevel) de radio `edge`. */
function roundedSlab(w: number, h: number, r: number, depth: number, edge: number, segments = 6) {
  const e = Math.min(edge, depth / 2 - 0.0005, r - 0.001);
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - 2 * e, h - 2 * e, Math.max(r - e, 0.001)), {
    depth: Math.max(depth - 2 * e, 0.0002),
    bevelEnabled: true,
    bevelThickness: e,
    bevelSize: e,
    bevelSegments: segments,
    curveSegments: 24,
  });
  g.translate(0, 0, -(depth - 2 * e) / 2);
  g.computeVertexNormals();
  return g;
}

/** Plano redondeado con UV 0–1 (pantalla). */
function roundedPlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 16);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Sólido de revolución: puntos [radio, altura]; el eje +Y sale de la cara trasera. */
function lathe(points: [number, number][], segments = 64) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

// ---------------------------------------------------------------- texturas procedurales
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = false) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Micro-textura del vidrio esmerilado (variación de rugosidad). */
function frostedRoughness() {
  const t = canvasTexture(256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 175 + Math.random() * 60;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
  if (t) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 12);
  }
  return t;
}

/** Cepillado lineal del titanio (rugosidad en franjas finas). */
function brushedRoughness() {
  const t = canvasTexture(256, (ctx, s) => {
    for (let y = 0; y < s; y++) {
      const v = 120 + Math.random() * 70;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, s, 1);
    }
  });
  if (t) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 8);
  }
  return t;
}

/** Convierte un mapa de alturas en un mapa normal (relieve real que reacciona a la luz). */
function heightToNormal(size: number, height: Float32Array, strength: number, repeat: [number, number]) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

function blur(h: Float32Array, size: number, passes: number) {
  let a = h;
  for (let p = 0; p < passes; p++) {
    const b = new Float32Array(a.length);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let k = -1; k <= 1; k++)
          for (let j = -1; j <= 1; j++) sum += a[((y + k + size) % size) * size + ((x + j + size) % size)];
        b[y * size + x] = sum / 9;
      }
    a = b;
  }
  return a;
}

/** Vidrio esmerilado: grano fino y suave (como el arenado químico del vidrio mate). */
function frostedNormal() {
  const S = 256;
  const h = new Float32Array(S * S).map(() => Math.random());
  return heightToNormal(S, blur(h, S, 2), 6, [5, 10]);
}

/** Metal cepillado: vetas lineales finas con variación. */
function brushedNormal() {
  const S = 256;
  const h = new Float32Array(S * S);
  const rows = Array.from({ length: S }, () => Math.random());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = rows[y] * 0.8 + Math.random() * 0.2;
  return heightToNormal(S, h, 3, [1, 6]);
}

/** Torneado concéntrico de los biseles de lentes (líneas a lo largo del perfil de revolución). */
function machinedNormal() {
  const S = 128;
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const v = Math.sin(y * 1.7) * 0.5 + Math.random() * 0.25;
    for (let x = 0; x < S; x++) h[y * S + x] = v;
  }
  return heightToNormal(S, h, 2.5, [1, 4]);
}

/** Flash LED: matriz de diodos bajo difusor. */
function flashTexture() {
  return canvasTexture(
    128,
    (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
      g.addColorStop(0, "#fff6dc");
      g.addColorStop(0.7, "#e9d9a8");
      g.addColorStop(1, "#b9a777");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(255,190,80,0.55)";
      for (const [x, y] of [[0.36, 0.36], [0.64, 0.36], [0.36, 0.64], [0.64, 0.64]]) {
        ctx.beginPath();
        ctx.arc(x * s, y * s, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(120,100,60,0.35)";
      for (let i = 0; i < s; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, s);
        ctx.stroke();
      }
    },
    true,
  );
}

/** Pantalla de bloqueo: fondo aurora, barra de estado, hora, widgets y barra de gestos. */
function createScreenTexture(notch: "island" | "punch") {
  if (typeof document === "undefined") return null;
  const W = 720;
  const H = 1520;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#04050c");
  bg.addColorStop(1, "#070a18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, number, string][] = [
    [W * 0.15, H * 0.78, 560, "rgba(47,107,255,0.85)"],
    [W * 0.9, H * 0.6, 500, "rgba(139,92,246,0.75)"],
    [W * 0.55, H * 1.0, 480, "rgba(34,211,238,0.65)"],
    [W * 0.6, H * 0.42, 300, "rgba(34,211,238,0.25)"],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // ondas finas tipo "aurora"
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#9fd8ff";
  for (let k = 0; k < 14; k++) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = H * 0.62 + k * 18 + Math.sin(x / 90 + k * 0.6) * 40;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  veil.addColorStop(0, "rgba(3,4,10,0.9)");
  veil.addColorStop(1, "rgba(3,4,10,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);

  // barra de estado
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("9:41", 62, 72);
  // señal
  for (let i = 0; i < 4; i++) ctx.fillRect(W - 210 + i * 12, 64 - i * 7, 8, 10 + i * 7);
  // wifi
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W - 136, 72, 8 + i * 9, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  // batería
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.roundRect(W - 104, 50, 52, 26, 8);
  ctx.stroke();
  ctx.fillRect(W - 50, 58, 4, 10);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.roundRect(W - 100, 54, 38, 18, 5);
  ctx.fill();

  // fecha y hora
  ctx.textAlign = "center";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText("Viernes 6 de noviembre", W / 2, 248);
  ctx.font = "250 220px system-ui, sans-serif";
  ctx.fillText("9:41", W / 2, 450);

  // widgets de cristal
  const widget = (x: number, label: string, value: string) => {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(x, 500, 150, 150, 36);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "600 44px system-ui, sans-serif";
    ctx.fillText(value, x + 75, 586);
    ctx.font = "500 22px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(label, x + 75, 622);
  };
  widget(W / 2 - 250, "Lima", "22°");
  widget(W / 2 - 75, "Batería", "98%");
  widget(W / 2 + 100, "Pasos", "8.2k");

  // accesos inferiores
  for (const x of [110, W - 110]) {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.arc(x, H - 170, 50, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(98, H - 196, 24, 46);
  ctx.beginPath();
  ctx.arc(W - 110, H - 170, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("N E X P H O N E", W / 2, H - 90);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 110, H - 42, 220, 9, 5);
  ctx.fill();
  // la isla/cámara se dibuja en 3D; aquí solo la "sombra" negra
  ctx.fillStyle = "#000";
  ctx.beginPath();
  if (notch === "island") ctx.roundRect(W / 2 - 105, 30, 210, 62, 31);
  else ctx.arc(W / 2, 58, 24, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function useLerpedColor(hex: string, instant = false) {
  const target = useMemo(() => new THREE.Color(hex), [hex]);
  const current = useRef(new THREE.Color(hex));
  useEffect(() => {
    if (instant) current.current.copy(target);
  }, [instant, target]);
  return { target, current };
}

// ---------------------------------------------------------------- componentes
type Mats = ReturnType<typeof createMaterials>;

function createMaterials(spec: BodySpec, initial: THREE.Color) {
  const brushed = spec.brushed ? brushedRoughness() : null;
  const brushedN = spec.brushed ? brushedNormal() : null;
  const frost = frostedRoughness();
  const frostN = frostedNormal();
  const machinedN = machinedNormal();
  const flashMap = flashTexture();
  const frame = new THREE.MeshPhysicalMaterial({
    name: "frame",
    color: initial.clone(),
    metalness: 1,
    roughness: spec.brushed ? 0.34 : 0.14,
    roughnessMap: brushed,
    normalMap: brushedN,
    normalScale: new THREE.Vector2(0.35, 0.35),
    anisotropy: spec.brushed ? 0.8 : 0.3,
    anisotropyRotation: Math.PI / 2,
    clearcoat: spec.brushed ? 0.2 : 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.7,
  });
  const back = new THREE.MeshPhysicalMaterial({
    name: "back",
    color: initial.clone(),
    metalness: 0.12,
    roughness: spec.backRoughness,
    roughnessMap: frost,
    normalMap: frostN,
    normalScale: new THREE.Vector2(0.22, 0.22),
    // Acabado satinado: base mate esmerilada + capa superior que capta un barrido de luz suave
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color("#ffffff"),
    envMapIntensity: 1.35,
  });
  const body = new THREE.MeshPhysicalMaterial({
    name: "body",
    color: initial.clone(),
    metalness: 0.25,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.6,
  });
  return {
    frame,
    back,
    body,
    frontGlass: new THREE.MeshPhysicalMaterial({
      name: "screen-glass",
      color: "#010203",
      metalness: 0.05,
      roughness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      envMapIntensity: 1.4,
    }),
    antenna: new THREE.MeshPhysicalMaterial({ color: "#2a2c31", roughness: 0.55, metalness: 0.1 }),
    ring: new THREE.MeshPhysicalMaterial({
      color: "#d4d8df",
      metalness: 1,
      roughness: 0.16,
      normalMap: machinedN,
      normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 1.8,
    }),
    // Reflejo del cristal sobre la pantalla encendida (solo suma brillo del entorno)
    screenSheen: new THREE.MeshStandardMaterial({
      color: "#000000",
      metalness: 1,
      roughness: 0.06,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      envMapIntensity: 0.55,
    }),
    darkMetal: new THREE.MeshPhysicalMaterial({ color: "#1c1e23", metalness: 0.85, roughness: 0.32 }),
    housing: new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.75, metalness: 0.2 }),
    element: new THREE.MeshPhysicalMaterial({ color: "#0d0f16", metalness: 0.7, roughness: 0.18, clearcoat: 1 }),
    coating: new THREE.MeshPhysicalMaterial({
      color: "#1b2d6e",
      metalness: 0.5,
      roughness: 0.08,
      iridescence: 1,
      iridescenceIOR: 1.8,
      iridescenceThicknessRange: [220, 680],
      emissive: "#0a1440",
      emissiveIntensity: 0.35,
    }),
    lensGlass: new THREE.MeshPhysicalMaterial({
      color: "#0a0d14",
      metalness: 0,
      roughness: 0,
      transparent: true,
      opacity: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0,
      iridescence: 0.6,
      envMapIntensity: 2.4,
      depthWrite: false,
    }),
    windowGlass: new THREE.MeshPhysicalMaterial({ color: "#030406", roughness: 0.04, metalness: 0.3, clearcoat: 1 }),
    flash: new THREE.MeshPhysicalMaterial({ map: flashMap, roughness: 0.45, metalness: 0, clearcoat: 1 }),
    hole: new THREE.MeshStandardMaterial({ color: "#000000", roughness: 1 }),
    port: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: 0.6, metalness: 0.6 }),
    textures: [brushed, brushedN, frost, frostN, machinedN, flashMap],
  };
}

function Lens({ x, y, z, R, H = 0.022, mats, metalRing = true }: { x: number; y: number; z: number; R: number; H?: number; mats: Mats; metalRing?: boolean }) {
  const geo = useMemo(
    () => ({
      bezel: lathe([
        [R * 0.8, 0],
        [R, 0],
        [R * 1.03, H * 0.2],
        [R * 1.02, H * 0.85],
        [R * 0.97, H],
        [R * 0.88, H],
        [R * 0.85, H * 0.88],
      ]),
      inner1: new THREE.TorusGeometry(R * 0.66, R * 0.035, 10, 64),
      inner2: new THREE.TorusGeometry(R * 0.46, R * 0.03, 10, 48),
    }),
    [R, H],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return (
    <group position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geo.bezel} material={metalRing ? mats.ring : mats.darkMetal} castShadow />
      <mesh material={mats.housing} position={[0, H * 0.42, 0]}>
        <cylinderGeometry args={[R * 0.86, R * 0.86, H * 0.84, 48]} />
      </mesh>
      <mesh geometry={geo.inner1} material={mats.element} position={[0, H * 0.86, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geo.inner2} material={mats.element} position={[0, H * 0.87, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh material={mats.coating} position={[0, H * 0.865, 0]}>
        <cylinderGeometry args={[R * 0.6, R * 0.6, 0.0008, 48]} />
      </mesh>
      <mesh material={mats.hole} position={[0, H * 0.868, 0]}>
        <cylinderGeometry args={[R * 0.17, R * 0.17, 0.0009, 32]} />
      </mesh>
      {/* cristal de zafiro con reflejo */}
      <mesh material={mats.lensGlass} position={[0, H * 0.96, 0]} scale={[1, 0.12, 1]}>
        <sphereGeometry args={[R * 0.86, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function Flash({ x, y, z, R, mats }: { x: number; y: number; z: number; R: number; mats: Mats }) {
  return (
    <group position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={mats.ring} position={[0, 0.0015, 0]}>
        <cylinderGeometry args={[R * 1.15, R * 1.2, 0.003, 32]} />
      </mesh>
      <mesh material={mats.flash} position={[0, 0.0032, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[R, R, 0.0006, 32]} />
      </mesh>
    </group>
  );
}

function Dot({ x, y, z, r, mats, material }: { x: number; y: number; z: number; r: number; mats: Mats; material?: THREE.Material }) {
  return (
    <mesh material={material ?? mats.housing} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, 0.001, 24]} />
    </mesh>
  );
}

export interface PhoneModelProps {
  color: string;
  preset?: CameraPreset;
  /** Cambio de color instantáneo (renders estáticos). */
  instantColor?: boolean;
  screenOn?: boolean;
}

export const PhoneModel = forwardRef<THREE.Group, PhoneModelProps>(function PhoneModel(
  { color, preset = "square", instantColor = false, screenOn = true },
  ref,
) {
  const spec = BODY[preset];
  const { w, h, d, r, edge, bezel } = spec;
  const { target, current } = useLerpedColor(color, instantColor);
  const mats = useMemo(() => createMaterials(spec, current.current), [spec, current]);

  const screenTex = useMemo(() => createScreenTexture(preset === "square" ? "island" : "punch"), [preset]);
  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: screenOn ? "#ffffff" : "#050505" }),
    [screenTex, screenOn],
  );

  const geo = useMemo(
    () => ({
      chassis: roundedSlab(w, h, r, d, edge, 8),
      back: roundedSlab(w - 2 * edge - 0.006, h - 2 * edge - 0.006, Math.max(r - edge - 0.003, 0.02), 0.004, 0.0018, 3),
      front: roundedSlab(w - 2 * edge - 0.002, h - 2 * edge - 0.002, Math.max(r - edge - 0.001, 0.02), 0.004, 0.0015, 3),
      screen: roundedPlane(w - 2 * edge - 2 * bezel, h - 2 * edge - 2 * bezel, Math.max(r - edge - bezel, 0.02)),
      plateau: roundedSlab(0.4, 0.42, 0.1, 0.014, 0.006, 5),
      visor: roundedSlab(w - 0.004, 0.19, 0.095, 0.032, 0.014, 6),
      visorWindow: roundedPlane(0.44, 0.105, 0.052),
      island: lathe(
        [
          [0, 0],
          [0.245, 0],
          [0.255, 0.012],
          [0.255, 0.03],
          [0.235, 0.036],
          [0, 0.036],
        ],
        96,
      ),
      periscope: roundedPlane(0.1, 0.1, 0.025),
    }),
    [w, h, r, d, edge, bezel],
  );

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.entries(mats).forEach(([k, m]) => {
        if (k === "textures") (m as (THREE.Texture | null)[]).forEach((t) => t?.dispose());
        else (m as THREE.Material).dispose();
      });
      screenTex?.dispose();
      screenMat.dispose();
    },
    [geo, mats, screenTex, screenMat],
  );

  // Transición suave del color de la variante
  const frameTint = useMemo(() => new THREE.Color(), []);
  const grey = useMemo(() => new THREE.Color("#a7adb6"), []);
  useFrame((_, dt) => {
    if (instantColor) current.current.copy(target);
    else current.current.lerp(target, Math.min(1, dt * 6));
    mats.back.color.copy(current.current);
    mats.body.color.copy(current.current).multiplyScalar(0.94);
    frameTint.copy(current.current).lerp(grey, spec.brushed ? 0.3 : 0.45);
    mats.frame.color.copy(frameTint);
    mats.antenna.color.copy(current.current).multiplyScalar(0.45);
  });

  const back = -d / 2 - 0.0012; // superficie del vidrio trasero
  const front = d / 2 + 0.0012;
  const sx = w / 2; // lado derecho visto de frente (+x)

  // ---------------- módulo de cámara según la familia de diseño
  const camera = (() => {
    switch (preset) {
      case "square": {
        const cx = sx - edge - 0.215;
        const cy = h / 2 - edge - 0.225;
        const top = back - 0.013;
        return (
          <group>
            <mesh geometry={geo.plateau} material={mats.body} position={[cx, cy, back - 0.006]} castShadow />
            <Lens mats={mats} x={cx + 0.082} y={cy + 0.095} z={top} R={0.074} H={0.026} />
            <Lens mats={mats} x={cx + 0.082} y={cy - 0.095} z={top} R={0.074} H={0.026} />
            <Lens mats={mats} x={cx - 0.088} y={cy} z={top} R={0.074} H={0.026} />
            <Flash mats={mats} x={cx - 0.1} y={cy + 0.13} z={top} R={0.024} />
            <Dot mats={mats} x={cx - 0.1} y={cy - 0.13} z={top - 0.0005} r={0.02} material={mats.windowGlass} />
            <Dot mats={mats} x={cx - 0.035} y={cy + 0.165} z={top - 0.0005} r={0.006} material={mats.hole} />
          </group>
        );
      }
      case "vertical": {
        const cx = sx - edge - 0.118;
        const topY = h / 2 - edge - 0.135;
        return (
          <group>
            {[0, 1, 2].map((i) => (
              <Lens key={i} mats={mats} x={cx} y={topY - i * 0.145} z={back} R={0.058} H={0.018} />
            ))}
            {/* sensor de enfoque láser */}
            <Dot mats={mats} x={cx - 0.11} y={topY - 0.035} z={back - 0.0006} r={0.012} material={mats.windowGlass} />
            <Flash mats={mats} x={cx - 0.11} y={topY - 0.09} z={back} R={0.016} />
            <Dot mats={mats} x={cx - 0.11} y={topY - 0.15} z={back - 0.0006} r={0.011} material={mats.windowGlass} />
          </group>
        );
      }
      case "circle": {
        const cy = h / 2 - edge - 0.31;
        const cx = 0;
        const top = back - 0.0365;
        return (
          <group>
            <mesh geometry={geo.island} material={mats.ring} position={[cx, cy, back]} rotation={[-Math.PI / 2, 0, 0]} castShadow />
            <mesh material={mats.body} position={[cx, cy, back - 0.0362]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.232, 0.232, 0.0008, 96]} />
            </mesh>
            {/* anillos grabados decorativos */}
            {[0.2, 0.214].map((rr) => (
              <mesh key={rr} material={mats.darkMetal} position={[cx, cy, back - 0.0366]}>
                <torusGeometry args={[rr, 0.0012, 6, 96]} />
              </mesh>
            ))}
            <Lens mats={mats} x={cx - 0.088} y={cy + 0.088} z={top} R={0.066} H={0.016} metalRing={false} />
            <Lens mats={mats} x={cx + 0.088} y={cy + 0.088} z={top} R={0.066} H={0.016} metalRing={false} />
            <Lens mats={mats} x={cx - 0.088} y={cy - 0.088} z={top} R={0.066} H={0.016} metalRing={false} />
            {/* teleobjetivo periscópico (ventana cuadrada) */}
            <group position={[cx + 0.088, cy - 0.088, top - 0.002]} rotation={[0, Math.PI, 0]}>
              <mesh geometry={geo.periscope} material={mats.windowGlass} scale={1.15} />
              <mesh material={mats.coating} position={[0, 0, 0.0008]}>
                <circleGeometry args={[0.03, 32]} />
              </mesh>
            </group>
            <Flash mats={mats} x={cx} y={cy + 0.17} z={top} R={0.016} />
          </group>
        );
      }
      case "bar":
      default: {
        const cy = h / 2 - edge - 0.27;
        const top = back - 0.0285;
        return (
          <group>
            <mesh geometry={geo.visor} material={mats.frame} position={[0, cy, back - 0.012]} castShadow />
            <mesh geometry={geo.visorWindow} material={mats.windowGlass} position={[-0.02, cy, top - 0.0003]} rotation={[0, Math.PI, 0]} />
            {[-0.17, -0.06, 0.05].map((x, i) => (
              <Lens key={i} mats={mats} x={x} y={cy} z={top} R={i === 0 ? 0.046 : 0.04} H={0.006} metalRing={false} />
            ))}
            <Flash mats={mats} x={0.16} y={cy + 0.022} z={top} R={0.014} />
            <Dot mats={mats} x={0.16} y={cy - 0.026} z={top - 0.0006} r={0.01} material={mats.windowGlass} />
          </group>
        );
      }
    }
  })();

  // ---------------- botones y bandeja SIM
  const isApple = preset === "square";
  const btnD = d * 0.42;
  const buttons = isApple ? (
    <>
      {/* derecha: encendido + control de cámara */}
      <RoundedBox args={[0.012, 0.21, btnD]} radius={0.005} smoothness={4} position={[sx + 0.003, 0.25, 0]} material={mats.frame} />
      <RoundedBox args={[0.006, 0.1, btnD * 0.9]} radius={0.0028} smoothness={3} position={[sx + 0.0012, -0.2, 0]} material={mats.windowGlass} />
      {/* izquierda: botón de acción + volumen */}
      <RoundedBox args={[0.012, 0.07, btnD]} radius={0.005} smoothness={4} position={[-sx - 0.003, 0.44, 0]} material={mats.frame} />
      <RoundedBox args={[0.012, 0.13, btnD]} radius={0.005} smoothness={4} position={[-sx - 0.003, 0.29, 0]} material={mats.frame} />
      <RoundedBox args={[0.012, 0.13, btnD]} radius={0.005} smoothness={4} position={[-sx - 0.003, 0.13, 0]} material={mats.frame} />
    </>
  ) : (
    <>
      {/* derecha: volumen (balancín) + encendido */}
      <RoundedBox args={[0.011, 0.22, btnD]} radius={0.0048} smoothness={4} position={[sx + 0.0026, 0.34, 0]} material={mats.frame} />
      <RoundedBox args={[0.011, 0.12, btnD]} radius={0.0048} smoothness={4} position={[sx + 0.0026, 0.08, 0]} material={mats.frame} />
      {/* izquierda: bandeja SIM al ras con su orificio */}
      <mesh material={mats.port} position={[-sx + 0.0002, -0.42, 0]}>
        <boxGeometry args={[0.002, 0.15, d * 0.38]} />
      </mesh>
      <mesh material={mats.hole} position={[-sx - 0.0002, -0.335, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.002, 12]} />
      </mesh>
    </>
  );

  // ---------------- bandas de antena (cortes del marco)
  const antennas: [number, number, number, [number, number, number]][] = [
    [sx - 0.0005, h / 2 - 0.2, 0, [0.004, 0.009, d * 0.72]],
    [-sx + 0.0005, h / 2 - 0.2, 0, [0.004, 0.009, d * 0.72]],
    [sx - 0.0005, -h / 2 + 0.2, 0, [0.004, 0.009, d * 0.72]],
    [-sx + 0.0005, -h / 2 + 0.2, 0, [0.004, 0.009, d * 0.72]],
    [w * 0.22, h / 2 - 0.0005, 0, [0.009, 0.004, d * 0.72]],
    [-w * 0.3, -h / 2 + 0.0005, 0, [0.009, 0.004, d * 0.72]],
  ];

  // ---------------- canto inferior: USB-C, altavoz y micrófono
  const by = -h / 2;
  const speakerHoles = Array.from({ length: isApple ? 6 : 8 }, (_, i) => 0.11 + i * 0.02);

  return (
    <group ref={ref} dispose={null}>
      {/* chasis con marco metálico */}
      <mesh geometry={geo.chassis} material={mats.frame} castShadow receiveShadow />
      {antennas.map(([x, y, z, size], i) => (
        <mesh key={i} material={mats.antenna} position={[x, y, z]}>
          <boxGeometry args={size} />
        </mesh>
      ))}

      {/* vidrio trasero */}
      <mesh geometry={geo.back} material={mats.back} position={[0, 0, -d / 2 + 0.0008]} receiveShadow />
      {camera}

      {/* frente: vidrio, pantalla, isla/perforación y auricular */}
      <mesh geometry={geo.front} material={mats.frontGlass} position={[0, 0, d / 2 - 0.0008]} />
      <mesh geometry={geo.screen} material={screenMat} position={[0, 0, front + 0.0004]} />
      <mesh geometry={geo.screen} material={mats.screenSheen} position={[0, 0, front + 0.0019]} renderOrder={2} />
      {isApple ? (
        <RoundedBox
          args={[0.155, 0.046, 0.0012]}
          radius={0.0005}
          smoothness={2}
          position={[0, h / 2 - edge - bezel - 0.045, front + 0.0012]}
          material={mats.hole}
        />
      ) : (
        <group position={[0, h / 2 - edge - bezel - 0.04, front + 0.001]}>
          <mesh material={mats.hole}>
            <circleGeometry args={[0.018, 32]} />
          </mesh>
          <mesh material={mats.coating} position={[0, 0, 0.0004]}>
            <circleGeometry args={[0.008, 24]} />
          </mesh>
        </group>
      )}
      <RoundedBox args={[0.12, 0.006, 0.002]} radius={0.0009} smoothness={2} position={[0, h / 2 - edge - 0.008, front]} material={mats.port} />

      {buttons}

      {/* USB-C */}
      <RoundedBox args={[0.072, 0.008, 0.024]} radius={0.0035} smoothness={3} position={[0, by + 0.0012, 0]} material={mats.port} />
      <mesh material={mats.hole} position={[0, by + 0.0016, 0]}>
        <boxGeometry args={[0.05, 0.004, 0.008]} />
      </mesh>
      {/* rejillas de altavoz y micrófono */}
      {speakerHoles.map((x) => (
        <mesh key={x} material={mats.hole} position={[x, by + 0.0013, 0]}>
          <cylinderGeometry args={[0.0055, 0.0055, 0.003, 12]} />
        </mesh>
      ))}
      {(isApple ? speakerHoles : [0.15, 0.172]).map((x) => (
        <mesh key={`m${x}`} material={mats.hole} position={[-x, by + 0.0013, 0]}>
          <cylinderGeometry args={[0.0055, 0.0055, 0.003, 12]} />
        </mesh>
      ))}
      {/* micrófono superior */}
      <mesh material={mats.hole} position={[-w * 0.18, h / 2 - 0.0006, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
      </mesh>
    </group>
  );
});
