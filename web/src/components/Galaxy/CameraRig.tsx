import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraRigProps {
  controls: React.RefObject<OrbitControlsImpl>;
  /** world position to fly the camera toward (the focused star), or null */
  flyTo: [number, number, number] | null;
  reducedMotion: boolean;
}

/**
 * Smoothly flies the camera + orbit target to a focused star, and resumes a
 * calm idle auto-rotate when nothing is focused and the user isn't interacting.
 */
export function CameraRig({ controls, flyTo, reducedMotion }: CameraRigProps) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const flying = useRef(false);

  useEffect(() => {
    if (!flyTo) {
      flying.current = false;
      return;
    }
    const look = new THREE.Vector3(...flyTo);
    targetLook.current.copy(look);
    // park the camera a comfortable distance out, along the current view dir
    const dir = new THREE.Vector3().subVectors(camera.position, look).normalize();
    if (dir.lengthSq() < 0.001) dir.set(0, 0.3, 1).normalize();
    targetPos.current.copy(look).add(dir.multiplyScalar(18));
    flying.current = true;
  }, [flyTo, camera]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    if (flying.current) {
      const k = reducedMotion ? 1 : 1 - Math.pow(0.0001, delta);
      camera.position.lerp(targetPos.current, k);
      c.target.lerp(targetLook.current, k);
      c.update();
      if (camera.position.distanceTo(targetPos.current) < 0.4) flying.current = false;
    }
  });

  return null;
}
