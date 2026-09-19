import { createRootRouteWithContext, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../lib/AuthContext'
import { ChatProvider } from '../lib/ChatContext'
import { FloatingContactRail } from '../components/chat/FloatingContactRail'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const { user } = useAuth()
  const router = useRouter()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  // Auth guard: redirect unauthenticated users to /login
  useEffect(() => {
    if (!user && currentPath !== '/login') {
      router.navigate({ to: '/login' })
    }
  }, [user, currentPath, router])

  // Redirect away from /login if already logged in
  useEffect(() => {
    if (user && currentPath === '/login') {
      router.navigate({ to: '/' })
    }
  }, [user, currentPath, router])

  // Login page renders without Sidebar
  if (currentPath === '/login') {
    return <Outlet />
  }

  // Not authenticated yet — render nothing while redirect fires
  if (!user) return null

  return (
    <ChatProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="px-8 py-8">
            <Outlet />
          </div>
        </main>
        <FloatingContactRail />
      </div>
    </ChatProvider>
  )
}
