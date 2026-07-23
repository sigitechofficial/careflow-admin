import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Home,
  Users,
  Calendar,
  Settings,
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
  Sparkles,
  Building2,
  MapPin,
  Route,
  CalendarClock,
  Clock,
  Globe,
  PoundSterling,
  Receipt,
  Wallet,
  Banknote,
  ScrollText,
  CircleDollarSign,
  Radio,
  FileBarChart2,
  CalendarOff,
  Landmark,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useUIStore } from '@/store/ui.store'
import { UserAvatar } from '@/shared/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/shared/ui/misc'
import { Badge } from '@/shared/ui/badge'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { Permission } from '@/features/auth/types'
import { useAuthStore } from '@/features/auth/store'
import { CompanyBrandMark } from '@/components/company/CompanyBrandMark'
import { portalNavItems } from '@/features/service-user-portal/portal-nav'
import type { LayoutVariant, NavItem, SubNavItem } from '@/components/layout/sidebar-types'

export type { LayoutVariant, NavItem, SubNavItem } from '@/components/layout/sidebar-types'

function getTitleFromSearch(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'title' in search) {
    const t = (search as { title?: unknown }).title
    return typeof t === 'string' ? t : undefined
  }
  return undefined
}

function navLinkProps(
  label: string,
  href: string,
  ready?: boolean,
  search?: Record<string, string>,
): { to: string; search?: Record<string, string> } {
  if (ready === false) {
    return { to: '/in-progress', search: { title: label } }
  }
  if (search && Object.keys(search).length > 0) {
    return { to: href, search }
  }
  return { to: href }
}

function searchTab(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'tab' in search) {
    const t = (search as { tab?: unknown }).tab
    return typeof t === 'string' ? t : undefined
  }
  return undefined
}

function matchNavTarget(
  label: string,
  href: string,
  ready: boolean | undefined,
  pathname: string,
  search: unknown,
  linkSearch?: Record<string, string>,
): boolean {
  if (ready === false) {
    return pathname === '/in-progress' && getTitleFromSearch(search) === label
  }
  const isExact = pathname === href
  const isNested =
    !isExact &&
    pathname.startsWith(`${href}/`) &&
    href.split('/').filter(Boolean).length >= 2
  if (!isExact && !isNested) return false
  // Billing management hub: active for any setup tab on `/billing`.
  if (href === '/billing' && isExact) return true
  if (linkSearch?.tab) {
    return isExact && searchTab(search) === linkSearch.tab
  }
  if (href === '/settings' && searchTab(search)) {
    return false
  }
  return true
}

const inspectorOnlyNavItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-5 w-5" />, href: '/' },
  {
    label: 'Service Users',
    icon: <Users className="h-5 w-5" />,
    href: '/service-users',
    children: [
      { label: 'All Service Users', icon: <Users className="h-4 w-4" />, href: '/service-users/all', navTestId: 'nav-service-users-all' },
      { label: 'Calendar', icon: <CalendarDays className="h-4 w-4" />, href: '/service-users/calendar', permission: 'service_users.calendar.read', navTestId: 'nav-service-users-calendar' },
    ],
  },
]

