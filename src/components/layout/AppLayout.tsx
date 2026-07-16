import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/store/ui.store'

import type { LayoutVariant } from '@/components/layout/sidebar-types'

interface AppLayoutProps {
  children: React.ReactNode
  pageTitle?: string
  /** default: max-w-7xl · wide: capped wide (between 7xl and full) · full: edge-to-edge */
  contentLayout?: 'default' | 'wide' | 'full'
  variant?: LayoutVariant
}

const contentShellClass: Record<'default' | 'wide', string> = {
  default: 'mx-auto max-w-7xl px-4 py-4 md:px-[22px] md:py-5',
  wide: 'mx-auto w-full max-w-screen-2xl px-3.5 py-4 md:px-8 md:py-4',
}

export function AppLayout({ children, pageTitle, contentLayout = 'default', variant = 'admin' }: AppLayoutProps) {
  const { sidebarCollapsed } = useUIStore()
  const theme = useUIStore(s => s.theme)

  return (
    <div data-testid="app-layout" data-theme={theme} data-layout-variant={variant} className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar variant={variant} />

      {/* Main content */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 overflow-hidden',
          'transition-all duration-250'
        )}
      >
        <Topbar pageTitle={pageTitle} variant={variant} />
        <main className="flex-1 overflow-y-auto" data-app-main-scroll>
          {contentLayout === 'full' ? (
            <div className="flex flex-col min-h-full">
              {children}
            </div>
          ) : (
            <div
              className={
                contentLayout === 'wide' ? contentShellClass.wide : contentShellClass.default
              }
            >
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
