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
