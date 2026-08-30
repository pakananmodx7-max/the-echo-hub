import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

export type EchoTheme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'echoTheme'
/** Private Chat's own pre-existing, page-scoped dark-mode toggle — being replaced by this
 * global one (see PrivateChatPage.tsx). Read exactly once, on this provider's first ever
 * mount with no `echoTheme` set yet, to carry a student's already-expressed preference
 * forward as the new global default instead of silently resetting everyone to light/system.
 * Never written to after that — the old toggle button is removed, so this key just quietly
 * stops being read by anything once migrated. */
const LEGACY_CHAT_DARK_KEY = 'echo-hub:chat-dark-mode'

const LIGHT_META_THEME_COLOR = '#fdfaf4'
const DARK_META_THEME_COLOR = '#201a2b'

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function readStoredTheme(): EchoTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    // One-time migration from the old Private-Chat-only toggle (see LEGACY_CHAT_DARK_KEY
    // above) — only when no global preference has ever been set yet.
    if (localStorage.getItem(LEGACY_CHAT_DARK_KEY) === '1') return 'dark'
    return 'system'
  } catch {
    return 'system'
  }
}

function resolveTheme(theme: EchoTheme): ResolvedTheme {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

/** Applies the resolved theme to the document root and the mobile browser-chrome color —
 * exported so index.html's pre-mount inline script can call the exact same resolution
 * logic conceptually (kept in sync manually; see that script) to avoid a flash of the
 * wrong theme before React mounts. */
function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? DARK_META_THEME_COLOR : LIGHT_META_THEME_COLOR)
}

interface ThemeContextValue {
  theme: EchoTheme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: EchoTheme) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * App-wide light/dark/system theme — see src/index.css for the actual dark-palette CSS
 * variable overrides (scoped to `:root[data-theme="dark"]`), which is what makes every
 * existing `bg-cream`/`text-ink`/`bg-lavender-*`/`bg-white` Tailwind utility across the
 * whole app repaint automatically without touching any page's own markup (Tailwind v4
 * compiles those utilities to `var(--color-*)`, not a literal value — confirmed by
 * inspecting the build output). ECHO GARDEN's 3D scene is entirely unaffected by design:
 * WebGL/Three.js materials are plain JS values, never driven by CSS custom properties, so
 * nothing here can "force" a theme onto it — only its 2D HUD overlays, which already use
 * these same tokens, pick up the change (exactly as intended).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<EchoTheme>(readStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))

  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    applyResolvedTheme(resolved)

    if (theme !== 'system') return
    // Reactively follows the OS/browser preference while "ตามระบบ" is selected — never
    // fires for an explicit light/dark choice, which always wins regardless of OS setting.
    let mql: MediaQueryList
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const onChange = () => {
      const next = mql.matches ? 'dark' : 'light'
      setResolvedTheme(next)
      applyResolvedTheme(next)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: EchoTheme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Best-effort persistence only — a private/blocked storage context just means the
      // choice resets next visit, which is harmless (this session still applies it).
    }
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