/* ─── Nav data ─────────────────────────────────────────────── */
const navItems: NavItem[] = [
  { label: 'Home', icon: <Home className="h-5 w-5" />, href: '/' },
  {
    label: 'Service Users',
    icon: <Users className="h-5 w-5" />,
    href: '/service-users',
    badge: 12,
    children: [
      { label: 'All Service Users',             icon: <Users className="h-4 w-4" />,         href: '/service-users/all', permission: 'service_users.read', navTestId: 'nav-service-users-all' },
      {
        label: 'Service User hours',
        icon: <Clock className="h-4 w-4" />,
        href: '/service-users/hours',
        permission: 'service_users.read',
        navTestId: 'nav-service-user-hours',
      },
      { label: 'Calendar',                      icon: <CalendarDays className="h-4 w-4" />,  href: '/service-users/calendar', permission: 'service_users.calendar.read', navTestId: 'nav-service-users-calendar' },
      {
        label: 'Initial Assessment',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/service-users/initial-assessment',
        permission: 'service_users.initial_assessment.read',
        navTestId: 'nav-service-users-initial-assessment',
      },
      {
        label: 'IA review queue',
        icon: <ShieldCheck className="h-4 w-4" />,
        href: '/initial-assessments/review-queue',
        permission: 'service_users.initial_assessment.review',
        navTestId: 'nav-initial-assessments-review-queue',
      },
      {
        label: 'Assessment review queue',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/assessments/review-queue',
        permission: 'service_users.assessments.read',
        navTestId: 'nav-assessments-review-queue',
      },
      { label: 'Add Service User',              icon: <UserRoundPlus className="h-4 w-4" />, href: '/service-users/add', permission: 'service_users.create', navTestId: 'nav-service-users-add' },
      {
        label: 'Portal access',
        icon: <Globe className="h-4 w-4" />,
        href: '/admin/service-user-portal',
        permission: 'service_users.portal.read',
        navTestId: 'nav-service-user-portal-admin',
      },
    ],
  },
  {
    label: 'Scheduling',
    icon: <Calendar className="h-5 w-5" />,
    href: '/scheduling/view',
    badge: '3',
    badgeVariant: 'warning',
    children: [
      { label: 'View Schedule',          icon: <Eye className="h-4 w-4" />,        href: '/scheduling/view' },
      { label: 'Schedule Jobs',          icon: <Calendar className="h-4 w-4" />,   href: '/scheduling/schedule-jobs' },
      {
        label: 'Bulk generate rota',
        icon: <CalendarClock className="h-4 w-4" />,
        href: '/scheduling/bulk-generate-rota',
        anyPermission: [
          'scheduling.generate_from_visit_plan',
          'schedules.build',
          'scheduled_visits.create',
        ],
      },
      { label: 'View Schedule (Mobile)', icon: <Smartphone className="h-4 w-4" />, href: '/in-progress', ready: false },
      { label: 'Schedule Templates',     icon: <LayoutGrid className="h-4 w-4" />, href: '/scheduling/templates' },
      { label: 'Report',                 icon: <FileText className="h-4 w-4" />,   href: '/scheduling/report' },
      { label: 'Manage Schedule Jobs',   icon: <Settings2 className="h-4 w-4" />,  href: '/scheduling/jobs' },
      { label: 'List View of Schedule',  icon: <List className="h-4 w-4" />,       href: '/scheduling/list' },
      { label: 'Build Schedule',         icon: <Hammer className="h-4 w-4" />,     href: '/scheduling/build' },
    ],
  },
  {
    label: 'Operations',
    icon: <Settings2 className="h-5 w-5" />,
    href: '/in-progress',
    ready: false,
    children: [
      { label: 'Employee Operation Dashboard', icon: <LayoutGrid className="h-4 w-4" />, href: '/in-progress', ready: false },
      { label: 'Service Overview',             icon: <Eye className="h-4 w-4" />,         href: '/in-progress', ready: false },
    ],
  },
  {
    label: 'Employee',
    icon: <UserCheck className="h-5 w-5" />,
    href: '/employee',
    children: [
      { label: 'All Employee', icon: <Users className="h-4 w-4" />, href: '/employee/staff-list', permission: 'employees.read', navTestId: 'nav-employee-staff-list' },
      {
        label: 'Employee hours',
        icon: <Clock className="h-4 w-4" />,
        href: '/employee/hours',
        anyPermission: ['employees.read', 'employees.reports.read'],
        navTestId: 'nav-employee-hours',
      },
      {
        label: 'Absence tracker',
        icon: <CalendarOff className="h-4 w-4" />,
        href: '/employee/absences',
        anyPermission: ['employees.read', 'employees.reports.read'],
        navTestId: 'nav-employee-absences',
      },
      { label: 'Temporary Inspector Login', icon: <UserRoundPlus className="h-4 w-4" />, href: '/employee/temp-inspector', permission: 'employees.read' },
      { label: 'General Employee Documents', icon: <FileText className="h-4 w-4" />, href: '/employee/documents', permission: 'employees.documents.read', navTestId: 'nav-employee-documents' },
      { label: 'Send Message', icon: <PlusCircle className="h-4 w-4" />, href: '/in-progress', ready: false },
      { label: 'Add Employee', icon: <UserRoundPlus className="h-4 w-4" />, href: '/employee/add', permission: 'employees.create', navTestId: 'nav-employee-add' },
    ],
  },
  { label: 'Recruitment',       icon: <UserPlus className="h-5 w-5" />,      href: '/in-progress', ready: false, badge: 5 },
  {
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/in-progress',
    ready: false,
    children: [
      { label: 'Run Report', icon: <TrendingUp className="h-4 w-4" />, href: '/in-progress', ready: false },
    ],
  },
  {
    label: 'ECM',
    icon: <Radio className="h-5 w-5" />,
    href: '/ecm/live',
    children: [
      {
        label: 'Live monitoring',
        icon: <Activity className="h-4 w-4" />,
        href: '/ecm/live',
        anyPermission: ['ecm.read', 'ecm.monitor'],
        navTestId: 'nav-ecm-live',
      },
      {
        label: 'Graph',
        icon: <BarChart3 className="h-4 w-4" />,
        href: '/ecm/graph',
        anyPermission: ['ecm.read', 'ecm.monitor'],
        navTestId: 'nav-ecm-graph',
      },
      {
        label: 'Reports',
        icon: <FileBarChart2 className="h-4 w-4" />,
        href: '/ecm/reports',
        anyPermission: ['ecm.read', 'ecm.reports.export'],
        navTestId: 'nav-ecm-reports',
      },
    ],
  },
  {
    label: 'Billing',
    icon: <PoundSterling className="h-5 w-5" />,
    href: '/billing',
    badge: 18,
    badgeVariant: 'warning',
    children: [
      {
        label: 'Billing management',
        icon: <Receipt className="h-4 w-4" />,
        href: '/billing',
        search: { tab: 'dashboard' },
        navTestId: 'nav-billing-management',
      },
      {
        label: 'Visit reconciliation',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/billing/visit-reconciliation',
        permission: 'billing.visit_reconciliations.read',
        navTestId: 'nav-billing-reconciliation',
      },
      {
        label: 'Visit pay runs',
        icon: <Wallet className="h-4 w-4" />,
        href: '/billing/payroll-runs',
        permission: 'billing.payroll_runs.read',
        navTestId: 'nav-billing-payroll',
      },
      {
        label: 'Salary',
        icon: <CircleDollarSign className="h-4 w-4" />,
        href: '/billing/salary',
        anyPermission: ['billing.payroll_runs.read', 'employees.read', 'employees.update'],
        navTestId: 'nav-billing-salary',
      },
      {
        label: 'Invoice runs',
        icon: <FileText className="h-4 w-4" />,
        href: '/billing/invoice-runs',
        permission: 'billing.invoice_runs.read',
        navTestId: 'nav-billing-invoices',
      },
      {
        label: 'Payments',
        icon: <Banknote className="h-4 w-4" />,
        href: '/billing/payments',
        permission: 'billing.payments.read',
        navTestId: 'nav-billing-payments',
      },
      {
        label: 'Audit & export',
        icon: <ScrollText className="h-4 w-4" />,
        href: '/billing/audit-export',
        navTestId: 'nav-billing-audit-export',
      },
    ],
  },
  {
    label: 'UK Payroll',
    icon: <Landmark className="h-5 w-5" />,
    href: '/payroll',
    children: [
      {
        label: 'Overview',
        icon: <LayoutGrid className="h-4 w-4" />,
        href: '/payroll',
        anyPermission: [
          'payroll.settings.read',
          'payroll.runs.read',
          'payroll.employees.read',
        ],
        navTestId: 'nav-payroll-overview',
      },
      {
        label: 'Tax years',
        icon: <CalendarDays className="h-4 w-4" />,
        href: '/payroll/tax-years',
        permission: 'payroll.settings.read',
        navTestId: 'nav-payroll-tax-years',
      },
      {
        label: 'Schedules & periods',
        icon: <CalendarClock className="h-4 w-4" />,
        href: '/payroll/schedules',
        anyPermission: ['payroll.settings.read', 'payroll.periods.read'],
        navTestId: 'nav-payroll-schedules',
      },
      {
        label: 'Employee setup',
        icon: <Users className="h-4 w-4" />,
        href: '/payroll/employees',
        permission: 'payroll.employees.read',
        navTestId: 'nav-payroll-employees',
      },
      {
        label: 'UK payroll runs',
        icon: <Wallet className="h-4 w-4" />,
        href: '/payroll/runs',
        permission: 'payroll.runs.read',
        navTestId: 'nav-payroll-runs',
      },
    ],
  },
  {
    label: 'Accident & Incident',
    icon: <AlertTriangle className="h-5 w-5" />,
    href: '/accidents-incidents/view',
    badge: 2,
    badgeVariant: 'destructive',
    children: [
      { label: 'View Accidents & Incidents', icon: <Eye className="h-4 w-4" />, href: '/accidents-incidents/view' },
      { label: 'Raise Accidents/Incidents', icon: <PlusCircle className="h-4 w-4" />, href: '/accidents-incidents/raise' },
    ],
  },
  { label: 'Policies',          icon: <BookOpen className="h-5 w-5" />,      href: '/in-progress', ready: false },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
    children: [
      {
        label: 'Company Details',
        icon: <Building2 className="h-4 w-4" />,
        href: '/settings/company',
        permission: 'lookups.read',
        navTestId: 'nav-settings-company',
      },
      {
        label: 'General Settings',
        icon: <Settings2 className="h-4 w-4" />,
        href: '/settings/general',
        permission: 'lookups.read',
        navTestId: 'nav-settings-general',
      },
      { label: 'Lookup data', icon: <Settings2 className="h-4 w-4" />, href: '/settings', permission: 'lookups.read', navTestId: 'nav-settings' },
      {
        label: 'Tasks planner',
        icon: <ClipboardList className="h-4 w-4" />,
        href: '/settings',
        search: { tab: 'tasks-planner' },
        permission: 'lookups.read',
        navTestId: 'nav-settings-tasks-planner',
      },
      {
        label: 'Location Management',
        icon: <MapPin className="h-4 w-4" />,
        href: '/settings/location-management',
        search: { sub: 'zones' },
        permission: 'lookups.read',
        navTestId: 'nav-settings-location-management',
      },
      {
        label: 'Care Pathway',
        icon: <Route className="h-4 w-4" />,
        href: '/settings/care-pathway',
        search: { tab: 'wizard' },
        permission: 'care_pathway.read',
        navTestId: 'nav-settings-care-pathway',
      },
    ],
  },
  { label: 'UI Showcase',       icon: <Sparkles className="h-5 w-5" />,      href: '/showcase' },
  {
    label: 'Administration',
    icon: <Shield className="h-5 w-5" />,
    href: '/admin/audit',
    children: [
      {
        label: 'Audit log',
        icon: <FileText className="h-4 w-4" />,
        href: '/admin/audit',
        anyPermission: ['audit.read', 'audit_logs.read'],
        navTestId: 'nav-admin-audit',
      },
      {
        label: 'Service user portal',
        icon: <Globe className="h-4 w-4" />,
        href: '/admin/service-user-portal',
        permission: 'service_users.portal.read',
        navTestId: 'nav-admin-service-user-portal',
      },
      { label: 'Security', icon: <ShieldCheck className="h-4 w-4" />, href: '/admin/security', permission: 'security.admin' },
    ],
  },
]

