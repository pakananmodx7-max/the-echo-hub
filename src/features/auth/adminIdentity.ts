/**
 * The admin login identity is a plain username ("admin12345"), never an email — but
 * Firebase Authentication is email/password only, so this maps that username to one fixed,
 * reserved internal email deterministically. This mapping is NOT a secret (the username
 * itself is not sensitive, and this file never contains the admin password — that exists
 * only in Firebase Authentication, set via scripts/setupAdmin.ts). Shared verbatim between
 * the frontend (LoginPage → firebaseAuthService.login) and the local admin setup script
 * (scripts/setupAdmin.ts) so the two can never resolve a different account for the same
 * username — imported by both instead of each keeping its own copy.
 */
export const ADMIN_USERNAME = 'admin12345'

/** Reserved, non-guessable-as-a-real-student-email domain — also blocked from public
 * self-registration (see firebaseAuthService.register) so nobody can squat this exact
 * address before the real admin account is provisioned. */
const ADMIN_INTERNAL_EMAIL_DOMAIN = 'internal.echo-hub-admin.local'

export const ADMIN_INTERNAL_EMAIL = `${ADMIN_USERNAME}@${ADMIN_INTERNAL_EMAIL_DOMAIN}`

/** True for any email address inside the reserved admin-internal domain — used to block
 * public registration of that identity (see firebaseAuthService.register). Deliberately
 * matches the whole domain, not just the one literal address, so no other login/*@ that
 * domain address can ever be self-registered either. */
export function isReservedAdminEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ADMIN_INTERNAL_EMAIL_DOMAIN}`)
}

/**
 * Resolves whatever the login form's "Email / Username" field holds into the actual
 * Firebase Auth email to sign in with. The admin username (case-insensitive, trimmed) maps
 * to the fixed internal email; anything else passes through unchanged (a normal student's
 * real email). This is a pure, deterministic, public string transform — it carries no
 * secret and needs no network call.
 */
export function resolveLoginEmail(usernameOrEmail: string): string {
  const trimmed = usernameOrEmail.trim()
  if (trimmed.toLowerCase() === ADMIN_USERNAME) return ADMIN_INTERNAL_EMAIL
  return trimmed
}
