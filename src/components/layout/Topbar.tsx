import { Menu, Search, Sun, Moon, Monitor } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { UserAvatar } from '@/shared/ui/avatar'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Badge } from '@/shared/ui/badge'

import type { LayoutVariant } from '@/components/layout/sidebar-types'

interface TopbarProps {
  pageTitle?: string
  className?: string
  variant?: LayoutVariant
}

export function Topbar({ pageTitle, className, variant = 'admin' }: TopbarProps) {
  const navigate = useNavigate()
  const { theme, setTheme, setSidebarMobileOpen } = useUIStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const can = useAuthStore(s => s.can)
  const isPortal = variant === 'portal'
  const signOutRedirect = isPortal ? '/portal/login' : '/auth/login'
  const profileHref = isPortal ? '/portal/profile' : '/account'

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95',
        'backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4',
        className
      )}
    >
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Page title (mobile) */}
      {pageTitle && (
        <h1 className="font-display font-semibold text-sm text-foreground lg:hidden">
          {pageTitle}
        </h1>
      )}

      {/* Search */}
      {!isPortal && (
      <div className="hidden md:flex flex-1 max-w-sm">
        <Input
          placeholder="Search..."
          leftElement={<Search className="h-3.5 w-3.5" />}
          className="h-8 text-xs bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
        />
      </div>
      )}
      {isPortal && <div className="flex-1" />}

      <div className="ml-auto flex items-center gap-1.5">
        {/* Mobile search */}
        {!isPortal && (
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-4 w-4" />
        </Button>
        )}

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Theme" data-testid="theme-menu-trigger">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="theme-light"
              onClick={() => setTheme('light')}
              className="gap-2"
            >
              <Sun className="h-4 w-4" /> Light
              {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="theme-dark"
              onClick={() => setTheme('dark')}
              className="gap-2"
            >
              <Moon className="h-4 w-4" /> Dark
              {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="theme-system"
              onClick={() => setTheme('system')}
              className="gap-2"
            >
              <Monitor className="h-4 w-4" /> System
              {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!isPortal && <NotificationBell />}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors">
              <UserAvatar name={user?.displayName ?? 'User'} size="sm" />
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium leading-tight">{user?.displayName ?? 'Account'}</span>
                <Badge variant="muted" size="sm" className="mt-0.5 capitalize">
                  {isPortal ? 'Service user' : user?.role?.replace('_', ' ') ?? '—'}
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{isPortal ? 'My portal' : 'My account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: profileHref })}>
              {isPortal ? 'My profile' : 'Profile & security'}
            </DropdownMenuItem>
            {!isPortal && (can('audit.read') || can('audit_logs.read')) ? (
              <DropdownMenuItem onClick={() => navigate({ to: '/admin/audit' })}>
                Audit log
              </DropdownMenuItem>
            ) : null}
            {!isPortal && can('security.admin') && (
              <DropdownMenuItem onClick={() => navigate({ to: '/admin/security' })}>
                Security admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                logout('topbar')
                navigate({ to: signOutRedirect })
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
