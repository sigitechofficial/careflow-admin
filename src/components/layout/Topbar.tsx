import * as React from 'react'
import { Menu, Search, Sun, Moon, Monitor, Bell } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useUIStore, useNotificationStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

interface TopbarProps {
  pageTitle?: string
  className?: string
}

export function Topbar({ pageTitle, className }: TopbarProps) {
  const navigate = useNavigate()
  const { theme, setTheme, setSidebarMobileOpen } = useUIStore()
  const { notifications, markRead, markAllRead } = useNotificationStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const can = useAuthStore(s => s.can)
  const unread = notifications.filter((n) => !n.read).length

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
      <div className="hidden md:flex flex-1 max-w-sm">
        <Input
          placeholder="Search..."
          leftElement={<Search className="h-3.5 w-3.5" />}
          className="h-8 text-xs bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
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
            <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
              <Sun className="h-4 w-4" /> Light
              {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
              <Moon className="h-4 w-4" /> Dark
              {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
              <Monitor className="h-4 w-4" /> System
              {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  'flex items-start gap-2.5 px-2 py-2.5 cursor-pointer rounded-sm mx-1 my-0.5',
                  'hover:bg-accent transition-colors',
                  !n.read && 'bg-accent/50'
                )}
              >
                <div className={cn(
                  'mt-1 h-2 w-2 rounded-full shrink-0',
                  n.type === 'error' ? 'bg-destructive' :
                  n.type === 'warning' ? 'bg-warning' :
                  n.type === 'success' ? 'bg-success' : 'bg-info'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent transition-colors">
              <UserAvatar name={user?.displayName ?? 'User'} size="sm" />
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium leading-tight">{user?.displayName ?? 'Account'}</span>
                <Badge variant="muted" size="sm" className="mt-0.5 capitalize">{user?.role?.replace('_', ' ') ?? '—'}</Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: '/account' })}>
              Profile & security
            </DropdownMenuItem>
            {can('audit.read') || can('audit_logs.read') ? (
              <DropdownMenuItem onClick={() => navigate({ to: '/admin/audit' })}>
                Audit log
              </DropdownMenuItem>
            ) : null}
            {can('security.admin') && (
              <DropdownMenuItem onClick={() => navigate({ to: '/admin/security' })}>
                Security admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                logout('topbar')
                navigate({ to: '/auth/login' })
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