function filterNavByPermission(items: NavItem[], can: (p: Permission) => boolean): NavItem[] {
  return items
    .map((item) => {
      if (!item.children?.length) return item
      const children = item.children.filter(ch => {
        if (ch.anyPermission?.length) return ch.anyPermission.some(p => can(p))
        return !ch.permission || can(ch.permission)
      })
      return { ...item, children }
    })
    .filter(item => !item.children?.length || item.children.length > 0)
}

const COLLAPSED_FLYOUT_CLOSE_MS = 120

interface NavChildLinkProps {
  child: SubNavItem
  pathname: string
  search: unknown
  onNavigate: () => void
}

function NavChildLink({ child, pathname, search, onNavigate }: NavChildLinkProps) {
  const childActive = matchNavTarget(
    child.label,
    child.href,
    child.ready,
    pathname,
    search,
    child.search,
  )
  return (
    <Link
      {...navLinkProps(child.label, child.href, child.ready, child.search)}
      onClick={onNavigate}
      data-testid={child.navTestId}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        childActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
      )}
    >
      <span className={cn('shrink-0', childActive && 'text-sidebar-primary')}>{child.icon}</span>
      <span className="flex-1 text-left truncate">{child.label}</span>
    </Link>
  )
}

interface CollapsedSidebarItemProps {
  item: NavItem
  isActive: boolean
  pathname: string
  search: unknown
  onNavigate: () => void
}

