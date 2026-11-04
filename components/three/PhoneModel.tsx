"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CameraPreset } from "@/lib/catalog-data";

/**
 * Smartphone 3D construido con geometría real (no imágenes):
 * marco metálico, vidrio trasero, pantalla OLED emisiva, botones y
 * módulos de cámara con lentes de cristal con recubrimiento iridiscente.
 * Dimensiones aproximadas en proporción 19.5:9.
 */
export const PHONE = { w: 0.76, h: 1.6, d: 0.085, r: 0.11 };

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Geometría plana redondeada con UV normalizados 0–1 (para texturas de pantalla). */
function roundedPlane(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 12);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function roundedSlab(w: number, h: number, r: number, depth: number, bevel = 0.002) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Fondo de pantalla dibujado en canvas: aurora en azul eléctrico / cian / violeta. */
function createScreenTexture(accent: string, notch: "island" | "punch") {
  if (typeof document === "undefined") return null;
  const W = 540;
  const H = 1140;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#03040a";
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, number, string][] = [
    [W * 0.2, H * 0.72, 420, "rgba(47,107,255,0.85)"],
    [W * 0.85, H * 0.55, 380, "rgba(139,92,246,0.75)"],
    [W * 0.55, H * 0.95, 360, "rgba(34,211,238,0.7)"],
    [W * 0.5, H * 0.35, 260, accent],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Velo superior para legibilidad
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  veil.addColorStop(0, "rgba(3,4,10,0.85)");
  veil.addColorStop(1, "rgba(3,4,10,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText("Martes 4 de noviembre", W / 2, 205);
  ctx.font = "200 168px system-ui, sans-serif";
  ctx.fillText("9:41", W / 2, 360);
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("N E X P H O N E", W / 2, H - 70);
  // barra inferior
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 80, H - 30, 160, 7, 4);
  ctx.fill();
  // notch
  ctx.fillStyle = "#000";
  ctx.beginPath();
  if (notch === "island") ctx.roundRect(W / 2 - 78, 26, 156, 46, 23);
  else ctx.arc(W / 2, 46, 18, 0, Math.PI * 2);
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

interface LensProps {
  position: [number, number, number];
  radius: number;
  ringMat: THREE.Material;
  glassMat: THREE.Material;
  coatingMat: THREE.Material;
}
function Lens({ position, radius, ringMat, glassMat, coatingMat }: LensProps) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={ringMat} castShadow>
        <cylinderGeometry args={[radius, radius * 1.02, 0.022, 48]} />
      </mesh>
      <mesh material={glassMat} position={[0, -0.0115, 0]}>
        <cylinderGeometry args={[radius * 0.84, radius * 0.84, 0.002, 48]} />
      </mesh>
      <mesh material={coatingMat} position={[0, -0.0125, 0]}>
        <cylinderGeometry args={[radius * 0.42, radius * 0.42, 0.001, 32]} />
      </mesh>
    </group>
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
  const { w, h, d, r } = PHONE;
  const { target, current } = useLerpedColor(color, instantColor);

  const mats = useMemo(() => {
    const frame = new THREE.MeshPhysicalMaterial({
      color: current.current.clone(),
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.8,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const back = new THREE.MeshPhysicalMaterial({
      color: current.current.clone(),
      metalness: 0.35,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffffff"),
    });
    const frontGlass = new THREE.MeshPhysicalMaterial({
      color: "#020306",
      metalness: 0.1,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      reflectivity: 0.9,
    });
    const ring = new THREE.MeshPhysicalMaterial({ color: "#c8ccd4", metalness: 1, roughness: 0.18 });
    const darkRing = new THREE.MeshPhysicalMaterial({ color: "#16181d", metalness: 0.9, roughness: 0.3 });
    const lensGlass = new THREE.MeshPhysicalMaterial({
      color: "#05070d",
      metalness: 0.3,
      roughness: 0.02,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 520],
    });
    const coating = new THREE.MeshPhysicalMaterial({
      color: "#1a2a6a",
      metalness: 0.6,
      roughness: 0.1,
      emissive: "#0b1a4a",
      emissiveIntensity: 0.4,
      iridescence: 1,
    });
    const flash = new THREE.MeshPhysicalMaterial({ color: "#f3e7c9", roughness: 0.4, transmission: 0.2 });
    const bump = new THREE.MeshPhysicalMaterial({
      color: current.current.clone(),
      metalness: 0.3,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });
    return { frame, back, frontGlass, ring, darkRing, lensGlass, coating, flash, bump };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenTex = useMemo(
    () => createScreenTexture("rgba(34,211,238,0.35)", preset === "square" ? "island" : "punch"),
    [preset],
  );
  const screenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: screenTex,
        toneMapped: false,
        color: screenOn ? "#ffffff" : "#050505",
      }),
    [screenTex, screenOn],
  );

  const geo = useMemo(
    () => ({
      back: roundedSlab(w - 0.018, h - 0.018, r - 0.01, 0.006),
      front: roundedSlab(w - 0.01, h - 0.01, r - 0.006, 0.004),
      screen: roundedPlane(w - 0.05, h - 0.05, r - 0.03),
      squareBump: roundedSlab(0.36, 0.38, 0.085, 0.016, 0.004),
      barBump: roundedSlab(w - 0.04, 0.17, 0.085, 0.02, 0.005),
    }),
    [w, h, r],
  );

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      screenTex?.dispose();
      screenMat.dispose();
    },
    [geo, mats, screenTex, screenMat],
  );

  // Transición suave del color de la variante
  const frameTint = useMemo(() => new THREE.Color(), []);
  const grey = useMemo(() => new THREE.Color("#9aa0a8"), []);
  useFrame((_, dt) => {
    if (instantColor) current.current.copy(target);
    else current.current.lerp(target, Math.min(1, dt * 6));
    mats.back.color.copy(current.current);
    mats.bump.color.copy(current.current).multiplyScalar(0.92);
    frameTint.copy(current.current).lerp(grey, 0.35);
    mats.frame.color.copy(frameTint);
  });

  const backZ = -d / 2 - 0.001;
  const camZ = backZ - 0.012;

  const cameras = (() => {
    const lp = { ringMat: mats.ring, glassMat: mats.lensGlass, coatingMat: mats.coating };
    switch (preset) {
      case "square": {
        const cx = w / 2 - 0.215;
        const cy = h / 2 - 0.225;
        return (
          <group>
            <mesh geometry={geo.squareBump} material={mats.bump} position={[cx, cy, backZ - 0.008]} castShadow />
            <Lens {...lp} position={[cx + 0.075, cy + 0.085, camZ - 0.006]} radius={0.068} />
            <Lens {...lp} position={[cx + 0.075, cy - 0.085, camZ - 0.006]} radius={0.068} />
            <Lens {...lp} position={[cx - 0.08, cy, camZ - 0.006]} radius={0.068} />
            <mesh material={mats.flash} position={[cx - 0.095, cy + 0.12, camZ - 0.001]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.004, 24]} />
            </mesh>
            <mesh material={mats.darkRing} position={[cx - 0.095, cy - 0.12, camZ - 0.001]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.004, 24]} />
            </mesh>
          </group>
        );
      }
      case "vertical": {
        const cx = w / 2 - 0.12;
        const top = h / 2 - 0.13;
        return (
          <group>
            {[0, 1, 2].map((i) => (
              <Lens key={i} {...lp} ringMat={mats.darkRing} position={[cx, top - i * 0.135, camZ + 0.004]} radius={0.052} />
            ))}
            <mesh material={mats.flash} position={[cx - 0.1, top - 0.02, backZ - 0.002]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.004, 24]} />
            </mesh>
          </group>
        );
      }
      case "circle": {
        const cy = h / 2 - 0.3;
        return (
          <group>
            <mesh material={mats.ring} position={[0, cy, backZ - 0.011]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.235, 0.24, 0.026, 96]} />
            </mesh>
            <mesh material={mats.bump} position={[0, cy, backZ - 0.0245]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.215, 0.215, 0.002, 96]} />
            </mesh>
            {[
              [-0.085, 0.085],
              [0.085, 0.085],
              [-0.085, -0.085],
              [0.085, -0.085],
            ].map(([x, y], i) => (
              <Lens key={i} {...lp} ringMat={mats.darkRing} position={[x, cy + y, backZ - 0.03]} radius={0.06} />
            ))}
          </group>
        );
      }
      case "bar":
      default: {
        const cy = h / 2 - 0.25;
        return (
          <group>
            <mesh geometry={geo.barBump} material={mats.frame} position={[0, cy, backZ - 0.01]} castShadow />
            <mesh position={[0.02, cy, backZ - 0.0215]}>
              <boxGeometry args={[0.42, 0.11, 0.001]} />
              <meshPhysicalMaterial color="#050608" roughness={0.05} metalness={0.4} clearcoat={1} />
            </mesh>
            {[-0.1, 0.02, 0.14].map((x, i) => (
              <Lens key={i} {...lp} ringMat={mats.darkRing} position={[x, cy, backZ - 0.03]} radius={0.04} />
            ))}
            <mesh material={mats.flash} position={[-0.2, cy, backZ - 0.024]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.004, 24]} />
            </mesh>
          </group>
        );
      }
    }
  })();

  return (
    <group ref={ref} dispose={null}>
      {/* Marco metálico */}
      <RoundedBox args={[w, h, d]} radius={Math.min(r, d / 2 - 0.001)} smoothness={6} material={mats.frame} castShadow receiveShadow>
        {null}
      </RoundedBox>
      {/* Vidrio trasero con color de la variante */}
      <mesh geometry={geo.back} material={mats.back} position={[0, 0, -d / 2 + 0.002]} />
      {/* Vidrio frontal + pantalla */}
      <mesh geometry={geo.front} material={mats.frontGlass} position={[0, 0, d / 2 - 0.001]} />
      <mesh geometry={geo.screen} material={screenMat} position={[0, 0, d / 2 + 0.0036]} />
      {/* Botones laterales */}
      <RoundedBox args={[0.012, 0.2, 0.03]} radius={0.005} position={[w / 2 + 0.003, 0.28, 0]} material={mats.frame} />
      <RoundedBox args={[0.012, 0.13, 0.03]} radius={0.005} position={[-w / 2 - 0.003, 0.36, 0]} material={mats.frame} />
      <RoundedBox args={[0.012, 0.13, 0.03]} radius={0.005} position={[-w / 2 - 0.003, 0.2, 0]} material={mats.frame} />
      {cameras}
    </group>
  );
});
