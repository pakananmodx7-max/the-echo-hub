import { Component, type ReactNode } from 'react'

interface GardenErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

interface GardenErrorBoundaryState {
  hasError: boolean
}

/** If the 3D scene throws (lost WebGL context, driver crash, ...) drop to the 2D fallback instead of a blank screen. */
export class GardenErrorBoundary extends Component<GardenErrorBoundaryProps, GardenErrorBoundaryState> {
  state: GardenErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
