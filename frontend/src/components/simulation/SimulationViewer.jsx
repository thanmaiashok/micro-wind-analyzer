import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

/**
 * Renders a text label as a THREE.Sprite using a canvas texture.
 * This avoids the troika-three-text removeChild crash from @react-three/drei's Text.
 */
function SpriteLabel({ text, position, selected = false }) {
  const spriteMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.clearRect(0, 0, 512, 80);
    ctx.fillStyle = selected ? 'rgba(45,34,14,0.82)' : 'rgba(10,26,50,0.80)';
    ctx.roundRect(8, 8, 496, 64, 16);
    ctx.fill();

    ctx.strokeStyle = selected ? '#ffd166' : '#00ffd0';
    ctx.lineWidth = 3;
    ctx.roundRect(8, 8, 496, 64, 16);
    ctx.stroke();

    // Text
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = selected ? '#fff3d1' : '#d7f7ff';
    ctx.fillText(text, 256, 42);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
  }, [text, selected]);

  return (
    <sprite material={spriteMaterial} position={position} scale={[28, 4.5, 1]} />
  );
}

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(500, 600, 700);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

// Single source-of-truth for grid→world coordinate mapping.
// All placement markers AND the city model use this same span so they align.
const WORLD_SPAN = 160; // world units for the full 0-100 grid range

/**
 * Loads the downloaded 3D Map (Littlest Tokyo, high fidelity city block)
 */
function CityMap() {
  const { scene } = useGLTF('/models/littlest_tokyo.glb', true);
  
  // Center and scale without mutating the cached node
  const { position, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    // Scale city so its footprint matches WORLD_SPAN — markers land on the model
    const calculatedScale = maxDim > 0 ? WORLD_SPAN / maxDim : 1;

    return {
      position: [-center.x * calculatedScale, -box.min.y * calculatedScale, -center.z * calculatedScale],
      scale: [calculatedScale, calculatedScale, calculatedScale]
    };
  }, [scene]);

  return <primitive object={scene} position={position} scale={scale} castShadow receiveShadow />;
}

useGLTF.preload('/models/littlest_tokyo.glb', true);

/**
 * Animated wind particle system with simple repulsion physics
 * Particles naturally flow but are pushed up and around the dense city block
 */
