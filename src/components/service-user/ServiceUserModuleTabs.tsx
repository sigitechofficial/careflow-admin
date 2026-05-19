import { Link, useRouterState } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  History,
  MessageCircle,
  Pill,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ModuleTab = {
  id: string
  label: string
  Icon: LucideIcon
  to?:
    | '/service-users/$serviceUserId/care-plan'
    | '/service-users/$serviceUserId/medication'
    | '/service-users/$serviceUserId/observations'
  color: string
}

const MODULE_TABS: ModuleTab[] = [
  {
    id: 'observations',
    label: 'Observations',
    Icon: Activity,
    to: '/service-users/$serviceUserId/observations',
    color: '#22c55e',
  },
  { id: 'comms', label: 'Comms', Icon: MessageCircle, color: '#a855f7' },
  {
    id: 'care-plan',
    label: 'Care Plan',
    Icon: ClipboardCheck,
    to: '/service-users/$serviceUserId/care-plan',
    color: '#0ea5e9',
  },
  {
    id: 'meds',
    label: 'Meds',
    Icon: Pill,
    to: '/service-users/$serviceUserId/medication',
    color: '#14b8a6',
  },
  { id: 'history', label: 'History', Icon: History, color: '#1e3a5f' },
  { id: 'body-map', label: 'Body Map', Icon: User, color: '#6b7280' },
  { id: 'alerts', label: 'Alerts', Icon: AlertTriangle, color: '#ef4444' },
]

function isTabActive(tab: ModuleTab, pathname: string): boolean {
  if (!tab.to) return false
  if (tab.id === 'meds') return pathname.includes('/medication')
  if (tab.id === 'observations') return pathname.includes('/observations')
  if (tab.id === 'care-plan') return pathname.includes('/care-plan')
  return false
}

export function ServiceUserModuleTabs({ serviceUserId }: { serviceUserId: string }) {
  const pathname = useRouterState({ select: s => s.location.pathname })

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-center gap-4 px-4 py-3 sm:gap-6">
        {MODULE_TABS.map(tab => {
          const active = isTabActive(tab, pathname)
          const inner = (
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm',
                  active && 'ring-2 ring-offset-2 ring-teal-500',
                )}
                style={{ backgroundColor: tab.color }}
              >
                <tab.Icon className="h-5 w-5" />
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
          if (tab.to) {
            return (
              <Link key={tab.id} to={tab.to} params={{ serviceUserId }} title={tab.label}>
                {inner}
              </Link>
            )
          }
          return (
            <div key={tab.id} className="opacity-60" title={`${tab.label} (coming soon)`}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
