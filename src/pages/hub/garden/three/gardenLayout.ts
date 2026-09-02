export interface GardenObjectDef {
  id:
    | 'song-tree'
    | 'kind-word'
    | 'listening-stone-1'
    | 'listening-stone-2'
    | 'bench-1'
    | 'bench-2'
    | 'exit'
    | 'mindfulness-bell'
  position: [number, number]
  icon: string
  label: string
  /** Collision radius used by tap-to-move so the avatar doesn't walk through it. */
  obstacleRadius: number
}

// Garden V2: footprint grew again, from 10.5 to 16 (~2.3x the walkable area, roughly the
// same growth ratio as the prior "Map Improvement phase" below) — every existing
// interactive object/table/landmark keeps its id/position, the extra room is used
// entirely for the new south Stage/DJ/Dance Floor cluster (Zone I/J/K) plus a reserved,
// still-empty Zone L lawn. See the zone comments for the full shape.
//
// (Map Improvement phase, for history: grew from a 7-unit half-width square to 10.5.)
export const GARDEN_BOUND = 16
export const INTERACTION_RADIUS = 2.1
export const OBSTACLE_MARGIN = 0.35
/** Proximity radius for the new seat-sit prompt — tighter than INTERACTION_RADIUS since a seat is a small, precise target next to its table/obstacle. */
export const SEAT_INTERACTION_RADIUS = 1.3

// Ground/fog sizing lives here (not GardenScene.tsx) so it stays next to GARDEN_BOUND —
// the walkable square's corners reach GARDEN_BOUND*sqrt(2) ≈ 22.6, so the visual ground
// circle needs a comfortably larger radius or the far corners would poke past the grass.
export const GARDEN_GROUND_RADIUS = 24
export const GARDEN_FOG_NEAR = 16
export const GARDEN_FOG_FAR = 46

