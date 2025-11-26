import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, PointerLockControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import { GameEntity, DefectType, GameStatus } from '../types';

// Fix for TypeScript errors regarding JSX Intrinsic Elements
// This augments the global JSX namespace to include Three.js elements used by @react-three/fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      icosahedronGeometry: any;
      meshBasicMaterial: any;
      boxGeometry: any;
      ambientLight: any;
      pointLight: any;
      fog: any;
    }
  }
}

interface GameSceneProps {
  status: GameStatus;
  currentScore: number;
  defectsLibrary: DefectType[];
  onScore: (amount: number, defectId: string) => void;
  onHit: () => void;
}

// --- Constants ---
const LATTICE_SIZE = 10;
const LATTICE_SPACING = 15;
const BULLET_SPEED = 80;
const MOVEMENT_SPEED = 25;
const PLAYER_COLLISION_RADIUS = 2;
// Increased barrier to prevent spawning outside or clipping immediately
const BARRIER_LIMIT = (LATTICE_SIZE * LATTICE_SPACING) / 2 + 25; 

// --- Assets ---
const atomGeometry = new THREE.SphereGeometry(2, 16, 16);
const siMaterial = new THREE.MeshStandardMaterial({ 
  color: '#4a7ac0', 
  roughness: 0.4, 
  metalness: 0.2, 
  emissive: '#1a3a60', 
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide 
});
const bulletGeometry = new THREE.SphereGeometry(0.3, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#00ffff' });

// --- Sub-Components ---

const StaticLattice = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = LATTICE_SIZE * LATTICE_SIZE * LATTICE_SIZE;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    
    let i = 0;
    const offset = (LATTICE_SIZE * LATTICE_SPACING) / 2;
    
    for (let x = 0; x < LATTICE_SIZE; x++) {
      for (let y = 0; y < LATTICE_SIZE; y++) {
        for (let z = 0; z < LATTICE_SIZE; z++) {
          dummy.position.set(
            x * LATTICE_SPACING - offset,
            y * LATTICE_SPACING - offset,
            z * LATTICE_SPACING - offset
          );
          
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i++, dummy.matrix);
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh ref={meshRef} args={[atomGeometry, siMaterial, count]} frustumCulled={false} />
  );
};

const Enemy: React.FC<{ data: GameEntity, defectsLibrary: DefectType[] }> = ({ data, defectsLibrary }) => {
  const defectInfo = defectsLibrary.find(d => d.id === data.defectId);
  const color = defectInfo?.color || '#ff0000';
  
  return (
    <group position={new THREE.Vector3(...data.position)}>
      <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
        <mesh geometry={atomGeometry}>
          <meshStandardMaterial 
            color={color} 
            emissive={color}
            emissiveIntensity={1}
            roughness={0.1}
          />
        </mesh>
        <mesh>
           <icosahedronGeometry args={[2.5, 0]} />
           <meshBasicMaterial color={color} wireframe transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </Float>
    </group>
  );
};

const Bullet: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <mesh position={new THREE.Vector3(...position)} geometry={bulletGeometry} material={bulletMaterial} />
  );
};

const Particles = ({ particles }: { particles: GameEntity[] }) => {
  return (
    <>
      {particles.map(p => (
        <mesh key={p.id} position={new THREE.Vector3(...p.position)}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.life} />
        </mesh>
      ))}
    </>
  );
};

// --- Player Controller ---

