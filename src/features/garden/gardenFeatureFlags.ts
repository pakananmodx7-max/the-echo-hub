/**
 * Centralized Garden feature flags — read once at module load (Vite bakes
 * `import.meta.env.*` in at build time, so these never change within a running session).
 * Add new Garden feature flags here rather than scattering `import.meta.env` reads across
 * components/services.
 */

/**
 * World Chat is TEMPORARILY disabled (see the task that added this flag). Defaults to
 * disabled (`false`) whenever the env var is unset/anything other than the literal string
 * "true" — this is deliberate: it means World Chat stays off even on a machine/build whose
 * own .env hasn't been updated with this line yet, which is the safer default while the
 * feature is meant to be off. To re-enable, set `VITE_ENABLE_GARDEN_WORLD_CHAT=true` in the
 * env file the build actually uses (.env / .env.local) and rebuild.
 *
 * Every World Chat surface reads this ONE constant — see GardenHUD.tsx (mobile 💬 nav
 * button), EchoGardenPage.tsx (desktop panel + full-screen mobile panel), and
 * gardenPublicChatService.ts (subscribe/send become no-ops). Nothing else — Private Chat,
 * the RTDB `gardenChat/*` data, and every World Chat component/service file — is touched
 * by this flag; disabling it only stops new subscriptions/writes, never deletes anything,
 * so flipping it back to `true` restores World Chat exactly as it was.
 */
export const GARDEN_WORLD_CHAT_ENABLED = import.meta.env.VITE_ENABLE_GARDEN_WORLD_CHAT === 'true'
