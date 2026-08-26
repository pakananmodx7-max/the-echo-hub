import type { GardenObjectDef } from './gardenLayout'

interface GardenObjectProps {
  def: GardenObjectDef
}

export function GardenObject({ def }: GardenObjectProps) {
  const [x, z] = def.position

  return (
    <group>
      {def.id === 'song-tree' ? <SongTreeMesh x={x} z={z} /> : null}
      {def.id === 'kind-word' ? <KindWordMesh x={x} z={z} /> : null}
      {(def.id === 'listening-stone-1' || def.id === 'listening-stone-2') && <StoneMesh x={x} z={z} />}
      {(def.id === 'bench-1' || def.id === 'bench-2') && <BenchMesh x={x} z={z} />}
      {def.id === 'exit' ? <ExitMesh x={x} z={z} /> : null}
    </group>
  )
}

function SongTreeMesh({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 1.2, 8]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.95, 0]} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#7fbf99" roughness={0.85} />
      </mesh>
      <mesh position={[0.72, 1.55, 0.42]} castShadow>
        <icosahedronGeometry args={[0.58, 1]} />
        <meshStandardMaterial color="#8fd6b4" roughness={0.85} />
      </mesh>
      <mesh position={[-0.68, 1.65, -0.35]} castShadow>
        <icosahedronGeometry args={[0.52, 1]} />
        <meshStandardMaterial color="#a7e0c2" roughness={0.85} />
      </mesh>
      <mesh position={[0.1, 2.55, -0.4]} castShadow>
        <icosahedronGeometry args={[0.46, 1]} />
        <meshStandardMaterial color="#96d4b0" roughness={0.85} />
      </mesh>
    </group>
  )
}

function KindWordMesh({ x, z }: { x: number; z: number }) {
  const petals = [0, 1, 2, 3, 4]
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 16]} />
        <meshStandardMaterial color="#cdeee0" roughness={1} />
      </mesh>
      {petals.map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.6, 0.16, Math.sin((i / 5) * Math.PI * 2) * 0.6]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#ffd7e6' : '#ff9fc0'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function StoneMesh({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.28, z]} rotation={[0.2, 0.6, 0.1]}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#a79bb0" roughness={0.95} />
    </mesh>
  )
}

function BenchMesh({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.3, 0.12, 0.5]} />
        <meshStandardMaterial color="#c98a5f" roughness={0.8} />
      </mesh>
      <mesh position={[-0.55, 0.14, 0]}>
        <boxGeometry args={[0.12, 0.28, 0.5]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.8} />
      </mesh>
      <mesh position={[0.55, 0.14, 0]}>
        <boxGeometry args={[0.12, 0.28, 0.5]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.8} />
      </mesh>
    </group>
  )
}

function ExitMesh({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial color="#bfa6ff" roughness={0.6} />
      </mesh>
    </group>
  )
}