const PlayerController = ({ 
  status, 
  currentScore,
  onShoot,
  onMove 
}: { 
  status: GameStatus, 
  currentScore: number,
  onShoot: (pos: THREE.Vector3, dir: THREE.Vector3) => void,
  onMove: (pos: THREE.Vector3) => void 
}) => {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const hasResetRef = useRef(false);

  // Respawn / Reset Logic
  // We use a ref to ensure this only happens ONCE per game start/restart
  // This prevents the camera from getting locked if components re-render
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      if (currentScore === 0 && !hasResetRef.current) {
        camera.position.set(0, 0, 80);
        camera.lookAt(0, 0, 0);
        hasResetRef.current = true;
      }
    } else {
      // Reset the flag if we leave playing state (e.g. Game Over)
      hasResetRef.current = false;
    }
  }, [status, currentScore, camera]);
  
  // Handle Pointer Lock Re-engagement
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
        const timer = setTimeout(() => {
            if (controlsRef.current) {
                controlsRef.current.lock();
            }
        }, 50);
        return () => clearTimeout(timer);
    } else {
        if (controlsRef.current) {
            controlsRef.current.unlock();
        }
    }
  }, [status]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => keys.current[e.code] = true;
    const handleUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    const handleMouse = (e: MouseEvent) => {
        if(status === GameStatus.PLAYING && document.pointerLockElement) {
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            onShoot(camera.position.clone(), dir);
        }
    }
    
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('mousedown', handleMouse);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('mousedown', handleMouse);
    };
  }, [status, camera, onShoot]);

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const speed = MOVEMENT_SPEED * delta;
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    if (keys.current['KeyW']) direction.add(forward);
    if (keys.current['KeyS']) direction.sub(forward);
    if (keys.current['KeyA']) direction.sub(right);
    if (keys.current['KeyD']) direction.add(right);
    if (keys.current['Space']) direction.y += 1;
    if (keys.current['ShiftLeft']) direction.y -= 1;

    direction.normalize().multiplyScalar(speed);
    
    const newPos = camera.position.clone().add(direction);
    newPos.x = THREE.MathUtils.clamp(newPos.x, -BARRIER_LIMIT, BARRIER_LIMIT);
    newPos.y = THREE.MathUtils.clamp(newPos.y, -BARRIER_LIMIT, BARRIER_LIMIT);
    newPos.z = THREE.MathUtils.clamp(newPos.z, -BARRIER_LIMIT, BARRIER_LIMIT);

    camera.position.copy(newPos);
    onMove(camera.position.clone());
  });

  return (
    <PointerLockControls 
      ref={controlsRef}
      selector="#root" 
      enabled={status === GameStatus.PLAYING} 
    />
  );
};

// --- Main Scene ---

