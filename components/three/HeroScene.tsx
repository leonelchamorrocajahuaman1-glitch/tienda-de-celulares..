"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type MutableRefObject, Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLBPhone } from "@/components/three/GLBPhone";
import { PhoneModel } from "@/components/three/PhoneModel";
import { StudioFloor } from "@/components/three/StudioFloor";
import { StudioLights } from "@/components/three/StudioLights";
import type { CameraPreset } from "@/lib/catalog-data";

export interface StageState {
  x: number;
  y: number;
  rotX: number;
  rotY: number;
  scale: number;
  glow: number;
}

function StagedPhone({
  stage,
  color,
  preset,
  modelUrl,
  reduced,
}: {
  stage: MutableRefObject<StageState>;
  color: string;
  preset: CameraPreset;
  modelUrl?: string | null;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const floor = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const s = stage.current;
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 5);
    // Flotación + parallax con el mouse
    const floatY = reduced ? 0 : Math.sin(t * 0.9) * 0.05;
    const px = reduced ? 0 : state.pointer.x * 0.18;
    const py = reduced ? 0 : state.pointer.y * 0.1;
    g.position.x = THREE.MathUtils.lerp(g.position.x, s.x, k);
    g.position.y = THREE.MathUtils.lerp(g.position.y, s.y + floatY, k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, s.rotY + px, k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, s.rotX - py, k);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, reduced ? 0 : Math.sin(t * 0.6) * 0.02, k);
    const sc = THREE.MathUtils.lerp(g.scale.x, s.scale, k);
    g.scale.setScalar(sc);
    if (floor.current) floor.current.position.set(g.position.x, g.position.y - 0.98 * sc, 0);
    if (ring.current) {
      ring.current.position.x = g.position.x;
      ring.current.position.y = g.position.y - 0.97 * sc;
      ring.current.scale.setScalar(sc);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * s.glow + Math.sin(t * 1.4) * 0.05;
    }
  });
  return (
    <>
      <group ref={group}>
        {modelUrl ? (
          <Suspense fallback={<PhoneModel color={color} preset={preset} />}>
            <GLBPhone url={modelUrl} color={color} />
          </Suspense>
        ) : (
          <PhoneModel color={color} preset={preset} />
        )}
      </group>
      {/* Plataforma luminosa del escenario */}
      <mesh ref={ring} position={[0, -0.97, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.385, 96]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <group ref={floor}>
        <ContactShadows opacity={0.6} scale={5} blur={2.8} far={2} resolution={512} />
      </group>
    </>
  );
}

export default function HeroScene({
  stage,
  color,
  preset,
  modelUrl,
  reduced,
}: {
  stage: MutableRefObject<StageState>;
  color: string;
  preset: CameraPreset;
  modelUrl?: string | null;
  reduced: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [floor, setFloor] = useState(false);
  useEffect(() => setFloor(window.matchMedia("(min-width: 1024px)").matches && !reduced), [reduced]);

  // Pausar el render cuando la escena no está en pantalla (rendimiento/batería)
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        shadows
        aria-label="Smartphone 3D interactivo"
      >
        <StudioLights />
        {floor && <StudioFloor y={-0.99} size={9} />}
        <StagedPhone stage={stage} color={color} preset={preset} modelUrl={modelUrl} reduced={reduced} />
      </Canvas>
    </div>
  );
}
