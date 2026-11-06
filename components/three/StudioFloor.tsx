"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Piso de estudio con reflejo difuso (como la superficie brillante de una sesión de producto).
 * Los bordes se desvanecen con un mapa alfa radial para fundirse con el fondo de la página.
 */
export function StudioFloor({ y = -0.95, size = 7 }: { y?: number; size?: number }) {
  const alpha = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, "#b0b0b0");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <MeshReflectorMaterial
        blur={[160, 40]}
        resolution={512}
        mixBlur={1}
        mixStrength={5}
        mixContrast={1}
        roughness={1}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#010102"
        metalness={0}
        mirror={0.7}
        envMapIntensity={0}
        transparent
        alphaMap={alpha ?? undefined}
      />
    </mesh>
  );
}
