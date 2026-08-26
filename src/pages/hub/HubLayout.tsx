import { Outlet } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'

export function HubLayout() {
  return (
    <div className="min-h-svh bg-cream">
      <div className="mx-auto max-w-md pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
