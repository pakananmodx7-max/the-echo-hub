import * as THREE from 'three'

let cachedVariants: THREE.BufferGeometry[] | null = null

/**
 * A handful of irregular rock geometries, computed once and cached for the whole session
 * — each starts from a plain dodecahedron and gets a one-time non-uniform scale + small
 * per-vertex jitter baked directly into its position attribute, so every instance that
 * reuses one of these geometries is already irregular with zero extra per-frame or
 * per-instance cost. Cycling a handful of these across many rock/boulder instances (by
 * `index % variants.length`) avoids the "visibly identical rocks everywhere" look without
 * computing a unique shape for every single instance.
 */
export function irregularRockGeometries(count = 4): THREE.BufferGeometry[] {
  if (cachedVariants && cachedVariants.length >= count) return cachedVariants.slice(0, count)
  const variants: THREE.BufferGeometry[] = []
  for (let v = 0; v < count; v++) {
    const geo = new THREE.DodecahedronGeometry(1, 0)
    const pos = geo.attributes.position as THREE.BufferAttribute
    // Non-uniform axis scale gives each variant a distinct squashed/elongated silhouette.
    const sx = 0.75 + ((v * 37) % 10) / 20
    const sy = 0.55 + ((v * 53) % 10) / 24
    const sz = 0.8 + ((v * 71) % 10) / 18
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) * sx
      const y = pos.getY(i) * sy
      const z = pos.getZ(i) * sz
      // Small deterministic per-vertex jitter (seeded by vertex index + variant, not
      // Math.random()) so the geometry is stable across re-renders/hot reloads.
      const seed = Math.sin(i * 12.9898 + v * 78.233) * 43758.5453
      const jitter = (seed - Math.floor(seed) - 0.5) * 0.12
      pos.setXYZ(i, x + jitter, y + jitter * 0.6, z - jitter)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    variants.push(geo)
  }
  cachedVariants = variants
  return variants
}