function WindPhysicsParticles({ speed, direction, placements = [] }) {
  const count = 3000;
  const mesh = useRef();
  
  const noise3D = useMemo(() => createNoise3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 400,
        y: Math.random() * 80 + 5,
        z: (Math.random() - 0.5) * 400,
        baseSpeed: (Math.random() * 0.5 + 0.5) * speed * 0.3,
        phase: Math.random() * 100,
      });
    }
    return temp;
  }, [speed]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const time = state.clock.getElapsedTime();
    const rad = (direction * Math.PI) / 180;
    const baseDirX = Math.sin(rad);
    const baseDirZ = -Math.cos(rad);

    const gridSize = 100;
    const wakeZones = placements.map(p => ({
      x: ((p.x / gridSize) - 0.5) * 180,
      z: ((p.y / gridSize) - 0.5) * 180,
      y: 14
    }));

    particles.forEach((p, i) => {
      const nx = noise3D(p.x * 0.01, p.y * 0.01, time * 0.1 + p.phase);
      const ny = noise3D(p.x * 0.01, p.z * 0.01, time * 0.1 + p.phase + 100);
      const nz = noise3D(p.y * 0.01, p.z * 0.01, time * 0.1 + p.phase + 200);

      const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z);
      let lift = 0;
      let divergeX = 0;
      let divergeZ = 0;
      
      if (distFromCenter < 80) {
        lift = Math.max(0, (1 - distFromCenter/80)) * 0.8;
        divergeX = (p.x / distFromCenter) * 0.8;
        divergeZ = (p.z / distFromCenter) * 0.8;
      }

      let wakeFactor = 1.0;
      let addedTurbulence = 0;
      
      for (const wake of wakeZones) {
        const dx = p.x - wake.x;
        const dz = p.z - wake.z;
        const distToTurbine = Math.sqrt(dx*dx + dz*dz);
        const heightCheck = Math.abs(p.y - wake.y) < 25;
        
        const dot = (dx * baseDirX + dz * baseDirZ);
        
        if (heightCheck && distToTurbine < 60 && dot > 0) {
          const wakeIntensity = Math.max(0, 1 - (dot / 60));
          const radialSpread = Math.min(1, distToTurbine / 15);
          if (radialSpread < 1) {
             const effect = wakeIntensity * (1 - radialSpread);
             wakeFactor *= (1 - effect * 0.85);
             addedTurbulence += effect * 3.0;
          }
        }
      }

      const currentSpeed = p.baseSpeed * wakeFactor;
      const vx = (baseDirX + nx * 0.5 + divergeX + nx * addedTurbulence);
      const vy = (ny * 0.2 + lift + ny * addedTurbulence);
      const vz = (baseDirZ + nz * 0.5 + divergeZ + nz * addedTurbulence);

      p.x += vx * currentSpeed;
      p.y += vy * currentSpeed;
      p.z += vz * currentSpeed;

      if (p.y > 10 && lift === 0 && addedTurbulence === 0) {
         p.y -= 0.05 * currentSpeed;
      }

      const limits = 200;
      if (p.x > limits) p.x = -limits;
      if (p.x < -limits) p.x = limits;
      if (p.z > limits) p.z = -limits;
      if (p.z < -limits) p.z = limits;
      if (p.y < 2) p.y = 2 + Math.random() * 5;
      if (p.y > 120) p.y = 120;

      dummy.position.set(p.x, p.y, p.z);
      
      const vel = new THREE.Vector3(vx, vy, vz).normalize();
      const target = new THREE.Vector3().addVectors(dummy.position, vel);
      dummy.lookAt(target);
      dummy.rotateX(Math.PI / 2);
      
      const stretch = Math.max(1, currentSpeed * 2.5) * (1 - Math.min(addedTurbulence, 1) * 0.5);
      dummy.scale.set(0.4, stretch * 4, 0.4);
      
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <cylinderGeometry args={[0.2, 0.2, 2, 4]} />
      <meshBasicMaterial color="#00e5a0" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

// Category visual config — single source of truth for colours/labels
const CATEGORY_CONFIG = {
  ROOFTOP:      { color: '#00d4ff', emissive: '#0080ff', label: '🏢 Rooftop' },
  ELEVATED:     { color: '#ffaa00', emissive: '#ff6600', label: '⬆ Elevated' },
  GROUND_FLOOR: { color: '#00e96b', emissive: '#00c45a', label: '🌿 Ground' },
  _default:     { color: '#00ffd0', emissive: '#00ffd0', label: '📍 Spot' },
};

function PlacementMarkers({ placements = [], selectedSpotKey = null, onSelectSpot, gridSize = 100 }) {
  if (!placements.length) return null;

  return (
    <group>
      {placements.map((p, idx) => {
        const spotKey = `${p.x}-${p.y}`;
        const isSelected = selectedSpotKey === spotKey;
        const cfg = CATEGORY_CONFIG[p.placement_category] || CATEGORY_CONFIG._default;
        const worldX = ((p.x / gridSize) - 0.5) * WORLD_SPAN;
        const worldZ = ((p.y / gridSize) - 0.5) * WORLD_SPAN;
        // Rooftop floats higher, ground stays low
        const baseY = p.placement_category === 'ROOFTOP' ? 14
                    : p.placement_category === 'ELEVATED' ? 9
                    : 4;
        const worldY = baseY + Math.min(6, p.wind_speed || 0);

        return (
          <group key={`${p.x}-${p.y}-${idx}`} position={[worldX, worldY, worldZ]}>
            <mesh onClick={() => onSelectSpot?.(spotKey)}>
              <sphereGeometry args={[1.8, 12, 12]} />
              <meshStandardMaterial
                color={isSelected ? '#ffd166' : cfg.color}
                emissive={isSelected ? '#ffbd2e' : cfg.emissive}
                emissiveIntensity={isSelected ? 0.8 : 0.5}
              />
            </mesh>
            <SpriteLabel
              text={`${cfg.label} ${idx + 1} · ${(p.power_output / 1000).toFixed(1)}kW`}
              position={[0, 6, 0]}
              selected={isSelected}
            />
          </group>
        );
      })}
    </group>
  );
}


/**
 * Pulsing amber beacons for "wind miss" zones:
 * high wind-energy spots with NO turbine placed on them.
 * Beacon pulses faster / brighter for higher intensity zones.
 */
function MissBeacon({ position, windSpeed, intensity = 0.5 }) {
  const outerRef = useRef();
  const innerRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Pulse scale: higher intensity = faster pulse
    const freq = 0.8 + intensity * 1.2;
    const pulse = 1 + 0.35 * Math.sin(t * freq * Math.PI * 2);
    if (outerRef.current) {
      outerRef.current.scale.setScalar(pulse);
      outerRef.current.material.opacity = 0.18 + 0.22 * Math.abs(Math.sin(t * freq * Math.PI * 2));
    }
    if (innerRef.current) {
      const innerPulse = 1 + 0.15 * Math.sin(t * freq * Math.PI * 2 + 1);
      innerRef.current.scale.setScalar(innerPulse);
    }
  });

  // Colour: amber for medium intensity, red-orange for high
  const hue = intensity > 0.7 ? '#ff4500' : '#ffaa00';

  return (
    <group position={position}>
      {/* Outer pulsing ring */}
      <mesh ref={outerRef}>
        <torusGeometry args={[3.5, 0.45, 8, 32]} />
        <meshBasicMaterial
          color={hue}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Inner solid core */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[1.2, 10, 10]} />
        <meshStandardMaterial
          color={hue}
          emissive={hue}
          emissiveIntensity={0.9}
        />
      </mesh>
      {/* Vertical beam */}
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 12, 6]} />
        <meshBasicMaterial
          color={hue}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Label */}
      <SpriteLabel
        text={`⚡ ${windSpeed.toFixed(1)} m/s`}
        position={[0, 7, 0]}
        selected={false}
      />
    </group>
  );
}

