"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Iluminación de estudio procedural (sin descargar HDRIs externos):
 * softboxes y tiras de luz que generan reflejos realistas en metal y vidrio.
 * Cada Lightformer apunta al origen, donde está el producto.
 */
export function StudioLights({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.3 * intensity} />
      <directionalLight position={[3, 5, 4]} intensity={1.4 * intensity} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9 * intensity} color="#8b5cf6" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#06070c"]} />
        {/* Softbox principal (arriba-izquierda, lado cámara) */}
        <Lightformer form="rect" intensity={3.2} position={[-4, 3.5, 5]} scale={[7, 4, 1]} />
        {/* Tira vertical lateral derecha */}
        <Lightformer form="rect" intensity={2.4} position={[5, 0.5, 3.5]} scale={[1.2, 9, 1]} />
        {/* Contraluz superior */}
        <Lightformer form="rect" intensity={3} position={[0, 7, -3]} scale={[10, 2, 1]} />
        {/* Tiras traseras para lecturas desde atrás */}
        <Lightformer form="rect" intensity={2.6} position={[-4, 2, -5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[5, 1, -4]} scale={[1.2, 8, 1]} />
        {/* Acentos de marca */}
        <Lightformer form="rect" intensity={2.4} color="#22d3ee" position={[-6, -1.5, 1]} scale={[0.6, 7, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#2f6bff" position={[6, -1.5, -1]} scale={[0.6, 7, 1]} />
        <Lightformer form="ring" intensity={2} color="#8b5cf6" position={[2, -3, 5]} scale={2.5} />
      </Environment>
    </>
  );
}
