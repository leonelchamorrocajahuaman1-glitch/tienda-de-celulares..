"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const TINTABLE = /(body|back|frame|housing|color|paint|case|chassis)/i;

/**
 * Modelo GLB/GLTF subido por el administrador.
 * Se centra y escala a la altura estándar del visor. Si los materiales
 * tienen nombres reconocibles (body, back, frame...), se tiñen con el color de la variante.
 */
export function GLBPhone({ url, color, height = 1.6 }: { url: string; color?: string; height?: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = height / Math.max(size.y, size.x, 1e-6);
    clone.position.sub(center.multiplyScalar(s));
    clone.scale.setScalar(s);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => m.clone());
        else if (mesh.material) mesh.material = mesh.material.clone();
      }
    });
    return clone;
  }, [scene, height]);

  useEffect(() => {
    if (!color) return;
    const c = new THREE.Color(color);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.color && (TINTABLE.test(std.name) || TINTABLE.test(mesh.name))) std.color.copy(c);
      });
    });
  }, [color, model]);

  return <primitive object={model} />;
}
