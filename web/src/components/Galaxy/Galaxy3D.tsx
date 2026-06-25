import { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, AdaptiveDpr } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Person, Union } from '@roots/shared';
import { galaxyLayout } from '../../layout/galaxyLayout';
import { Star3D } from './Star3D';
import { Threads3D } from './Threads3D';
import { CameraRig } from './CameraRig';

interface Galaxy3DProps {
  people: Person[];
  unions: Union[];
  focusedId: string | null;
  ignitingId: string | null;
  meId?: string | null;
  photoUrlFor?: (id: string) => string | undefined;
  onSelect: (id: string) => void;
}

/**
 * The floating-galaxy 3D constellation. Stars suspended in space, family
 * branches fanning into their own arms, calm idle auto-rotate, drag to orbit,
 * tap a star to fly to it. Drop-in replacement for the 2D <Sky>.
 */
export function Galaxy3D({
  people,
  unions,
  focusedId,
  ignitingId,
  meId = null,
  photoUrlFor,
  onSelect,
}: Galaxy3DProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const controls = useRef<OrbitControlsImpl>(null);

  const galaxy = useMemo(() => galaxyLayout(people, unions), [people, unions]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // immediate family of the focused star keeps its label
  const neighbors = useMemo(() => {
    const set = new Set<string>();
    if (!focusedId) return set;
    const f = peopleById.get(focusedId);
    if (f?.parentUnionId) {
      const pu = unions.find((u) => u.id === f.parentUnionId);
      for (const pid of [pu?.partnerAId, pu?.partnerBId]) if (pid) set.add(pid);
    }
    for (const u of unions) {
      const isA = u.partnerAId === focusedId;
      const isB = u.partnerBId === focusedId;
      if (isA && u.partnerBId) set.add(u.partnerBId);
      if (isB) set.add(u.partnerAId);
      if (isA || isB) for (const p of people) if (p.parentUnionId === u.id) set.add(p.id);
    }
    return set;
  }, [focusedId, peopleById, people, unions]);

  const flyTo = useMemo<[number, number, number] | null>(() => {
    if (!focusedId) return null;
    return galaxy.pos.get(focusedId) ?? null;
  }, [focusedId, galaxy]);

  const camDist = galaxy.radius * 1.9 + 18;
  // names are part of the life — show them on every portrait (distanceFactor
  // shrinks them with depth so the field stays readable).
  const labelsAll = true;

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, galaxy.radius * 0.5, camDist], fov: 55, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onSelect('')}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0B0A1F']} />
        <fog attach="fog" args={['#0B0A1F', camDist * 1.2, camDist * 3]} />
        <AdaptiveDpr pixelated />

        {/* deep starfield backdrop for parallax depth */}
        <Stars radius={300} depth={120} count={2400} factor={5} saturation={0} fade speed={reducedMotion ? 0 : 0.3} />

        <Threads3D threads={galaxy.threads} />

        {galaxy.nodes.map((n) => {
          const person = peopleById.get(n.personId);
          if (!person) return null;
          const showLabel =
            labelsAll ||
            person.claimed ||
            focusedId === n.personId ||
            meId === n.personId ||
            neighbors.has(n.personId);
          return (
            <Star3D
              key={n.personId}
              node={n}
              person={person}
              igniting={ignitingId === n.personId}
              focused={focusedId === n.personId}
              isMe={meId === n.personId}
              showLabel={showLabel}
              reducedMotion={reducedMotion}
              photoUrl={photoUrlFor?.(n.personId)}
              onSelect={onSelect}
            />
          );
        })}

        <OrbitControls
          ref={controls}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.8}
          minDistance={8}
          maxDistance={camDist * 2.4}
          autoRotate={!reducedMotion && !focusedId}
          autoRotateSpeed={0.35}
          makeDefault
        />
        <CameraRig controls={controls} flyTo={flyTo} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

void THREE;