/**
 * Zone A — Entrance / Spawn Garden (north, z > 5): the exit gate + a welcoming spawn
 * cluster with a clear path south into the Plaza.
 * Zone B — Central Social Plaza (near the origin): the main gathering point + social
 * tables (see GROUP_TABLES) — kept close to spawn/waterfall/group areas so multiplayer
 * still feels social rather than spread thin.
 * Zone C — Waterfall & Quiet Garden (west, x < -6): the waterfall landmark + its quiet
 * seating (see WATERFALL_POSITION / POOL_POSITION and the quiet-bench spots below).
 * Zone D — Individual Reflection Area: scattered single tables (see INDIVIDUAL_TABLES) —
 * near the waterfall, beneath the central tree, near the flower garden, and in two quiet
 * corners, per spec, rather than clustered together.
 * Zone E — Group Conversation Area + Zone B's social tables together (see GROUP_TABLES).
 * Zone F — Private Bench Area: the existing bench-1/bench-2 interactive spots, moved to
 * two separated pockets away from the busy Plaza.
 * Zone G — Draw & Listen / Music Area: coincides with the existing Song Tree spot — no
 * behavior change, only repositioned.
 * Zone H — the old south path terminus around [0, -9.3] — now the entrance to the Zone
 * I/J/K cluster below (the "future lawn" itself moved further out to the new Zone L).
 * Zone I — Performance Stage, Zone J — DJ Booth (on the stage), Zone K — Dance Floor (the
 * open area just in front of the stage) — see STAGE_POSITION / DJ_BOOTH_POSITION /
 * DANCE_FLOOR_POSITION below. The stage is a solid raised landmark you walk up to (like
 * the pavilion or central tree), not a multi-level walkable surface — this engine has no
 * per-object elevation for the avatar, and adding one would be exactly the kind of
 * movement-system rewrite the spec says not to do.
 * Zone L — Future Activity Lawn (southeast, around [9, -12]): a new flat patch, left
 * empty on purpose — same idea as the old Zone H, just relocated now that Zone H's spot
 * is built out.
 * Zone M — 🛕 ECHO Temple Grounds (map-declutter pass, southwest corner around [-9.5,
 * -12]): a new Thai temple-inspired quiet zone built into previously-unused space — see
 * the "Temple Grounds" doc block above STAGE_POSITION below for the full layout
 * (TEMPLE_HALL_POSITION, TEMPLE_FORECOURT_CENTER, REFLECTION_WALL_POSITION,
 * BODHI_TREE_POSITION). Exterior-only Thai Ubosot-style hall, no interior, no statues, no
 * second reward bell — the existing Mindfulness Bell (Zone F below) stays the only one.
 *
 * ECHO ธรรมอุทยาน retheme (spec §2) — a SEPARATE Thai-lettered zone naming scheme laid over
 * the SAME physical map above (never renumbered/rebuilt, per "preserve all existing
 * working Garden systems"). Do not confuse these letters with the Zone A-L(M) list above:
 *   ลานธรรมกลางสวน   -> the Plaza (Zone B above), where the Mindfulness Bell sits (see
 *                        MINDFULNESS_BELL in GARDEN_OBJECTS below).
 *   ทางเดินแห่งสติ     -> the Entrance→Plaza path spine (Zone A/B) — map-declutter pass:
 *                        carries NO signs anymore (trees/grass/lanterns only).
 *   สระบัวแห่งใจ       -> the waterfall pool (Zone C) — POOL_POSITION/QUIET_BENCH_SPOTS.
 *   ศาลาฟังใจ         -> the existing Pavilion landmark (over the large social table,
 *                        Zone E) — retextured warmer/more Thai-sala in GardenLandmarks.tsx,
 *                        kept at its original spot rather than adding a second structure.
 *   ลานเมตตา          -> the Group Conversation / social-tables area (Zone E).
 *   ระฆังแห่งสติ       -> the new Mindfulness Bell object, see GARDEN_OBJECTS below.
 *   กำแพงข้อคิด        -> map-declutter pass: now realized as ONE physical structure, the
 *                        "🪨 กำแพงข้อคิด" Reflection Wall at REFLECTION_WALL_POSITION (see
 *                        the Temple Grounds doc block below) — the primary quote surface,
 *                        replacing both the old central board and most of the old signs.
 *   มุมทบทวนตนเอง      -> the quiet/mindfulness benches (QUIET_BENCH_SPOTS/WATERFALL_CHAIR_
 *                        SPOTS) — conceptually linked to Daily Journal, see EchoGardenPage.
 *   ต้นไม้แห่งความดี    -> the Tree of Goodness landmark, see TREE_OF_GOODNESS_POSITION.
 *   ลานเสียงแห่งใจ      -> the existing Stage/DJ area (Zone I/J/K), retextured warmer in
 *                        GardenStage.tsx — same multiplayer stage/dance/DJ systems, unchanged.
 *   เขตสงบ            -> Zone M, ECHO Temple Grounds, see above.
 */
export const GARDEN_OBJECTS: GardenObjectDef[] = [
  { id: 'song-tree', position: [3.4, 4.1], icon: '🌳', label: 'ดู Song Tree', obstacleRadius: 0.55 },
  { id: 'kind-word', position: [6.6, -2.4], icon: '🌼', label: 'ดู Kind Word Garden', obstacleRadius: 0.3 },
  { id: 'listening-stone-1', position: [-6.9, 3.0], icon: '🪨', label: 'แตะ Listening Stone', obstacleRadius: 0.5 },
  { id: 'listening-stone-2', position: [0.4, -6.3], icon: '🪨', label: 'แตะ Listening Stone', obstacleRadius: 0.5 },
  { id: 'bench-1', position: [7.6, -4.9], icon: '🪑', label: 'นั่งที่ Private Bench', obstacleRadius: 0.75 },
  { id: 'bench-2', position: [-6.6, 4.9], icon: '🪑', label: 'นั่งที่ Private Bench', obstacleRadius: 0.75 },
  { id: 'exit', position: [0, 9.8], icon: '🚪', label: 'ออกจากสวน', obstacleRadius: 0.4 },
  // ECHO ธรรมอุทยาน retheme — "🔔 ระฆังแห่งสติ" (Zone F), near the Plaza. Reuses the exact
  // same interactive-object pattern as every entry above (nearest-object HUD prompt,
  // click → open a panel/modal) — see MindfulnessBellModal.tsx.
  { id: 'mindfulness-bell', position: [-1.4, 1.6], icon: '🔔', label: 'ลั่นระฆังแห่งสติ', obstacleRadius: 0.5 },
]