const GameContent = ({ status, currentScore, defectsLibrary, onScore, onHit }: GameSceneProps) => {
  const [bullets, setBullets] = useState<GameEntity[]>([]);
  const [enemies, setEnemies] = useState<GameEntity[]>([]);
  const [particles, setParticles] = useState<GameEntity[]>([]);
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 80));

  // Initialization: Spawn Enemies
  useEffect(() => {
    if (status === GameStatus.LOADING_DATA && defectsLibrary.length > 0) {
      const newEnemies: GameEntity[] = [];
      const range = (LATTICE_SIZE * LATTICE_SPACING) / 2 - 10;
      
      for (let i = 0; i < 20; i++) {
        const randomDefect = defectsLibrary[Math.floor(Math.random() * defectsLibrary.length)];
        newEnemies.push({
          id: `enemy-${i}`,
          type: 'defect',
          position: [
            (Math.random() - 0.5) * 2 * range,
            (Math.random() - 0.5) * 2 * range,
            (Math.random() - 0.5) * 2 * range,
          ],
          velocity: [0,0,0],
          defectId: randomDefect.id
        });
      }
      setEnemies(newEnemies);
    }
  }, [status, defectsLibrary]);

  // Respawn mechanism
  useEffect(() => {
    if (status === GameStatus.PLAYING && enemies.length < 5) {
        const range = (LATTICE_SIZE * LATTICE_SPACING) / 2 - 10;
        const randomDefect = defectsLibrary[Math.floor(Math.random() * defectsLibrary.length)];
        if(randomDefect) {
            const newEnemy: GameEntity = {
                id: Math.random().toString(),
                type: 'defect',
                position: [
                    (Math.random() - 0.5) * 2 * range,
                    (Math.random() - 0.5) * 2 * range,
                    (Math.random() - 0.5) * 2 * range,
                ],
                velocity: [0,0,0],
                defectId: randomDefect.id
            };
            setEnemies(prev => [...prev, newEnemy]);
        }
    }
  }, [enemies.length, status, defectsLibrary]);

  // Memoize handlers to prevent unnecessary re-renders in child components
  const handleShoot = useCallback((pos: THREE.Vector3, dir: THREE.Vector3) => {
    setBullets(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        type: 'bullet',
        position: [pos.x + dir.x * 2, pos.y + dir.y * 2, pos.z + dir.z * 2],
        velocity: [dir.x * BULLET_SPEED, dir.y * BULLET_SPEED, dir.z * BULLET_SPEED]
      }
    ]);
  }, []);

  const handleMove = useCallback((pos: THREE.Vector3) => {
     playerPosRef.current.copy(pos);
  }, []);

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    setBullets(prev => prev
      .map(b => ({
        ...b,
        position: [
          b.position[0] + b.velocity[0] * delta,
          b.position[1] + b.velocity[1] * delta,
          b.position[2] + b.velocity[2] * delta
        ] as [number, number, number]
      }))
      .filter(b => new THREE.Vector3(...b.position).length() < 200) 
    );

    setParticles(prev => prev
      .map(p => ({
        ...p,
        life: (p.life || 1) - delta * 2,
        position: [
            p.position[0] + p.velocity[0] * delta,
            p.position[1] + p.velocity[1] * delta,
            p.position[2] + p.velocity[2] * delta
        ] as [number, number, number]
      }))
      .filter(p => (p.life || 0) > 0)
    );

    setBullets(currentBullets => {
        let activeBullets = [...currentBullets];
        
        setEnemies(currentEnemies => {
            let activeEnemies = [...currentEnemies];
            const deadEnemies: string[] = [];

            for (let bIndex = activeBullets.length - 1; bIndex >= 0; bIndex--) {
                const b = activeBullets[bIndex];
                const bPos = new THREE.Vector3(...b.position);
                
                let hit = false;
                for (let eIndex = activeEnemies.length - 1; eIndex >= 0; eIndex--) {
                    const e = activeEnemies[eIndex];
                    if (deadEnemies.includes(e.id)) continue;

                    const ePos = new THREE.Vector3(...e.position);
                    if (bPos.distanceTo(ePos) < 3.5) { 
                        hit = true;
                        deadEnemies.push(e.id);
                        
                        const defect = defectsLibrary.find(d => d.id === e.defectId);
                        if (defect) {
                            onScore(defect.scoreValue, defect.id);
                            
                            const newParticles: GameEntity[] = [];
                            for(let i=0; i<12; i++) {
                                newParticles.push({
                                    id: Math.random().toString(),
                                    type: 'particle',
                                    position: e.position,
                                    velocity: [(Math.random()-0.5)*15, (Math.random()-0.5)*15, (Math.random()-0.5)*15],
                                    life: 1.5,
                                    color: defect.color
                                });
                            }
                            setParticles(prev => [...prev, ...newParticles]);
                        }
                        break;
                    }
                }
                if (hit) {
                    activeBullets.splice(bIndex, 1);
                }
            }
            return activeEnemies.filter(e => !deadEnemies.includes(e.id));
        });
        return activeBullets;
    });

    const pPos = playerPosRef.current;
    
    enemies.forEach(e => {
        const ePos = new THREE.Vector3(...e.position);
        if (pPos.distanceTo(ePos) < PLAYER_COLLISION_RADIUS + 2) {
             if(Math.random() < 0.1) onHit();
        }
    });
  });

  return (
    <>
        <PlayerController 
            status={status} 
            currentScore={currentScore}
            onShoot={handleShoot} 
            onMove={handleMove} 
        />
        
        <StaticLattice />
        
        {bullets.map(b => <Bullet key={b.id} position={b.position} />)}
        {enemies.map(e => <Enemy key={e.id} data={e} defectsLibrary={defectsLibrary} />)}
        <Particles particles={particles} />

        <ambientLight intensity={0.5} />
        <pointLight position={[0, 50, 0]} intensity={3} color="#4488ff" />
        <pointLight position={[0, -50, 0]} intensity={2} color="#ff0088" />
        <Stars radius={200} depth={100} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <fog attach="fog" args={['#050510', 20, 150]} />
    </>
  );
};

export default function GameCanvas(props: GameSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0, 80], fov: 75, near: 0.1, far: 500 }}>
      <GameContent {...props} />
    </Canvas>
  );
}