import * as React from 'react'
import {
  Home,
  Users,
  Calendar,
  Settings2,
  UserCheck,
  UserPlus,
  BarChart3,
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  X,
  Stethoscope,
  ClipboardList,
  UserRoundPlus,
  LayoutGrid,
  Smartphone,
  FileText,
  List,
  Hammer,
  CalendarDays,
  PlusCircle,
  Eye,
  ShieldCheck,
  Star,
  Award,
  Activity,
  TrendingUp,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { UserAvatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/misc'
import { Badge } from '@/components/ui/badge'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { Permission } from '@/auth/types'
import { useAuthStore } from '@/store/auth.store'

/* ─── Types ────────────────────────────────────────────────── */
interface SubNavItem {
  label: string
  icon: React.ReactNode
  href: string
  /** If set, submenu is only shown when the user has this permission. */
  permission?: Permission
}

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string | number
  badgeVariant?: 'default' | 'destructive' | 'warning' | 'success'
  children?: SubNavItem[]
}

const inspectorOnlyNavItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-4 w-4" />, href: '/' },
  {
    label: 'Service Users',
    icon: <Users className="h-4 w-4" />,
    href: '/service-users',
    children: [
      { label: 'All Service Users', icon: <Users className="h-3.5 w-3.5" />, href: '/service-users/all' },
      { label: 'Calendar', icon: <CalendarDays className="h-3.5 w-3.5" />, href: '/service-users/calendar' },
    ],
  },
]

/* ─── Nav data ─────────────────────────────────────────────── */
const navItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-4 w-4" />, href: '/' },
  {
    label: 'Service Users',
    icon: <Users className="h-4 w-4" />,
    href: '/service-users',
    badge: 12,
    children: [
      { label: 'All Service Users',             icon: <Users className="h-3.5 w-3.5" />,         href: '/service-users/all' },
      { label: 'Calendar',                      icon: <CalendarDays className="h-3.5 w-3.5" />,  href: '/service-users/calendar' },
      { label: 'Initial Assessment Checklist',  icon: <ClipboardList className="h-3.5 w-3.5" />, href: '/showcase' },
      { label: 'Add Service User',              icon: <UserRoundPlus className="h-3.5 w-3.5" />, href: '/service-users/add' },
    ],
  },
  {
    label: 'Scheduling',
    icon: <Calendar className="h-4 w-4" />,
    href: '/scheduling/view',
    badge: '3',
    badgeVariant: 'warning',
    children: [
      { label: 'View Schedule',          icon: <Eye className="h-3.5 w-3.5" />,        href: '/scheduling/view' },
      { label: 'View Schedule (Mobile)', icon: <Smartphone className="h-3.5 w-3.5" />, href: '/showcase' },
      { label: 'Schedule Templates',     icon: <LayoutGrid className="h-3.5 w-3.5" />, href: '/showcase' },
      { label: 'Report',                 icon: <FileText className="h-3.5 w-3.5" />,   href: '/scheduling/report' },
      { label: 'Manage Schedule Jobs',   icon: <Settings2 className="h-3.5 w-3.5" />,  href: '/scheduling/jobs' },
      { label: 'List View of Schedule',  icon: <List className="h-3.5 w-3.5" />,       href: '/showcase' },
      { label: 'Build Schedule',         icon: <Hammer className="h-3.5 w-3.5" />,     href: '/showcase' },
    ],
  },
  {
    label: 'Operations',
    icon: <Settings2 className="h-4 w-4" />,
    href: '/showcase',
    children: [
      { label: 'Employee Operation Dashboard', icon: <LayoutGrid className="h-3.5 w-3.5" />, href: '/showcase' },
      { label: 'Service Overview',             icon: <Eye className="h-3.5 w-3.5" />,         href: '/showcase' },
    ],
  },
  {
    label: 'Employee',
    icon: <UserCheck className="h-4 w-4" />,
    href: '/employee',
    children: [
      { label: 'All Employee', icon: <Users className="h-3.5 w-3.5" />, href: '/employee/staff-list', permission: 'employees.read' },
      { label: 'Temporary Inspector Login', icon: <UserRoundPlus className="h-3.5 w-3.5" />, href: '/employee/temp-inspector', permission: 'employees.read' },
      { label: 'General Employee Documents', icon: <FileText className="h-3.5 w-3.5" />, href: '/employee/documents', permission: 'employees.documents.read' },
      { label: 'Send Message', icon: <PlusCircle className="h-3.5 w-3.5" />, href: '/showcase' },
      { label: 'Add Employee', icon: <UserRoundPlus className="h-3.5 w-3.5" />, href: '/employee/add', permission: 'employees.create' },
    ],
  },
  { label: 'Recruitment',       icon: <UserPlus className="h-4 w-4" />,      href: '/showcase', badge: 5 },
  {
    label: 'Reports',
    icon: <BarChart3 className="h-4 w-4" />,
    href: '/showcase',
    children: [
      { label: 'Run Report', icon: <TrendingUp className="h-3.5 w-3.5" />, href: '/showcase' },
    ],
  },
  {
    label: 'Accident & Incident',
    icon: <AlertTriangle className="h-4 w-4" />,
    href: '/accidents-incidents/view',
    badge: 2,
    badgeVariant: 'destructive',
    children: [
      { label: 'View Accidents & Incidents', icon: <Eye className="h-3.5 w-3.5" />, href: '/accidents-incidents/view' },
      { label: 'Raise Accidents/Incidents', icon: <PlusCircle className="h-3.5 w-3.5" />, href: '/accidents-incidents/raise' },
    ],
  },
  { label: 'Policies',          icon: <BookOpen className="h-4 w-4" />,      href: '/showcase' },
  {
    label: 'Administration',
    icon: <Shield className="h-4 w-4" />,
    href: '/admin/audit',
    children: [
      { label: 'Audit log', icon: <FileText className="h-3.5 w-3.5" />, href: '/admin/audit', permission: 'audit.read' },
      { label: 'Security', icon: <ShieldCheck className="h-3.5 w-3.5" />, href: '/admin/security', permission: 'security.admin' },
    ],
  },
]

