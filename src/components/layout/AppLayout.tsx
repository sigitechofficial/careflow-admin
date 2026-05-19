import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/store/ui.store'

interface AppLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  fullBleed?: boolean
}

export function AppLayout({ children, pageTitle, fullBleed }: AppLayoutProps) {
  const { sidebarCollapsed } = useUIStore()
  const theme = useUIStore(s => s.theme)

  return (
    <div data-testid="app-layout" data-theme={theme} className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 overflow-hidden',
          'transition-all duration-250'
        )}
      >
        <Topbar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto">
          {fullBleed ? (
            <div className="flex flex-col min-h-full">
              {children}
            </div>
          ) : (
            <div className="mx-auto max-w-7xl p-5 md:p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
