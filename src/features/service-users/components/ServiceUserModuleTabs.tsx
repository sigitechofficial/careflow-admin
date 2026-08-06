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

type ModuleTab = {
  id: ServiceUserModuleTabIconId
  label: string
  to?:
    | '/service-users/$serviceUserId/view'
    | '/service-users/$serviceUserId/ecm'
    | '/service-users/$serviceUserId/tasks-planner'
    | '/service-users/$serviceUserId/visit-plan'
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/observations'
    | '/service-users/$serviceUserId/body-map'
    | '/service-users/$serviceUserId/documents'
    | '/service-users/$serviceUserId/activity'
  search?: { layout?: 'wed' | 'thu' | 'simple' | 'classic' }
}

/** Light circle behind glyph exports that omit a filled disc (meds includes its own). */
const MODULE_TAB_CIRCLE_BG: Record<ServiceUserModuleTabIconId, string | null> = {
  overview: '#E8F0FE',
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
}

const MODULE_TABS: ModuleTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    to: '/service-users/$serviceUserId/view',
    search: { layout: 'wed' },
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
  { id: 'alerts', label: 'Alerts' },
  {
    id: 'activity',
    label: 'Activity',
    to: '/service-users/$serviceUserId/activity',
  },
]

function isTabActive(tab: ModuleTab, pathname: string): boolean {
  if (!tab.to) return false
  if (tab.id === 'overview') return /\/service-users\/[^/]+\/view\/?$/.test(pathname)
  if (tab.id === 'ecm') return /\/service-users\/[^/]+\/ecm\/?$/.test(pathname)
  if (tab.id === 'meds') return pathname.includes('/medication')
  if (tab.id === 'observations') return pathname.includes('/observations')
  if (tab.id === 'tasks-planner') return pathname.includes('/tasks-planner')
  if (tab.id === 'visit-plan') return pathname.includes('/visit-plan')
  if (tab.id === 'care-plan') return pathname.includes('/care-plan')
  if (tab.id === 'body-map') return pathname.includes('/body-map')
  if (tab.id === 'documents') return pathname.includes('/documents')
  if (tab.id === 'activity') return pathname.includes('/activity')
  return false
}

function TabContent({ tab, active }: { tab: ModuleTab; active: boolean }) {
  const circleBg = MODULE_TAB_CIRCLE_BG[tab.id]
  const fullTile = circleBg === null

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-sm',
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
  const pathname = useRouterState({ select: s => s.location.pathname })

  return (
    <div className="border-b border-border bg-card">
      <div
        className={cn(
          'flex flex-wrap items-end justify-center gap-4 py-3 sm:gap-6',
          serviceUserModuleShellClass(shellLayout),
        )}
      >
        {MODULE_TABS.map(tab => {
          const active = isTabActive(tab, pathname)
          const content = <TabContent tab={tab} active={active} />

          if (tab.to) {
            return (
              <Link
                key={tab.id}
                to={tab.to}
                params={{ serviceUserId }}
                search={tab.search}
                title={tab.label}
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