/**
 * A small cluster of safe spots near the garden entrance (the exit/gate object sits at
 * [0, 9.8]) — each is checked to sit well clear of every GARDEN_OBJECTS/decor obstacle.
 * A fresh arrival gets a random one of these instead of everyone landing on the exact
 * same coordinates.
 */
export const GARDEN_SPAWN_POINTS: [number, number][] = [
  [0, 7.6],
  [-2.8, 7.1],
  [2.8, 7.1],
  [-4.0, 5.6],
  [4.0, 5.6],
  [0, 5.9],
]

export function pickSpawnPoint(): [number, number] {
  const point = GARDEN_SPAWN_POINTS[Math.floor(Math.random() * GARDEN_SPAWN_POINTS.length)]
  return [point[0], point[1]]
}

// --- Stage / DJ / Dance Floor (Zone I/J/K) --------------------------------------------

/** Center of the raised stage platform. */
export const STAGE_POSITION: [number, number] = [0, -13]
export const STAGE_HALF_WIDTH = 3
export const STAGE_HALF_DEPTH = 1.6
export const STAGE_HEIGHT = 0.45
/** Sits on the back of the stage. */
export const DJ_BOOTH_POSITION: [number, number] = [0, -14.1]
export const SPEAKER_POSITIONS: [number, number][] = [
  [-2.7, -11.9],
  [2.7, -11.9],
]
/** The open area right in front of the stage — a proximity zone, not an obstacle. */
export const DANCE_FLOOR_POSITION: [number, number] = [0, -9.8]
export const DANCE_FLOOR_RADIUS = 2.4

/** Zone L — reserved, deliberately empty (see the zone comment above GARDEN_OBJECTS). */
export const FUTURE_LAWN_POSITION: [number, number] = [9, -12]
export const FUTURE_LAWN_RADIUS = 2.6

// --- Landmarks ---------------------------------------------------------------------

/** Where the waterfall's rock wall base sits — the water falls along -x, facing east. */
export const WATERFALL_POSITION: [number, number] = [-8.9, -1.3]
/** The pool the waterfall falls into. */
export const POOL_POSITION: [number, number] = [-8.3, -1.3]
export const POOL_RADIUS = 1.6

export const CENTRAL_TREE_POSITION: [number, number] = [2.3, 3.3]
/** ECHO ธรรมอุทยาน — "🌳 ต้นไม้แห่งความดี", a second major tree landmark distinct from
 * CentralTree/SongTree (see GardenDhammaSigns.tsx). Visual/learning-only per spec §18. */
export const TREE_OF_GOODNESS_POSITION: [number, number] = [-3.6, -4.9]
export const TREE_OF_GOODNESS_OBSTACLE_RADIUS = 0.75
export const FLOWER_ARCH_POSITION: [number, number] = [0, 5.0]
/** Half-gap between the two flower-arch posts — the path runs between them. */
export const FLOWER_ARCH_GAP = 1.1
/** The pavilion/canopy over the large social table — see GROUP_TABLES' 'large' entry. */
export const PAVILION_POSITION: [number, number] = [2.6, -4.2]
export const PAVILION_HALF_SIZE = 1.2

export const LANTERN_SPOTS: [number, number][] = [
  [-3.8, 6.6],
  [3.8, 6.6],
  [-7.3, -4.0],
  [7.3, -4.0],
  [0, -8.8],
  [-9.4, -3.1],
  [-9.2, 1.7],
  [2.4, -5.3],
  [4.0, -3.0],
  // Temple Grounds forecourt (see the zone doc block above STAGE_POSITION).
  [-8.0, -13.0],
  [-11.0, -13.0],
  [-9.5, -10.2],
]

