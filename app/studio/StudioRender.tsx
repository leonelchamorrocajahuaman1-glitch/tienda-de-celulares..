"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLBPhone } from "@/components/three/GLBPhone";
import { PhoneModel } from "@/components/three/PhoneModel";
import { StudioFloor } from "@/components/three/StudioFloor";
import { StudioLights } from "@/components/three/StudioLights";
import type { CameraPreset } from "@/lib/catalog-data";

const ROT: Record<string, [number, number, number]> = {
  front: [0.02, -0.38, 0.02],
  back: [0.02, Math.PI + 0.42, -0.02],
  side: [0.05, Math.PI / 2 - 0.28, 0],
};

interface Shot {
  preset: CameraPreset;
  view: string;
  color: string;
  id: number;
}
type StudioWindow = Window & { __renderReady?: number; __setShot?: (s: Omit<Shot, "id">) => void; __exportGLB?: () => Promise<string> };

function ReadySignal({ id }: { id: number }) {
  const frames = useRef(0);
  useEffect(() => {
    frames.current = 0;
  }, [id]);
  useFrame(() => {
    frames.current++;
    if (frames.current === 12) (window as StudioWindow).__renderReady = id;
  });
  return null;
}

export function StudioRender({ preset, view, color, glb, floor }: { preset: CameraPreset; view: string; color: string; glb?: string; floor?: boolean }) {
  const [shot, setShot] = useState<Shot>({ preset, view, color, id: 1 });
  const phone = useRef<THREE.Group>(null);
  useEffect(() => {
    (window as StudioWindow).__setShot = (s) => setShot((prev) => ({ ...s, id: prev.id + 1 }));
    // Exporta el modelo procedural a GLB binario estándar (prueba de compatibilidad / modelo de referencia)
    (window as StudioWindow).__exportGLB = () =>
      new Promise((resolve, reject) => {
        if (!phone.current) return reject(new Error("sin modelo"));
        new GLTFExporter().parse(
          phone.current,
          (res) => {
            const bytes = new Uint8Array(res as ArrayBuffer);
            let bin = "";
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            resolve(btoa(bin));
          },
          reject,
          { binary: true },
        );
      });
  }, []);
  return (
    <div style={{ width: 900, height: 1100, background: "transparent" }} id="studio">
      <Canvas
        dpr={1.5}
        camera={{ position: [0, 0, 4.1], fov: 30 }}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        shadows
        style={{ background: "transparent" }}
      >
        <StudioLights />
        <group rotation={ROT[shot.view]} position={[0, 0.08, 0]}>
          {glb ? (
            <Suspense fallback={null}>
              <GLBPhone url={glb} color={shot.color} />
            </Suspense>
          ) : (
            <PhoneModel ref={phone} key={shot.preset} color={shot.color} preset={shot.preset} instantColor />
          )}
        </group>
        {floor && <StudioFloor y={-0.75} />}
        <ContactShadows position={[0, -0.92, 0]} opacity={0.55} scale={4} blur={2.6} far={1.5} frames={Infinity} />
        <ReadySignal id={shot.id} />
      </Canvas>
    </div>
  );
}
