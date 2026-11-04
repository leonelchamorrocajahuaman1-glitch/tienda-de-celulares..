"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GLBPhone } from "@/components/three/GLBPhone";
import { PhoneModel } from "@/components/three/PhoneModel";
import { StudioLights } from "@/components/three/StudioLights";
import type { CameraPreset } from "@/lib/catalog-data";

export type ViewName = "front" | "back" | "side";

const DIST = 4.2;
const VIEW_POS: Record<ViewName, [number, number, number]> = {
  front: [0.9, 0.25, DIST],
  back: [-0.9, 0.25, -DIST],
  side: [DIST, 0.2, 0.5],
};

function CameraRig({
  view,
  viewNonce,
  zoomNonce,
  zoomDir,
  autoRotate,
  reduced,
}: {
  view: ViewName;
  viewNonce: number;
  zoomNonce: number;
  zoomDir: number;
  autoRotate: boolean;
  reduced: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    const [x, y, z] = VIEW_POS[view];
    const c = controls.current;
    gsap.to(camera.position, {
      x,
      y,
      z,
      duration: reduced ? 0 : 1.2,
      ease: "expo.inOut",
      onUpdate: () => c?.update(),
    });
    if (c) gsap.to(c.target, { x: 0, y: 0, z: 0, duration: reduced ? 0 : 1.2, ease: "expo.inOut" });
  }, [view, viewNonce, camera, reduced]);

  useEffect(() => {
    if (!zoomNonce) return;
    const c = controls.current;
    const dir = camera.position.clone();
    const len = Math.min(6.5, Math.max(2.2, dir.length() * (zoomDir > 0 ? 0.8 : 1.25)));
    dir.setLength(len);
    gsap.to(camera.position, { x: dir.x, y: dir.y, z: dir.z, duration: 0.6, ease: "power3.out", onUpdate: () => c?.update() });
  }, [zoomNonce, zoomDir, camera]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.2}
      maxDistance={6.5}
      autoRotate={autoRotate && !reduced}
      autoRotateSpeed={1.6}
      rotateSpeed={0.8}
    />
  );
}

export default function ProductViewer({
  color,
  preset,
  modelUrl,
  view,
  viewNonce,
  zoomNonce,
  zoomDir,
  autoRotate,
  reduced,
  onInteract,
}: {
  color: string;
  preset: CameraPreset;
  modelUrl?: string | null;
  view: ViewName;
  viewNonce: number;
  zoomNonce: number;
  zoomDir: number;
  autoRotate: boolean;
  reduced: boolean;
  onInteract?: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: VIEW_POS.front, fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      shadows
      onPointerDown={onInteract}
      aria-label="Visor 3D del producto: arrastra para girar, usa la rueda para acercar"
    >
      <StudioLights />
      <group position={[0, 0.05, 0]}>
        {modelUrl ? (
          <Suspense fallback={<PhoneModel color={color} preset={preset} />}>
            <GLBPhone url={modelUrl} color={color} />
          </Suspense>
        ) : (
          <PhoneModel color={color} preset={preset} />
        )}
      </group>
      <ContactShadows position={[0, -0.9, 0]} opacity={0.55} scale={4} blur={2.5} far={1.6} />
      <CameraRig view={view} viewNonce={viewNonce} zoomNonce={zoomNonce} zoomDir={zoomDir} autoRotate={autoRotate} reduced={reduced} />
    </Canvas>
  );
}