// --- Temple Grounds (map-declutter pass — "🛕 เขตสงบ / ECHO Temple Grounds") ------------
//
// New zone built into the map's genuinely unused southwest corner — well clear of every
// existing cluster (Waterfall ~10.7 units away, Tree of Goodness ~8.5 units away, the
// Stage ~9 units away in x alone) so it reads as its own quiet destination rather than
// crowding an already-built area, and stays visually separated from ลานเสียงแห่งใจ (the
// spec's own requirement). Reached by a single new path branch off the EXISTING
// Plaza→Stage spine's [0, -6.6] waypoint (that waypoint is untouched — this only adds a
// second polyline starting at the same point, exactly the pattern every other branch in
// GARDEN_PATH_WAYPOINTS below already uses).
//
// V1 is exterior-only (spec §7): one Thai Ubosot-style hall (a solid, walk-around
// landmark — same "circles approximate the footprint" treatment as the Stage/Pavilion,
// no interior, no statues), an open paved forecourt with a couple of trees/lanterns/low
// planters and edge seating, and a large Bodhi-style shade tree with a few quiet seats.
// The existing Mindfulness Bell remains the only reward-granting interactive object in
// the Garden — nothing here is a second bell or a new interaction system.
export const TEMPLE_HALL_POSITION: [number, number] = [-9.5, -14.2]
export const TEMPLE_HALL_HALF_WIDTH = 2.0
export const TEMPLE_HALL_HALF_DEPTH = 1.3
export const TEMPLE_HALL_PLATFORM_HEIGHT = 0.3
/** Open paved courtyard between the path entrance and the hall — kept deliberately empty
 * at its center (spec §8: "do not fill the courtyard with props"). */
export const TEMPLE_FORECOURT_CENTER: [number, number] = [-9.5, -11.8]
export const TEMPLE_FORECOURT_RADIUS = 2.3
/** "🪨 กำแพงข้อคิด" — the primary quote surface now (spec §13), placed at the transition
 * between the Garden proper and Temple Grounds, just off the path's [-6.4,-8.3] bend (not
 * ON the walking lane itself, same "beside, not blocking" treatment as every remaining
 * physical sign). */
export const REFLECTION_WALL_POSITION: [number, number] = [-7.0, -7.6]
/** A large Bodhi-inspired shade tree off to the forecourt's west side (never blocking the
 * open center) with a few quiet seats underneath (spec §9). */
export const BODHI_TREE_POSITION: [number, number] = [-12.6, -10.6]
export const BODHI_TREE_OBSTACLE_RADIUS = 0.8
export const BODHI_SEAT_SPOTS: [number, number][] = [
  [-13.7, -9.8],
  [-13.7, -11.4],
  [-11.8, -9.5],
]
/** Seating along the forecourt's outer edge (spec §8) — never in the open center. */
export const TEMPLE_EDGE_SEAT_SPOTS: [number, number][] = [
  [-7.2, -12.6],
  [-11.9, -12.6],
]
/** A couple of small forecourt trees, kept off to the sides (spec §8: "a few trees", not a
 * grove) — light obstacles like every other small tree trunk in this file. */
export const TEMPLE_TREE_SPOTS: [number, number][] = [
  [-7.6, -10.8],
  [-11.5, -8.5],
]

/** Individual seating in the quiet garden around the pool — now real, sittable solo seats (see SEATS below). */
export const QUIET_BENCH_SPOTS: [number, number][] = [
  [-7.45, 1.05],
  [-7.24, -3.57],
  [-6.25, -0.13],
]

/** Two extra single chairs right beside the waterfall itself — clear of the cliff/pool obstacles. */
export const WATERFALL_CHAIR_SPOTS: [number, number][] = [
  [-6.3, -2.2],
  [-6.3, -0.4],
]

// --- Tables --------------------------------------------------------------------------

export type TableSize = 'individual' | 'small' | 'medium' | 'large'

export interface TableSpec {
  id: string
  position: [number, number]
  /** Facing angle in radians — chairs are arranged relative to this. */
  rotation: number
  seats: number
  size: TableSize
}

