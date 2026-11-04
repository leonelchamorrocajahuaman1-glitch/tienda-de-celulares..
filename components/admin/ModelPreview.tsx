"use client";

import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { StudioLights } from "@/components/three/StudioLights";

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error)
      return <p className="grid h-full place-items-center p-6 text-center text-sm text-rose-300">No se pudo cargar el modelo: {this.state.error}</p>;
    return this.props.children;
  }
}

function Model({ url, urlMap, color }: { url: string; urlMap?: Record<string, string>; color: string }) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    if (urlMap) {
      // Resuelve los archivos del conjunto GLTF (.bin, texturas) a sus URLs locales de vista previa
      loader.manager = new THREE.LoadingManager();
      loader.manager.setURLModifier((u) => {
        const name = decodeURIComponent(u.split("/").pop() ?? "");
        return urlMap[name] ?? u;
      });
    }
  });
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 1.6 / Math.max(size.x, size.y, size.z, 1e-6);
    c.scale.setScalar(s);
    c.position.sub(center.multiplyScalar(s));
    return c;
  }, [scene]);
  useEffect(() => {
    const col = new THREE.Color(color);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.color && /(body|back|frame|housing|color|paint|case|chassis)/i.test(`${std.name} ${m.name}`)) std.color.copy(col);
      });
    });
  }, [obj, color]);
  return <primitive object={obj} />;
}

export default function ModelPreview({ url, urlMap, color }: { url: string; urlMap?: Record<string, string>; color: string }) {
  return (
    <Boundary resetKey={url}>
      <Canvas camera={{ position: [0, 0.3, 4], fov: 32 }} shadows dpr={[1, 2]}>
        <StudioLights />
        <Suspense fallback={null}>
          <Model url={url} urlMap={urlMap} color={color} />
        </Suspense>
        <ContactShadows position={[0, -0.95, 0]} opacity={0.5} scale={4} blur={2.5} />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={8} autoRotate autoRotateSpeed={1.2} />
      </Canvas>
    </Boundary>
  );
}
