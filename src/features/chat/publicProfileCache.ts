/**
 * In-memory-only (never persisted, nothing sensitive) cache of publicProfiles/{publicId}
 * lookups for the lifetime of this tab. publicProfiles are effectively append-only —
 * codename/avatar/mood get updated in place, never deleted — so once a profile is known
 * to exist there's no reason to re-confirm that with another Firestore read for the same
 * publicId later in the same session (e.g. a sender who declines and resends to the same
 * person, or clicks several avatars that resolve to profiles already seen this session).
 */
const knownToExist = new Set<string>()

export function isPublicProfileKnownToExist(publicId: string): boolean {
  return knownToExist.has(publicId)
}

export function markPublicProfileExists(publicId: string): void {
  knownToExist.add(publicId)
}
