import { Menu, Sun, Moon, Monitor, Type, RotateCcw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { useUIStore, DEFAULT_TEXT_SIZE, DEFAULT_TEXT_WEIGHT, type TextSize, type TextWeight } from '@/store/ui.store'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { UserAvatar } from '@/shared/ui/avatar'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { TopbarLocationSelect } from '@/components/layout/TopbarLocationSelect'
import {
  TopbarNavSearch,
  TopbarNavSearchMobile,
} from '@/components/layout/TopbarNavSearch'
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
        // Not a heading: each page has its own single h1, and the tab title names the page.
        <p className="font-display font-semibold text-sm text-foreground lg:hidden">
          {pageTitle}
        </p>
      )}

      {/* Search sidebar tabs / sub-tabs */}
      {!isPortal && <TopbarNavSearch className="hidden md:block" />}
      {isPortal && <div className="flex-1" />}

      <div className="ml-auto flex items-center gap-1.5">
        {!isPortal && <TopbarNavSearchMobile />}

        {!isPortal ? <TopbarLocationSelect /> : null}

        {/* Reading comfort: text size and weight */}
        <TextComfortMenu />

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

const TEXT_SIZE_OPTIONS: Array<{ value: TextSize; label: string; sample: string }> = [
  { value: 'standard', label: 'Standard', sample: 'text-[12px]' },
  { value: 'large', label: 'Large (default)', sample: 'text-[14px]' },
  { value: 'larger', label: 'Larger', sample: 'text-[16px]' },
  { value: 'largest', label: 'Largest', sample: 'text-[19px]' },
]

const TEXT_WEIGHT_OPTIONS: Array<{ value: TextWeight; label: string; sample: string }> = [
  { value: 'standard', label: 'Standard', sample: 'font-normal' },
  { value: 'medium', label: 'Heavier (default)', sample: 'font-medium' },
  { value: 'bold', label: 'Bold', sample: 'font-semibold' },
]

/**
 * Text size and weight for easier reading. Saved in this browser (ui store) and applied
 * across the whole app (store/ui.store.ts + styles/globals.css).
 */
function TextComfortMenu() {
  const textSize = useUIStore(s => s.textSize)
  const textWeight = useUIStore(s => s.textWeight)
  const setTextSize = useUIStore(s => s.setTextSize)
  const setTextWeight = useUIStore(s => s.setTextWeight)
  const reset = useUIStore(s => s.resetTextPreferences)
  const changed = textSize !== DEFAULT_TEXT_SIZE || textWeight !== DEFAULT_TEXT_WEIGHT

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Text size and weight"
          title="Text size and weight"
          data-testid="text-comfort-trigger"
          className="relative"
        >
          <Type className="h-4 w-4" />
          {changed ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Text size</DropdownMenuLabel>
        {TEXT_SIZE_OPTIONS.map(o => (
          <DropdownMenuItem
            key={o.value}
            data-testid={`text-size-${o.value}`}
            onSelect={e => {
              e.preventDefault()
              setTextSize(o.value)
            }}
            className="gap-2"
          >
            <span className={`w-6 text-center font-semibold leading-none ${o.sample}`} aria-hidden>
              A
            </span>
            {o.label}
            {textSize === o.value && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Text weight</DropdownMenuLabel>
        {TEXT_WEIGHT_OPTIONS.map(o => (
          <DropdownMenuItem
            key={o.value}
            data-testid={`text-weight-${o.value}`}
            onSelect={e => {
              e.preventDefault()
              setTextWeight(o.value)
            }}
            className="gap-2"
          >
            <span className={`w-6 text-center text-[15px] leading-none ${o.sample}`} aria-hidden>
              Aa
            </span>
            {o.label}
            {textWeight === o.value && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="text-comfort-reset"
          disabled={!changed}
          onSelect={() => reset()}
          className="gap-2 text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" /> Reset to default
        </DropdownMenuItem>
        <p className="px-2 pb-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">
          Saved in this browser. Your browser zoom still works too.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
