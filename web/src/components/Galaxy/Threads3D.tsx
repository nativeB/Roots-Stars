import { useMemo } from 'react';
import * as THREE from 'three';
import type { Galaxy3DThread } from '../../layout/galaxyLayout';

/**
 * All connection threads as a single additive line segment buffer — cheap to
 * render even at hundreds of edges. Teal→violet vertex colors for the gradient.
 */
export function Threads3D({ threads }: { threads: Galaxy3DThread[] }) {
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(threads.length * 6);
    const col = new Float32Array(threads.length * 6);
    const teal = new THREE.Color('#6FE3C4');
    const violet = new THREE.Color('#B58CFF');
    threads.forEach((t, i) => {
      pos.set([t.a[0], t.a[1], t.a[2], t.b[0], t.b[1], t.b[2]], i * 6);
      col.set([teal.r, teal.g, teal.b, violet.r, violet.g, violet.b], i * 6);
    });
    return { positions: pos, colors: col };
  }, [threads]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}
