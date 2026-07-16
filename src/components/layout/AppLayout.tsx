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
  const theme = useUIStore(s => s.theme)

  return (
    <div
      data-testid="app-layout"
      data-theme={theme}
      data-layout-variant={variant}
      className="flex h-full max-h-full min-h-0 overflow-hidden bg-background"
    >
      {/* Sidebar — fixed height column; does not scroll with main */}
      <Sidebar variant={variant} />

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar pageTitle={pageTitle} variant={variant} />
        {/* Sole vertical scroll surface for page content */}
        <main
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          data-app-main-scroll
        >
          {contentLayout === 'full' ? (
            <div className="flex min-h-full min-w-0 flex-col">{children}</div>
          ) : (
            <div
              className={cn(
                'min-w-0',
                contentLayout === 'wide' ? contentShellClass.wide : contentShellClass.default,
              )}
            >
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