const TABLE_OBSTACLE_RADIUS: Record<TableSize, number> = {
  individual: 0.55,
  small: 0.85,
  medium: 1.05,
  large: 1.3,
}

/**
 * "โต๊ะเดี่ยว" — one chair each, deliberately scattered (never clustered) across the
 * quieter parts of the garden: two by the waterfall, one beneath the central tree, one
 * near the flower garden (Kind Word), and two in quiet corners near the entrance/south lawn.
 */
export const INDIVIDUAL_TABLES: TableSpec[] = [
  { id: 'solo-waterfall-1', position: [-5.6, -4.8], rotation: 2.3, seats: 1, size: 'individual' },
  { id: 'solo-waterfall-2', position: [-5.6, 1.6], rotation: -1.0, seats: 1, size: 'individual' },
  { id: 'solo-tree', position: [4.6, 3.3], rotation: 0.8, seats: 1, size: 'individual' },
  { id: 'solo-flower-garden', position: [8.3, -3.6], rotation: -0.6, seats: 1, size: 'individual' },
  { id: 'solo-quiet-south', position: [-2.0, -6.4], rotation: 0.3, seats: 1, size: 'individual' },
  { id: 'solo-quiet-entrance', position: [-4.4, 6.6], rotation: -0.2, seats: 1, size: 'individual' },
]

/**
 * "โต๊ะกลุ่ม" — small (2-3), medium (4), and one large (6, capped) social table, placed
 * around the Central Plaza / Group Conversation Area, spaced so avatars never overlap.
 */
export const GROUP_TABLES: TableSpec[] = [
  { id: 'group-small-1', position: [2.4, 1.3], rotation: 0, seats: 3, size: 'small' },
  { id: 'group-small-2', position: [-2.2, -2.4], rotation: 0.5, seats: 2, size: 'small' },
  { id: 'group-medium-1', position: [5.4, 0.4], rotation: -0.3, seats: 4, size: 'medium' },
  { id: 'group-medium-2', position: [-3.5, 0.3], rotation: 0.4, seats: 4, size: 'medium' },
  { id: 'group-large-social', position: PAVILION_POSITION, rotation: 0, seats: 6, size: 'large' },
]

export function tableObstacleRadius(size: TableSize): number {
  return TABLE_OBSTACLE_RADIUS[size]
}

/** How far a table's seats sit from its center, per size class — the table top's own radius plus a fixed gap. */
const SEAT_RING_RADIUS: Record<TableSize, number> = {
  individual: 0.32 + 0.5,
  small: 0.55 + 0.5,
  medium: 0.7 + 0.5,
  large: 0.95 + 0.5,
}

/**
 * Evenly spaced seat anchors around a round table, offset just past its edge — the exact
 * math GardenTables.tsx uses to place its stool instances, exported here so the seat
 * interaction/occupancy system (SEATS below) can never drift out of sync with what's
 * actually rendered.
 */
export function tableSeatSpots(table: TableSpec): [number, number][] {
  const radius = SEAT_RING_RADIUS[table.size]
  const [cx, cz] = table.position
  return Array.from({ length: table.seats }, (_, i) => {
    const angle = (i / table.seats) * Math.PI * 2 + table.rotation
    return [cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius] as [number, number]
  })
}

// --- Collision (decorative / non-interactive obstacles) ------------------------------

export interface DecorObstacle {
  position: [number, number]
  radius: number
}

const WATERFALL_CLIFF_OBSTACLES: DecorObstacle[] = [
  { position: [-8.9, -4.2], radius: 1.3 },
  { position: [-9.0, -2.0], radius: 1.3 },
  { position: [-9.0, 0.4], radius: 1.3 },
  { position: [-8.9, 2.6], radius: 1.3 },
]

