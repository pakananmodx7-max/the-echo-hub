import { useEffect, useRef } from 'react'
import { gardenPresenceService, type GardenTransform } from '../features/garden/gardenPresenceService'
import type { GardenAvatarConfig } from '../features/garden/types'
import { useAuth } from './useAuth'

/**
 * Owns the local player's presence for as long as ECHO GARDEN is mounted — marks them
 * inside the garden at the given spawn point, keeps their position in sync (via the
 * returned `reportLocalMove`, meant to be called every animation frame — throttling and
 * change-detection both live inside gardenPresenceService, not here), and marks them
 * offline again the moment the page unmounts (leaving the garden never logs anyone out
 * of the wider hub — that's a completely separate presence record).
 */
export function useGardenPresence(avatarConfig: GardenAvatarConfig, spawn: [number, number]) {
  const { user } = useAuth()
  const spawnRef = useRef(spawn)

  useEffect(() => {
    if (!user?.publicId || !user.codename) return
    const spawnTransform: GardenTransform = { x: spawnRef.current[0], y: 0.58, z: spawnRef.current[1], rotationY: 0 }
    gardenPresenceService.goOnline(
      {
        publicId: user.publicId,
        codename: user.codename,
        avatarId: user.avatarId,
        avatarConfig,
        mood: user.mood,
      },
      spawnTransform,
    )
    return () => gardenPresenceService.goOffline()
    // Deliberately excludes avatarConfig/mood — re-running goOnline on every profile edit
    // would fight with in-flight position writes; mood is kept live via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.publicId, user?.codename])

  useEffect(() => {
    if (!user?.publicId) return
    gardenPresenceService.updateMood(user.mood)
  }, [user?.publicId, user?.mood])

  function reportLocalMove(x: number, y: number, z: number, rotationY: number) {
    gardenPresenceService.reportLocalMove({ x, y, z, rotationY })
  }

  return { reportLocalMove }
}
