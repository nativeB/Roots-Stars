import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Person } from '@roots/shared';
import type { Galaxy3DNode } from '../../layout/galaxyLayout';

const GOLD = new THREE.Color('#FFD08A');
const VIOLET = new THREE.Color('#B58CFF');
const GOLD_HALO = '#FFD08A';
const VIOLET_HALO = '#B58CFF';

interface Star3DProps {
  node: Galaxy3DNode;
  person: Person;
  igniting: boolean;
  focused: boolean;
  isMe: boolean;
  showLabel: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

/** One person as a glowing point of light in 3D space. */
export function Star3D({
  node,
  person,
  igniting,
  focused,
  isMe,
  showLabel,
  reducedMotion,
  onSelect,
}: Star3DProps) {
  const claimed = person.claimed || igniting;
  const color = claimed ? GOLD : VIOLET;
  const halo = claimed ? GOLD_HALO : VIOLET_HALO;
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const baseCore = claimed ? 0.62 : 0.46;
  const seed = (node.x * 12.9898 + node.y * 78.233 + node.z * 37.719) % 6.283;

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    // gentle twinkle
    const tw = 0.85 + Math.sin(t * 1.3 + seed) * 0.15;
    const igniteBoost = igniting ? 1 + Math.max(0, 1 - (t % 2)) * 1.8 : 1;
    if (coreRef.current) coreRef.current.scale.setScalar(baseCore * tw * igniteBoost);
    if (haloRef.current) {
      const h = (claimed ? 3.0 : 2.2) * tw * igniteBoost;
      haloRef.current.scale.setScalar(h);
    }
  });

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* wide outer glow */}
      <sprite ref={haloRef} scale={claimed ? 4.4 : 3.2}>
        <spriteMaterial
          map={glowTexture()}
          color={halo}
          transparent
          opacity={claimed ? 0.75 : 0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* tight inner glow for a bright hot center */}
      <sprite scale={claimed ? 1.7 : 1.3}>
        <spriteMaterial
          map={glowTexture()}
          color={'#FFFFFF'}
          transparent
          opacity={claimed ? 0.9 : 0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* generous invisible hit sphere so stars are easy to tap */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(person.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* bright visible core */}
      <mesh ref={coreRef} scale={baseCore}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* "you are here" + focus ring */}
      {(isMe || focused) && (
        <Billboard>
          <mesh>
            <ringGeometry args={[1.0, 1.12, 32]} />
            <meshBasicMaterial color={GOLD_HALO} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </Billboard>
      )}

      {/* label — only when relevant */}
      {showLabel && (
        <Html
          center
          distanceFactor={26}
          position={[0, claimed ? 1.5 : 1.2, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          zIndexRange={[10, 0]}
        >
          <div
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 15,
              fontWeight: 500,
              color: claimed ? '#FBF7FF' : '#C9C2EC',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 6px rgba(0,0,0,0.9)',
              opacity: isMe ? 1 : 0.95,
            }}
          >
            {person.signatureEmoji ? `${person.signatureEmoji} ` : ''}
            {person.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// a cached radial-gradient glow sprite texture
let _glow: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (_glow) return _glow;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}