const PAVILION_POST_OBSTACLES: DecorObstacle[] = [
  { position: [PAVILION_POSITION[0] - PAVILION_HALF_SIZE, PAVILION_POSITION[1] - PAVILION_HALF_SIZE], radius: 0.22 },
  { position: [PAVILION_POSITION[0] + PAVILION_HALF_SIZE, PAVILION_POSITION[1] - PAVILION_HALF_SIZE], radius: 0.22 },
  { position: [PAVILION_POSITION[0] - PAVILION_HALF_SIZE, PAVILION_POSITION[1] + PAVILION_HALF_SIZE], radius: 0.22 },
  { position: [PAVILION_POSITION[0] + PAVILION_HALF_SIZE, PAVILION_POSITION[1] + PAVILION_HALF_SIZE], radius: 0.22 },
]

const FLOWER_ARCH_POST_OBSTACLES: DecorObstacle[] = [
  { position: [FLOWER_ARCH_POSITION[0] - FLOWER_ARCH_GAP, FLOWER_ARCH_POSITION[1]], radius: 0.22 },
  { position: [FLOWER_ARCH_POSITION[0] + FLOWER_ARCH_GAP, FLOWER_ARCH_POSITION[1]], radius: 0.22 },
]

const QUIET_BENCH_OBSTACLES: DecorObstacle[] = QUIET_BENCH_SPOTS.map((position) => ({ position, radius: 0.65 }))
const WATERFALL_CHAIR_OBSTACLES: DecorObstacle[] = WATERFALL_CHAIR_SPOTS.map((position) => ({ position, radius: 0.4 }))

const TABLE_OBSTACLES: DecorObstacle[] = [...INDIVIDUAL_TABLES, ...GROUP_TABLES].map((t) => ({
  position: t.position,
  radius: TABLE_OBSTACLE_RADIUS[t.size],
}))

/**
 * The stage platform's footprint, approximated as three overlapping circles along its
 * width (same "a few circles instead of a rectangle" approach used for the pavilion) —
 * solid all the way through, since (unlike the pavilion's open canopy) this is a raised
 * platform players should walk around, not under.
 */
const STAGE_OBSTACLES: DecorObstacle[] = [
  { position: [STAGE_POSITION[0] - 2, STAGE_POSITION[1]], radius: 1.7 },
  { position: [STAGE_POSITION[0], STAGE_POSITION[1]], radius: 1.9 },
  { position: [STAGE_POSITION[0] + 2, STAGE_POSITION[1]], radius: 1.7 },
]
const SPEAKER_OBSTACLES: DecorObstacle[] = SPEAKER_POSITIONS.map((position) => ({ position, radius: 0.35 }))

/**
 * The temple hall's footprint, same "a few overlapping circles" treatment as the stage —
 * solid, walk-around, not a walkable elevated surface.
 */
const TEMPLE_HALL_OBSTACLES: DecorObstacle[] = [
  { position: [TEMPLE_HALL_POSITION[0] - 1.2, TEMPLE_HALL_POSITION[1]], radius: 1.3 },
  { position: TEMPLE_HALL_POSITION, radius: 1.5 },
  { position: [TEMPLE_HALL_POSITION[0] + 1.2, TEMPLE_HALL_POSITION[1]], radius: 1.3 },
]
const BODHI_TREE_OBSTACLE: DecorObstacle = { position: BODHI_TREE_POSITION, radius: BODHI_TREE_OBSTACLE_RADIUS }
const TEMPLE_TREE_OBSTACLES: DecorObstacle[] = TEMPLE_TREE_SPOTS.map((position) => ({ position, radius: 0.45 }))
const BODHI_SEAT_OBSTACLES: DecorObstacle[] = BODHI_SEAT_SPOTS.map((position) => ({ position, radius: 0.4 }))
const TEMPLE_EDGE_SEAT_OBSTACLES: DecorObstacle[] = TEMPLE_EDGE_SEAT_SPOTS.map((position) => ({ position, radius: 0.4 }))

