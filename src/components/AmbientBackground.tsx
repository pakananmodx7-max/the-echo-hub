export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-lavender-200/60 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-16 h-64 w-64 rounded-full bg-pink-glow/60 blur-3xl animate-float-slower" />
      <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-mint/50 blur-3xl animate-float-slow" />
    </div>
  )
}
