import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Person } from '@roots/shared';
import type { Galaxy3DNode } from '../../layout/galaxyLayout';
import { useAvatarTexture } from './Avatar3D';

const GOLD = '#FFD08A';
const VIOLET = '#B58CFF';

interface Star3DProps {
  node: Galaxy3DNode;
  person: Person;
  igniting: boolean;
  focused: boolean;
  isMe: boolean;
  showLabel: boolean;
  reducedMotion: boolean;
  photoUrl?: string;
  onSelect: (id: string) => void;
}

/**
 * One person as a luminous photo portrait floating in space: a circular face
 * (their photo, or a warm generated avatar) ringed in gold/violet glow, with
 * their name beneath. Faces the camera. This is where the "life" lives.
 */
export function Star3D({
  node,
  person,
  igniting,
  focused,
  isMe,
  showLabel,
  reducedMotion,
  photoUrl,
  onSelect,
}: Star3DProps) {
  const claimed = person.claimed || igniting;
  const ringColor = claimed ? GOLD : VIOLET;
  const groupRef = useRef<THREE.Group>(null);
  const avatar = useAvatarTexture(person.name, person.signatureEmoji ?? null, claimed, photoUrl);

  // portrait size: claimed people a touch larger; deceased elders slightly grand
  const R = (claimed ? 2.0 : 1.7) * (person.isDeceased ? 1.12 : 1);
  const seed = (node.x * 12.9 + node.y * 78.2 + node.z * 37.7) % 6.28;

  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const tw = 1 + Math.sin(t * 1.1 + seed) * 0.03; // very gentle breathe
    const ignite = igniting ? 1 + Math.max(0, 1 - (t % 2)) * 0.6 : 1;
    groupRef.current.scale.setScalar(tw * ignite);
  });

  return (
    <Billboard ref={groupRef} position={[node.x, node.y, node.z]}>
      {/* outer soft glow halo */}
      <sprite scale={R * 3.4}>
        <spriteMaterial
          map={glowTexture()}
          color={ringColor}
          transparent
          opacity={claimed ? 0.55 : 0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* glowing ring around the portrait */}
      <mesh>
        <ringGeometry args={[R * 1.02, R * 1.16, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.95} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* "you are here" / focus accent ring */}
      {(isMe || focused) && (
        <mesh>
          <ringGeometry args={[R * 1.22, R * 1.4, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}

      {/* the portrait disc — the clickable target */}
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
        <circleGeometry args={[R, 48]} />
        <meshBasicMaterial
          map={avatar}
          toneMapped={false}
          transparent
          opacity={claimed ? 1 : 0.92}
        />
      </mesh>

      {/* name label under the portrait */}
      {showLabel && (
        <Html
          center
          distanceFactor={30}
          position={[0, -R - 0.9, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          zIndexRange={[8, 0]}
        >
          <div
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 15,
              fontWeight: 600,
              color: claimed ? '#FBF7FF' : '#D9D3F2',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)',
            }}
          >
            {person.name}
          </div>
        </Html>
      )}
    </Billboard>
  );
}

// cached radial-gradient glow sprite
let _glow: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (_glow) return _glow;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}