/** Every non-interactive obstacle in the map — tap-to-move must route around all of these (req. #11). */
export const GARDEN_DECOR_OBSTACLES: DecorObstacle[] = [
  { position: POOL_POSITION, radius: POOL_RADIUS },
  ...WATERFALL_CLIFF_OBSTACLES,
  { position: CENTRAL_TREE_POSITION, radius: 0.65 },
  { position: TREE_OF_GOODNESS_POSITION, radius: TREE_OF_GOODNESS_OBSTACLE_RADIUS },
  ...PAVILION_POST_OBSTACLES,
  ...FLOWER_ARCH_POST_OBSTACLES,
  ...QUIET_BENCH_OBSTACLES,
  ...WATERFALL_CHAIR_OBSTACLES,
  ...TABLE_OBSTACLES,
  ...STAGE_OBSTACLES,
  ...SPEAKER_OBSTACLES,
  ...TEMPLE_HALL_OBSTACLES,
  BODHI_TREE_OBSTACLE,
  ...TEMPLE_TREE_OBSTACLES,
  ...BODHI_SEAT_OBSTACLES,
  ...TEMPLE_EDGE_SEAT_OBSTACLES,
]

// --- Paths -----------------------------------------------------------------------------

export interface PathSegmentSpec {
  position: [number, number]
  length: number
  width: number
  /** Rotation around Y, radians — 0 runs along +z. */
  rotation: number
}

interface PathWaypoints {
  points: [number, number][]
  width: number
}

/**
 * Every corridor connecting the garden's zones, expressed as a short polyline rather
 * than one long straight plane — a few waypoints per corridor reads as a gentle curve
 * once tiled with the path texture, and avoids the "long straight empty road" the spec
 * calls out. Converted to renderable rectangle segments by segmentsFromWaypoints below.
 */
const GARDEN_PATH_WAYPOINTS: PathWaypoints[] = [
  // Entrance → Plaza (main spine)
  { points: [[0, 9.5], [0.6, 6.6], [0, 3.6], [0, 0]], width: 1.8 },
  // Plaza → Waterfall & Quiet Garden
  { points: [[0, 0], [-3.4, -0.5], [-6.4, -1.1], [-8.3, -1.3]], width: 1.6 },
  // Plaza → Group/Flower area (east)
  { points: [[0, 0], [2.6, -0.7], [5.0, -1.6], [6.9, -2.9]], width: 1.5 },
  // Plaza → Stage/DJ/Dance Floor (south) — Garden V2 extends this same spine further
  // south into the newly-walkable space instead of adding a second parallel path.
  { points: [[0, 0], [0, -3.3], [0, -6.6], [0, -9.3], [0, -10.6], [0, -12.0]], width: 1.7 },
  // Branch: Dance Floor → Future Activity Lawn (Zone L, southeast)
  { points: [[0, -10.6], [4.5, -11.3], [9, -12]], width: 1.3 },
  // Branch: Group area → Private Bench (east pocket)
  { points: [[5.0, -1.6], [6.6, -3.3], [7.6, -4.9]], width: 1.1 },
  // Branch: Entrance → Private Bench / Listening Stone (west pocket)
  { points: [[0, 3.6], [-3.0, 4.4], [-6.6, 4.9]], width: 1.1 },
  // Branch: Entrance → Song Tree / Draw & Listen corner
  { points: [[0.6, 6.6], [3.4, 4.5]], width: 1.0 },
  // Waterfall → its own quiet-table stubs
  { points: [[-8.3, -1.3], [-7.3, -3.7]], width: 1.0 },
  { points: [[-8.3, -1.3], [-6.9, 1.6]], width: 1.0 },
  // Branch: Plaza→Stage spine's [0,-6.6] waypoint → Reflection Wall → Temple Grounds
  // forecourt entrance (see the Temple Grounds doc block above STAGE_POSITION) — joins the
  // existing spine at that exact point rather than adding a second parallel southbound path.
  { points: [[0, -6.6], [-3.6, -7.6], [-6.4, -8.3], [-8.6, -10.0], [-9.5, -11.8]], width: 1.5 },
]

