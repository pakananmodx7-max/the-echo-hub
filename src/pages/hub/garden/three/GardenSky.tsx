import { memo, useMemo } from 'react'
import * as THREE from 'three'
import { createSkyGradientTexture } from './gardenTextures'

const CLOUD_COLOR = '#fff6ea'

/**
 * A cheap evening-gradient sky: one large inverted sphere with a small vertical-gradient
 * canvas texture (see createSkyGradientTexture) and an unlit material — no volumetric
 * clouds, no atmospheric shader, one extra draw call. `cloudCount` scales with the
 * existing Garden quality `decorationDensity` knob (see GardenScene.tsx) so the
 * `performance` preset can drop clouds entirely while keeping the (near-free) sky dome.
 */
export const GardenSky = memo(function GardenSky({ cloudCount }: { cloudCount: number }) {
  const skyTexture = useMemo(() => createSkyGradientTexture(), [])

  const clouds = useMemo(() => {
    const spots: { x: number; y: number; z: number; scale: number }[] = []
    const positions: [number, number, number][] = [
      [-22, 13, -18],
      [20, 15, -22],
      [8, 17, 24],
    ]
    for (let i = 0; i < Math.min(cloudCount, positions.length); i++) {
      const [x, y, z] = positions[i]
      spots.push({ x, y, z, scale: 6 + i * 1.5 })
    }
    return spots
  }, [cloudCount])

  return (
    <>
      <mesh scale={[80, 80, 80]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} fog={false} />
      </mesh>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} scale={[c.scale, c.scale * 0.42, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={CLOUD_COLOR} transparent opacity={0.55} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </>
  )
})
