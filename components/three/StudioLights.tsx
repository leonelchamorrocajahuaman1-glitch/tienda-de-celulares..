"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

let rectLibReady = false;

/** Softbox real (luz de área): dibuja degradados suaves sobre vidrio y metal, como en una foto de producto. */
function Softbox({ position, size, intensity, color = "#ffffff" }: { position: [number, number, number]; size: [number, number]; intensity: number; color?: string }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  if (!rectLibReady && typeof window !== "undefined") {
    RectAreaLightUniformsLib.init();
    rectLibReady = true;
  }
  useEffect(() => ref.current?.lookAt(0, 0, 0), [position]);
  return <rectAreaLight ref={ref} args={[color, intensity, size[0], size[1]]} position={position} />;
}

/**
 * Iluminación de estudio fotográfico procedural (sin HDRIs externos), pensada como una sesión de producto:
 *  - softbox principal cenital (luz suave desde arriba, con caída gradual),
 *  - dos tiras verticales laterales que dibujan los cantos metálicos,
 *  - contraluz trasero para separar el objeto del fondo,
 *  - relleno inferior muy tenue y acentos de color de marca discretos.
 * Cada Lightformer apunta al origen, donde está el producto.
 */
export function StudioLights({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <ambientLight intensity={0.06 * intensity} />
      {/* Softboxes de área: barrido de luz superior (lado cámara) y lateral, para ambas caras del teléfono */}
      <Softbox position={[0.8, 2.6, 3.4]} size={[3.2, 1.4]} intensity={5 * intensity} />
      <Softbox position={[-0.8, 2.6, -3.4]} size={[3.2, 1.4]} intensity={5 * intensity} />
      <Softbox position={[-3.2, 0.6, 1.2]} size={[0.6, 3.5]} intensity={3 * intensity} />
      <directionalLight position={[1.5, 6, 4]} intensity={1.5 * intensity} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-4, 2, -4]} intensity={0.25 * intensity} color="#a78bfa" />
      <Environment resolution={512} frames={1}>
        <color attach="background" args={["#040509"]} />
        {/* Softbox cenital principal */}
        <Lightformer form="rect" intensity={2.6} position={[0, 6, 1.5]} scale={[7, 7, 1]} />
        {/* Banda alta del lado de cámara: barrido de luz degradado sobre el vidrio (efecto foto de estudio) */}
        <Lightformer form="rect" intensity={2} position={[1.2, 3.2, 6]} scale={[5, 2.2, 1]} />
        {/* Softbox frontal-izquierdo (modela volúmenes de la cara frontal) */}
        <Lightformer form="rect" intensity={1.2} position={[-4.5, 3.5, 4.5]} scale={[4, 4, 1]} />
        {/* Tiras laterales: líneas de luz sobre el marco */}
        <Lightformer form="rect" intensity={3.2} position={[-5, 0.5, 1]} scale={[0.8, 9, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[5, 0.5, 1]} scale={[0.8, 9, 1]} />
        {/* Softbox trasero grande: degradado suave sobre el vidrio posterior */}
        <Lightformer form="rect" intensity={2.2} position={[-2.5, 4, -6]} scale={[9, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[4, 0, -5]} scale={[1, 8, 1]} />
        {/* Relleno inferior tenue */}
        <Lightformer form="rect" intensity={0.2} position={[0, -6, 2]} scale={[8, 3, 1]} />
        {/* Acentos de marca, muy sutiles */}
        <Lightformer form="rect" intensity={0.7} color="#22d3ee" position={[-6, -1.5, -2]} scale={[0.5, 6, 1]} />
        <Lightformer form="ring" intensity={0.4} color="#8b5cf6" position={[3, -3, 5]} scale={2} />
      </Environment>
    </>
  );
}
