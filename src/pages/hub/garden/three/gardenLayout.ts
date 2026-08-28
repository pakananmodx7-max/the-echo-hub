export interface GardenObjectDef {
  id: 'song-tree' | 'kind-word' | 'listening-stone-1' | 'listening-stone-2' | 'bench-1' | 'bench-2' | 'exit'
  position: [number, number]
  icon: string
  label: string
  /** Collision radius used by tap-to-move so the avatar doesn't walk through it. */
  obstacleRadius: number
}

export const GARDEN_BOUND = 7
export const INTERACTION_RADIUS = 2.1

export const GARDEN_OBJECTS: GardenObjectDef[] = [
  { id: 'song-tree', position: [0, -2.5], icon: '🌳', label: 'ดู Song Tree', obstacleRadius: 0.55 },
  { id: 'kind-word', position: [3, 1.5], icon: '🌼', label: 'ดู Kind Word Garden', obstacleRadius: 0.3 },
  { id: 'listening-stone-1', position: [-3, 1.5], icon: '🪨', label: 'แตะ Listening Stone', obstacleRadius: 0.5 },
  { id: 'listening-stone-2', position: [-3.4, -1.5], icon: '🪨', label: 'แตะ Listening Stone', obstacleRadius: 0.5 },
  { id: 'bench-1', position: [2, -1.8], icon: '🪑', label: 'นั่งที่ Private Bench', obstacleRadius: 0.75 },
  { id: 'bench-2', position: [-1.6, 2.6], icon: '🪑', label: 'นั่งที่ Private Bench', obstacleRadius: 0.75 },
  { id: 'exit', position: [0, 6.2], icon: '🚪', label: 'ออกจากสวน', obstacleRadius: 0.4 },
]

export const OBSTACLE_MARGIN = 0.35

/**
 * A small cluster of safe spots near the garden entrance (the exit/gate object sits at
 * [0, 6.2]) — each is checked to sit well clear of every GARDEN_OBJECTS obstacle radius.
 * A fresh arrival gets a random one of these instead of everyone landing on the exact
 * same coordinates.
 */
export const GARDEN_SPAWN_POINTS: [number, number][] = [
  [0, 4.6],
  [-1.8, 4.3],
  [1.8, 4.3],
  [-2.6, 3.4],
  [2.6, 3.4],
  [0, 3.5],
]

export function pickSpawnPoint(): [number, number] {
  const point = GARDEN_SPAWN_POINTS[Math.floor(Math.random() * GARDEN_SPAWN_POINTS.length)]
  return [point[0], point[1]]
}
