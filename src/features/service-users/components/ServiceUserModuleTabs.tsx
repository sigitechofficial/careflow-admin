import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { FigmaActionIcon } from '@/features/service-users/components/FigmaActionIcon'
import {
  serviceUserModuleShellClass,
  type ServiceUserModuleShellLayout,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import {
  figmaModuleTabIcon,
  type ServiceUserModuleTabIconId,
} from '@/features/service-users/figma-action-icons'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'

type ModuleTab = {
  id: ServiceUserModuleTabIconId
  label: string
  to?:
    | '/service-users/$serviceUserId/profile'
    | '/service-users/$serviceUserId/view'
    | '/service-users/$serviceUserId/invoices'
    | '/service-users/$serviceUserId/ecm'
    | '/service-users/$serviceUserId/tasks-planner'
    | '/service-users/$serviceUserId/visit-plan'
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/observations'
    | '/service-users/$serviceUserId/body-map'
    | '/service-users/$serviceUserId/documents'
    | '/service-users/$serviceUserId/activity'
    | '/service-users/$serviceUserId/alerts'
    | '/service-users/$serviceUserId/initial-assessment'
    | '/service-users/$serviceUserId'
  search?: Record<string, string>
  /** When set, tab is hidden unless the user has this permission. */
  permission?: Permission
}

/** Light circle behind glyph exports that omit a filled disc (meds includes its own). */
const MODULE_TAB_CIRCLE_BG: Record<ServiceUserModuleTabIconId, string | null> = {
  profile: null,
  overview: '#E8F0FE',
  invoices: '#E8F7EE',
  ecm: '#FEF3E8',
  observations: '#E8F5F2',
  comms: '#F4EDF9',
  'tasks-planner': '#EEF2FF',
  'visit-plan': null,
  'care-plan': '#E9F7FE',
  meds: null,
  documents: '#FEF9E8',
  history: '#EDF3FE',
  'body-map': '#F1F2F3',
  alerts: '#FEEEEE',
  activity: '#E8F5F2',
  'initial-assessment': '#EEF2FF',
  flash: null,
  'service-management': null,
  calendar: null,
  absence: null,
}

export const SERVICE_USER_MODULE_TABS: ModuleTab[] = [
  {
    id: 'profile',
    label: 'Profile',
    to: '/service-users/$serviceUserId/profile',
  },
  {
    id: 'overview',
    label: 'Overview',
    to: '/service-users/$serviceUserId/view',
  },
  {
    id: 'initial-assessment',
    label: 'Initial Assessment',
    to: '/service-users/$serviceUserId/initial-assessment',
    permission: 'service_users.initial_assessment.read',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    to: '/service-users/$serviceUserId/invoices',
  },
  {
    id: 'ecm',
    label: 'ECM',
    to: '/service-users/$serviceUserId/ecm',
  },
  {
    id: 'observations',
    label: 'Observations',
    to: '/service-users/$serviceUserId/observations',
  },
  { id: 'comms', label: 'Comms' },
  {
    id: 'tasks-planner',
    label: 'Tasks Planner',
    to: '/service-users/$serviceUserId/tasks-planner',
  },
  {
    id: 'visit-plan',
    label: 'Visit Plan',
    to: '/service-users/$serviceUserId/visit-plan',
  },
  {
    id: 'care-plan',
    label: 'Care Plan',
    to: '/service-users/$serviceUserId/care-plan',
  },
  {
    id: 'meds',
    label: 'Meds',
    to: '/service-users/$serviceUserId/medication',
  },
  {
    id: 'documents',
    label: 'Documents',
    to: '/service-users/$serviceUserId/documents',
  },
  {
    id: 'body-map',
    label: 'Body Map',
    to: '/service-users/$serviceUserId/body-map',
  },
  {
    id: 'alerts',
    label: 'Medical Alerts',
    to: '/service-users/$serviceUserId/alerts',
  },
  {
    id: 'activity',
    label: 'Activity',
    to: '/service-users/$serviceUserId/activity',
  },
  {
    id: 'flash',
    label: 'Flash Message',
    to: '/service-users/$serviceUserId/view',
    search: { focus: 'flash' },
  },
  {
    id: 'service-management',
    label: 'Service Mgmt',
    to: '/service-users/$serviceUserId',
    search: { tab: 'dom' },
  },
  {
    id: 'calendar',
    label: 'Calendar',
    to: '/service-users/$serviceUserId',
    search: { tab: 'calendar' },
  },
  {
    id: 'absence',
    label: 'Absence',
    to: '/service-users/$serviceUserId',
    search: { tab: 'absences' },
  },
]

export function isServiceUserModuleTabActive(tab: ModuleTab, pathname: string): boolean {
  if (!tab.to) return false
  if (tab.id === 'profile') return /\/service-users\/[^/]+\/profile\/?$/.test(pathname)
  if (tab.id === 'overview') return /\/service-users\/[^/]+\/view\/?$/.test(pathname)
  if (tab.id === 'initial-assessment') return pathname.includes('/initial-assessment')
  if (tab.id === 'invoices') return /\/service-users\/[^/]+\/invoices\/?$/.test(pathname)
  if (tab.id === 'ecm') return /\/service-users\/[^/]+\/ecm\/?$/.test(pathname)
  if (tab.id === 'meds') return pathname.includes('/medication')
  if (tab.id === 'observations') return pathname.includes('/observations')
  if (tab.id === 'tasks-planner') return pathname.includes('/tasks-planner')
  if (tab.id === 'visit-plan') return pathname.includes('/visit-plan')
  if (tab.id === 'care-plan') return pathname.includes('/care-plan')
  if (tab.id === 'body-map') return pathname.includes('/body-map')
  if (tab.id === 'documents') return pathname.includes('/documents')
  if (tab.id === 'activity') return pathname.includes('/activity')
  if (tab.id === 'alerts') return /\/service-users\/[^/]+\/alerts\/?$/.test(pathname)
  return false
}

function TabContent({
  tab,
  active,
}: {
  tab: ModuleTab
  active: boolean
}) {
  const circleBg = MODULE_TAB_CIRCLE_BG[tab.id]
  const fullTile = circleBg === null

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          'relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-sm',
          active && 'ring-2 ring-teal-500 ring-offset-2',
        )}
        style={circleBg ? { backgroundColor: circleBg } : undefined}
      >
        <FigmaActionIcon
          src={figmaModuleTabIcon(tab.id)}
          title={tab.label}
          className={fullTile ? 'h-11 w-11' : 'h-10 w-10'}
        />
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          active
            ? 'text-teal-700 underline decoration-2 underline-offset-4 dark:text-teal-300'
            : 'text-muted-foreground',
        )}
      >
        {tab.label}
      </span>
    </div>
  )
}

export function ServiceUserModuleTabs({
  serviceUserId,
  shellLayout = 'default',
}: {
  serviceUserId: string
  shellLayout?: ServiceUserModuleShellLayout
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const can = useAuthStore((s) => s.can)

  return (
    <div className="border-b border-border bg-card overflow-x-auto">
      <div
        className={cn(
          'flex flex-nowrap items-end gap-4 py-3 px-4 sm:gap-6 sm:px-6 min-w-max',
          serviceUserModuleShellClass(shellLayout),
        )}
      >
        {SERVICE_USER_MODULE_TABS.map((tab) => {
          if (tab.permission && !can(tab.permission)) return null
          if (tab.id === 'alerts' && !can('service_users.read')) return null
          const active = isServiceUserModuleTabActive(tab, pathname)
          const content = <TabContent tab={tab} active={active} />

          if (tab.to) {
            return (
              <Link
                key={tab.id}
                to={tab.to}
                params={{ serviceUserId }}
                search={tab.search}
                title={tab.label}
                data-testid={`su-module-tab-${tab.id}`}
              >
                {content}
              </Link>
            )
          }
          return (
            <div key={tab.id} className="opacity-60" title={`${tab.label} (coming soon)`}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