function CollapsedSidebarItem({ item, isActive, pathname, search, onNavigate }: CollapsedSidebarItemProps) {
  const hasChildren = !!item.children?.length
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = undefined
    }
  }, [])

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({ top: rect.top, left: rect.right + 6 })
  }, [])

  const handleOpen = React.useCallback(() => {
    clearCloseTimer()
    updatePosition()
    setOpen(true)
  }, [clearCloseTimer, updatePosition])

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), COLLAPSED_FLYOUT_CLOSE_MS)
  }, [clearCloseTimer])

  React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  React.useEffect(() => {
    if (!open) return
    const onUpdate = () => updatePosition()
    window.addEventListener('scroll', onUpdate, true)
    window.addEventListener('resize', onUpdate)
    return () => {
      window.removeEventListener('scroll', onUpdate, true)
      window.removeEventListener('resize', onUpdate)
    }
  }, [open, updatePosition])

  if (!hasChildren) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link {...navLinkProps(item.label, item.href, item.ready)} onClick={onNavigate} className="block">
            <NavButton item={item} isActive={isActive} collapsed />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <Badge variant={item.badgeVariant ?? 'default'} size="sm">{item.badge}</Badge>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  const flyout =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed z-[60]"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={handleOpen}
            onMouseLeave={scheduleClose}
            data-testid={`sidebar-flyout-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {/* Invisible bridge so pointer can move from icon to menu */}
            <div className="-ml-2 pl-2">
              <div className="min-w-[13.5rem] rounded-lg border border-sidebar-border bg-sidebar py-1.5 shadow-lg">
                <p className="mb-1 border-b border-sidebar-border px-3 pb-1.5 text-xs font-semibold text-sidebar-foreground">
                  {item.label}
                </p>
                <ul className="space-y-0.5 px-1">
                  {item.children!.map(child => (
                    <li key={child.label}>
                      <NavChildLink
                        child={child}
                        pathname={pathname}
                        search={search}
                        onNavigate={() => {
                          onNavigate()
                          setOpen(false)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={handleOpen}
        onMouseLeave={scheduleClose}
      >
        <NavButton item={item} isActive={isActive} collapsed hasChildren />
      </div>
      {flyout}
    </>
  )
}

/* ─── Sidebar ──────────────────────────────────────────────── */
export function Sidebar({ variant = 'admin' }: { variant?: LayoutVariant }) {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUIStore()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { pathname, search } = location
  const searchKey = React.useMemo(() => JSON.stringify(search ?? {}), [search])
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const can = useAuthStore(s => s.can)
  const isPortal = variant === 'portal'
  const navSource = isPortal
    ? portalNavItems
    : user?.role === 'temporary_inspector'
      ? inspectorOnlyNavItems
      : navItems
  const navItemsFiltered = React.useMemo(
    () => (isPortal ? navSource : filterNavByPermission(navSource, can)),
    [can, isPortal, navSource],
  )
  const signOutRedirect = isPortal ? '/portal/login' : '/auth/login'
  const accountHref = isPortal ? '/portal/profile' : '/account'

  // Track which parent groups are open — open a group when its child route is active
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      for (const item of navSource) {
        if (item.children?.some(c => matchNavTarget(c.label, c.href, c.ready, pathname, search, c.search))) {
          next.add(item.label)
        }
      }
      return next
    })
  }, [pathname, searchKey, navSource])

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupLabel)) next.delete(groupLabel)
      else next.add(groupLabel)
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
        data-testid="sidebar"
        data-collapsed={sidebarCollapsed ? 'true' : 'false'}
        className={cn(
          'z-50 flex h-full max-h-full min-h-0 shrink-0 flex-col bg-sidebar border-r border-sidebar-border',
          'sidebar-transition',
          /* Mobile: overlay drawer. Desktop: in-flow column that stays put while main scrolls. */
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]',
          sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo / Brand */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3 overflow-hidden')}>
          <CompanyBrandMark collapsed={sidebarCollapsed} className="min-w-0 flex-1" />
          <button className="ml-auto shrink-0 text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setSidebarMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          <ul className="flex flex-col gap-0.5">
            {navItemsFiltered.map((item) => {
              const hasChildren = !!item.children?.length
              const isActive = hasChildren
                ? item.children!.some(c => matchNavTarget(c.label, c.href, c.ready, pathname, search, c.search))
                : matchNavTarget(item.label, item.href, item.ready, pathname, search)
              const isOpen = openGroups.has(item.label)

              return (
                <li key={item.label}>
                  {sidebarCollapsed ? (
                    <CollapsedSidebarItem
                      item={item}
                      isActive={!!isActive}
                      pathname={pathname}
                      search={search}
                      onNavigate={handleNav}
                    />
                  ) : hasChildren ? (
                    /* ── Expanded: collapsible group ── */
                    <div>
                      <NavButton
                        item={item}
                        isActive={!!isActive}
                        isOpen={isOpen}
                        hasChildren
                        onClick={() => toggleGroup(item.label)}
                      />
                      {isOpen && (
                        <ul className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5 pb-1">
                          {item.children!.map(child => (
                            <li key={child.label}>
                              <NavChildLink
                                child={child}
                                pathname={pathname}
                                search={search}
                                onNavigate={handleNav}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    /* ── Expanded: plain link ── */
                    <Link {...navLinkProps(item.label, item.href, item.ready)} onClick={handleNav} className="block">
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
            type="button"
            data-testid="sidebar-collapse-button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
            className={cn(
              'w-full hidden lg:flex items-center rounded-md px-2 py-1.5',
              'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'transition-colors text-sm gap-2',
              sidebarCollapsed && 'justify-center'
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <><ChevronLeft className="h-5 w-5" /><span className="text-sm animate-fade-in">Collapse</span></>
            )}
          </button>

          <Link
            to={accountHref}
            onClick={handleNav}
            className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2', 'hover:bg-sidebar-accent cursor-pointer transition-colors group', sidebarCollapsed && 'justify-center px-1')}
          >
            <UserAvatar name={user?.displayName ?? 'Guest'} size="sm" online={!!user} className="shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">{user?.displayName ?? 'Sign in'}</p>
                <p className="text-xs text-sidebar-foreground/75 truncate leading-tight">
                  {isPortal ? 'My care portal' : user?.jobTitle ?? user?.role ?? ''}
                </p>
              </div>
            )}
            {!sidebarCollapsed && <LogOut className="h-4 w-4 text-sidebar-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
          </Link>
          <button
            type="button"
            data-testid="sidebar-sign-out-button"
            onClick={() => {
              logout('sidebar')
              navigate({ to: signOutRedirect })
            }}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/90',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
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
        'w-full flex items-center gap-3 rounded-md text-base transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 h-10',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
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
            <ChevronRight className={cn('h-4 w-4 text-sidebar-foreground/80 shrink-0 transition-transform', isOpen && 'rotate-90')} />
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
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">{unread}</span>
      )}
    </button>
  )
}