function filterNavByPermission(items: NavItem[], can: (p: Permission) => boolean): NavItem[] {
  return items
    .map((item) => {
      if (!item.children?.length) return item
      const children = item.children.filter(ch => !ch.permission || can(ch.permission))
      return { ...item, children }
    })
    .filter(item => !item.children?.length || item.children.length > 0)
}

/* ─── Sidebar ──────────────────────────────────────────────── */
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()
  const navigate = useNavigate()
  const activeHref = useRouterState({ select: (s) => s.location.pathname })
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const can = useAuthStore(s => s.can)
  const navSource = user?.role === 'temporary_inspector' ? inspectorOnlyNavItems : navItems
  const navItemsFiltered = React.useMemo(() => filterNavByPermission(navSource, can), [can, navSource])

  // Track which parent groups are open — open a group when its child route is active
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      for (const item of navSource) {
        if (item.children?.some(c => c.href === activeHref)) next.add(item.href)
      }
      return next
    })
  }, [activeHref, navSource])

  const toggleGroup = (href: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(href) ? next.delete(href) : next.add(href)
      return next
    })
  }

  const handleNav = () => {
    setSidebarMobileOpen(false)
  }

  // When sidebar collapses, close all open groups
  React.useEffect(() => {
    if (sidebarCollapsed) setOpenGroups(new Set())
  }, [sidebarCollapsed])

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col bg-sidebar border-r border-sidebar-border',
          'sidebar-transition',
          'lg:relative lg:z-auto',
          sidebarCollapsed ? 'w-[60px]' : 'w-[240px]',
          'lg:translate-x-0',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / Brand */}
        <div className={cn('flex items-center h-14 border-b border-sidebar-border shrink-0 px-3 gap-3 overflow-hidden')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="font-display font-bold text-sm text-sidebar-foreground truncate leading-tight">CareAdmin</span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">Care Management</span>
            </div>
          )}
          <button className="ml-auto lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          <ul className="flex flex-col gap-0.5">
            {navItemsFiltered.map((item) => {
              const isActive = activeHref === item.href || item.children?.some(c => c.href === activeHref)
              const isOpen = openGroups.has(item.href)
              const hasChildren = !!item.children?.length

              return (
                <li key={`${item.href}-${item.label}`}>
                  {sidebarCollapsed ? (
                    /* ── Collapsed: tooltip only, no sub-nav ── */
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link to={item.href} onClick={handleNav} className="block">
                          <NavButton
                            item={item}
                            isActive={!!isActive}
                            collapsed
                          />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <Badge variant={item.badgeVariant ?? 'default'} size="sm">{item.badge}</Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : hasChildren ? (
                    /* ── Expanded: collapsible group ── */
                    <div>
                      <NavButton
                        item={item}
                        isActive={!!isActive}
                        isOpen={isOpen}
                        hasChildren
                        onClick={() => toggleGroup(item.href)}
                      />
                      {isOpen && (
                        <ul className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5 pb-1">
                          {item.children!.map(child => {
                            const childActive = activeHref === child.href
                            return (
                              <li key={`${child.href}-${child.label}`}>
                                <Link
                                  to={child.href}
                                  onClick={handleNav}
                                  className={cn(
                                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                                    childActive
                                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                                  )}
                                >
                                  <span className={cn('shrink-0', childActive && 'text-sidebar-primary')}>
                                    {child.icon}
                                  </span>
                                  <span className="flex-1 text-left truncate">{child.label}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    /* ── Expanded: plain link ── */
                    <Link to={item.href} onClick={handleNav} className="block">
                      <NavButton
                        item={item}
                        isActive={!!isActive}
                      />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full hidden lg:flex items-center rounded-md px-2 py-1.5',
              'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'transition-colors text-sm gap-2',
              sidebarCollapsed && 'justify-center'
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <><ChevronLeft className="h-4 w-4" /><span className="text-xs animate-fade-in">Collapse</span></>
            )}
          </button>

          <Link
            to="/account"
            onClick={handleNav}
            className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2', 'hover:bg-sidebar-accent cursor-pointer transition-colors group', sidebarCollapsed && 'justify-center px-1')}
          >
            <UserAvatar name={user?.displayName ?? 'Guest'} size="sm" online={!!user} className="shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-xs font-medium text-sidebar-foreground truncate leading-tight">{user?.displayName ?? 'Sign in'}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.jobTitle ?? user?.role ?? ''}</p>
              </div>
            )}
            {!sidebarCollapsed && <LogOut className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </Link>
          <button
            type="button"
            onClick={() => {
              logout('sidebar')
              navigate({ to: '/auth/login' })
            }}
            className={cn(
              'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

/* ─── NavButton ────────────────────────────────────────────── */
interface NavButtonProps {
  item: NavItem
  isActive: boolean
  collapsed?: boolean
  hasChildren?: boolean
  isOpen?: boolean
  onClick?: () => void
}

function NavButton({ item, isActive, collapsed, hasChildren, isOpen, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'w-full flex items-center gap-2.5 rounded-md text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}
    >
      <span className={cn('shrink-0', isActive && 'text-sidebar-primary')}>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && !hasChildren && (
            <Badge variant={item.badgeVariant ?? 'muted'} size="sm" className="shrink-0 ml-auto">{item.badge}</Badge>
          )}
          {hasChildren && (
            <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', isOpen && 'rotate-90')} />
          )}
        </>
      )}
    </button>
  )
}

/* ─── Notification Bell ──────────────────────────────────── */
export function NotificationBell() {
  const notifications = [{ id: '1', read: false }, { id: '2', read: false }]
  const unread = notifications.filter(n => !n.read).length
  return (
    <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">{unread}</span>
      )}
    </button>
  )
}
