"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { PhoneModel } from "@/components/three/PhoneModel";
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
type StudioWindow = Window & { __renderReady?: number; __setShot?: (s: Omit<Shot, "id">) => void };

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

export function StudioRender({ preset, view, color }: { preset: CameraPreset; view: string; color: string }) {
  const [shot, setShot] = useState<Shot>({ preset, view, color, id: 1 });
  useEffect(() => {
    (window as StudioWindow).__setShot = (s) => setShot((prev) => ({ ...s, id: prev.id + 1 }));
  }, []);
  return (
    <div style={{ width: 900, height: 1100, background: "transparent" }} id="studio">
      <Canvas
        dpr={1}
        camera={{ position: [0, 0, 4.1], fov: 30 }}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        shadows
        style={{ background: "transparent" }}
      >
        <StudioLights />
        <group rotation={ROT[shot.view]} position={[0, 0.08, 0]}>
          <PhoneModel key={shot.preset} color={shot.color} preset={shot.preset} instantColor />
        </group>
        <ContactShadows position={[0, -0.92, 0]} opacity={0.55} scale={4} blur={2.6} far={1.5} frames={Infinity} />
        <ReadySignal id={shot.id} />
      </Canvas>
    </div>
  );
}