function segmentsFromWaypoints(paths: PathWaypoints[]): PathSegmentSpec[] {
  const segments: PathSegmentSpec[] = []
  for (const { points, width } of paths) {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i]
      const [x2, z2] = points[i + 1]
      const dx = x2 - x1
      const dz = z2 - z1
      const length = Math.hypot(dx, dz)
      if (length < 0.0001) continue
      segments.push({
        position: [(x1 + x2) / 2, (z1 + z2) / 2],
        // Slight overlap so consecutive segments/bends don't show a visible seam.
        length: length + width * 0.5,
        width,
        rotation: Math.atan2(dx, dz),
      })
    }
  }
  return segments
}

export const GARDEN_PATH_SEGMENTS: PathSegmentSpec[] = segmentsFromWaypoints(GARDEN_PATH_WAYPOINTS)

// --- Seats (Garden V2) -----------------------------------------------------------------

export interface SeatDef {
  id: string
  position: [number, number]
  /** Facing angle in radians, same convention as the avatar's own walking yaw (atan2(mx, mz)) — the direction a seated avatar looks. */
  rotation: number
  kind: 'solo' | 'group'
}

function tableSeats(table: TableSpec): SeatDef[] {
  return tableSeatSpots(table).map((position, i) => {
    const angle = (i / table.seats) * Math.PI * 2 + table.rotation
    return {
      id: `${table.id}_seat_${String(i + 1).padStart(2, '0')}`,
      position,
      // Face inward toward the table center, opposite the outward angle used to place the seat.
      rotation: angle + Math.PI,
      kind: table.seats > 1 ? 'group' : 'solo',
    }
  })
}

function facingTowards(from: [number, number], to: [number, number]): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1])
}

/**
 * Every sittable seat in the garden — one canonical registry shared by the proximity/sit
 * interaction system, the occupancy sync (gardenSeatService.ts writes/reads seat ids from
 * here), and the remote-player renderer (RemoteGardenPlayer positions a seated member at
 * `SEATS.find(s => s.id === seatId).position`, never at their own stale presence x/z — see
 * the Garden V2 plan). Table seats reuse the exact same tableSeatSpots math that drives
 * GardenTables.tsx's visual stool instances, so a seat's anchor and its rendered stool can
 * never drift apart.
 */
export const SEATS: SeatDef[] = [
  ...INDIVIDUAL_TABLES.flatMap(tableSeats),
  ...GROUP_TABLES.flatMap(tableSeats),
  ...QUIET_BENCH_SPOTS.map(
    (position, i): SeatDef => ({
      id: `pond_bench_${String(i + 1).padStart(2, '0')}`,
      position,
      rotation: facingTowards(position, POOL_POSITION),
      kind: 'solo',
    }),
  ),
  ...WATERFALL_CHAIR_SPOTS.map(
    (position, i): SeatDef => ({
      id: `waterfall_chair_${String(i + 1).padStart(2, '0')}`,
      position,
      rotation: facingTowards(position, POOL_POSITION),
      kind: 'solo',
    }),
  ),
  // Temple Grounds — Bodhi tree seats and forecourt edge seating (spec §9/§8). The
  // `bodhi_seat_` id prefix is what EchoGardenPage.tsx matches on to show the exact fixed
  // phrase from spec §9 on sit, instead of a random dhammaQuotes.ts bench reflection.
  ...BODHI_SEAT_SPOTS.map(
    (position, i): SeatDef => ({
      id: `bodhi_seat_${String(i + 1).padStart(2, '0')}`,
      position,
      rotation: facingTowards(position, BODHI_TREE_POSITION),
      kind: 'solo',
    }),
  ),
  ...TEMPLE_EDGE_SEAT_SPOTS.map(
    (position, i): SeatDef => ({
      id: `temple_edge_seat_${String(i + 1).padStart(2, '0')}`,
      position,
      rotation: facingTowards(position, TEMPLE_FORECOURT_CENTER),
      kind: 'solo',
    }),
  ),
]

/** O(1) seat lookup — GardenPlayer reads this every frame while seated (to pin position) and RemoteGardenPlayer reads it for every seated member. */
export const SEATS_BY_ID: Record<string, SeatDef> = Object.fromEntries(SEATS.map((s) => [s.id, s]))