function MissZoneMarkers({ missZones = [], gridSize = 100 }) {
  if (!missZones.length) return null;
  return (
    <group>
      {missZones.map((z, i) => {
        const worldX = ((z.x / gridSize) - 0.5) * WORLD_SPAN;
        const worldZ = ((z.y / gridSize) - 0.5) * WORLD_SPAN;
        const worldY = 8 + (z.intensity || 0.5) * 6; // higher-energy beacons float higher
        return (
          <MissBeacon
            key={`miss-${z.x}-${z.y}-${i}`}
            position={[worldX, worldY, worldZ]}
            windSpeed={z.wind_speed}
            intensity={z.intensity || 0.5}
          />
        );
      })}
    </group>
  );
}

function SceneControls({ resetSignal, externalResetToken = 0 }) {
  const controlsRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    controlsRef.current.target.copy(DEFAULT_CAMERA_TARGET);
    controlsRef.current.update();
  }, [camera]);

  useEffect(() => {
    if (!controlsRef.current) return;
    camera.position.copy(DEFAULT_CAMERA_POSITION);
    controlsRef.current.target.copy(DEFAULT_CAMERA_TARGET);
    controlsRef.current.update();
  }, [camera, resetSignal, externalResetToken]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableRotate
      enableZoom
      enablePan
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      zoomSpeed={0.45}
      panSpeed={0.8}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
      minPolarAngle={0.05}
      maxPolarAngle={1.35}
      minDistance={20}
      maxDistance={5000}
    />
  );
}

function SimulationViewer({ windSpeed, windDirection, placements = [], missZones = [], selectedSpotKey = null, onSelectSpot, resetToken = 0 }) {
  const [resetSignal, setResetSignal] = useState(0);

  return (
    <div className="viewer-canvas-wrap">
      <button
        type="button"
        className="viewer-reset-btn"
        onClick={() => setResetSignal((v) => v + 1)}
      >
        Reset View
      </button>
      <Canvas
        camera={{ position: DEFAULT_CAMERA_POSITION.toArray(), fov: 44, near: 0.1, far: 5000 }}
        style={{ touchAction: 'none', cursor: 'grab' }}
        gl={{ antialias: true, toneMappingExposure: 1.2 }}
      >
        <fog attach="fog" args={['#10233a', 800, 4000]} />
        <ambientLight intensity={1.0} />
        <hemisphereLight args={['#d7f0ff', '#17344d', 0.9]} />
        <directionalLight position={[140, 260, 140]} intensity={2.2} color="#ffffff" castShadow />
        <directionalLight position={[-120, 130, -90]} intensity={0.9} color="#9fd8ff" />
        
        <Suspense fallback={null}>
          <CityMap />
          <Environment preset="city" />
        </Suspense>

        <WindPhysicsParticles speed={windSpeed} direction={windDirection} placements={placements} />
        <PlacementMarkers placements={placements} selectedSpotKey={selectedSpotKey} onSelectSpot={onSelectSpot} />
        <MissZoneMarkers missZones={missZones} />

        <Grid
          position={[0, -0.01, 0]}
          args={[400, 400]}
          cellSize={10}
          cellThickness={1}
          cellColor="#00d4ff"
          sectionSize={50}
          sectionThickness={1.5}
          sectionColor="#0080ff"
          fadeDistance={300}
          fadeStrength={1}
        />
        
        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={400} blur={2} far={50} color="#00d4ff" />
        <SceneControls resetSignal={resetSignal} externalResetToken={resetToken} />
      </Canvas>
    </div>
  );
}

export default React.memo(SimulationViewer);
