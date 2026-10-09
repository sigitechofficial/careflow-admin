import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { illustrationSrc } from '@/components/layout/nav-illustrations'

export type QuickSelectListId = 'all' | 'active' | 'discharged' | 'deleted'

export type QuickSelectRiskId = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const LEGACY_TOOLTIP_CLASS =
  'max-w-[12rem] rounded-sm border-0 bg-neutral-900 px-3 py-2 text-center text-xs font-normal leading-snug text-white shadow-lg'

/**
 * Colourful illustrations (Fluent Emoji, same set as the navigation), chosen for what each filter
 * actually does. As in the original design, the ring colour carries the status / risk level.
 *   person filters  → who is in the list (all / active / discharged)
 *   heart in hands  → care risk profile; ring uses the same colours as the risk ring on each
 *                     service user's photo in the list (ServiceUsersPage RISK_BORDER)
 *   care worker 🚫  → no key worker assigned
 */
type FilterArt = { name: string; ring: string; badge?: string }

const ART = {
  all: { name: 'busts-in-silhouette', ring: 'border-slate-300' },
  active: { name: 'older-person', ring: 'border-emerald-400' },
  discharged: { name: 'door', ring: 'border-slate-400' },
  LOW: { name: 'heart-hands', ring: 'border-[#2a9d8f]' },
  MEDIUM: { name: 'heart-hands', ring: 'border-[#e9a825]' },
  HIGH: { name: 'heart-hands', ring: 'border-[#e11d48]' },
  CRITICAL: { name: 'heart-hands', ring: 'border-[#7f1d1d]' },
  noKeyWorker: { name: 'woman-health-worker', ring: 'border-slate-300', badge: 'no-entry' },
  onHold: { name: 'pause-button', ring: 'border-slate-300' },
  deleted: { name: 'wastebasket', ring: 'border-slate-300' },
} satisfies Record<string, FilterArt>

function filterBtnClass(ring: string, active?: boolean) {
  return cn(
    'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-card p-0',
    'transition-all duration-150 hover:-translate-y-px hover:shadow-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1',
    ring,
    active && 'bg-[#4db8c8]/10 shadow-md ring-2 ring-[#4db8c8] ring-offset-1',
  )
}

function QuickDivider() {
  return <span className="mx-0.5 hidden h-7 w-px shrink-0 bg-border/90 sm:inline-block" aria-hidden />
}

function QuickSelectTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className={LEGACY_TOOLTIP_CLASS}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function IllustrationFilterBtn({
  tooltip,
  active,
  disabled,
  onClick,
  testId,
  art,
}: {
  tooltip: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  testId?: string
  art: FilterArt
}) {
  const button = (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={active}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      className={cn(filterBtnClass(art.ring, active), disabled && 'pointer-events-none opacity-40')}
    >
      <img
        src={illustrationSrc(art.name)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-[22px] w-[22px] select-none object-contain"
      />
      {art.badge ? (
        <img
          src={illustrationSrc(art.badge)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 select-none rounded-full bg-card object-contain"
        />
      ) : null}
    </button>
  )
  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

const PERSON_FILTERS: { id: QuickSelectListId; tooltip: string }[] = [
  { id: 'all', tooltip: 'All service users (including inactive)' },
  { id: 'active', tooltip: 'Active service users' },
  { id: 'discharged', tooltip: 'Discharged service users' },
]

const RISK_FILTERS: { id: QuickSelectRiskId; tooltip: string }[] = [
  { id: 'LOW', tooltip: 'Low risk profile' },
  { id: 'MEDIUM', tooltip: 'Medium risk profile' },
  { id: 'HIGH', tooltip: 'High risk profile' },
  { id: 'CRITICAL', tooltip: 'Critical risk profile' },
]

export type ServiceUserQuickSelectBarProps = {
  listFilter: QuickSelectListId | null
  onListFilterChange: (id: QuickSelectListId) => void
  riskFilter: QuickSelectRiskId | null
  onRiskFilterChange: (id: QuickSelectRiskId | null) => void
  unassignedOnly: boolean
  onUnassignedOnlyChange: (value: boolean) => void
  onHoldOnly: boolean
  onOnHoldOnlyChange: (value: boolean) => void
  disabled?: boolean
}

export function ServiceUserQuickSelectBar({
  listFilter,
  onListFilterChange,
  riskFilter,
  onRiskFilterChange,
  unassignedOnly,
  onUnassignedOnlyChange,
  onHoldOnly,
  onOnHoldOnlyChange,
  disabled,
}: ServiceUserQuickSelectBarProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <div
        className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5 touch-pan-x md:flex-wrap md:overflow-visible md:pb-0"
        data-testid="service-users-quick-select"
      >
        <span className="shrink-0 pr-0.5 text-sm font-medium text-muted-foreground">Select</span>

        {PERSON_FILTERS.map(item => (
          <IllustrationFilterBtn
            key={item.id}
            tooltip={item.tooltip}
            active={listFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-${item.id}`}
            art={ART[item.id as 'all' | 'active' | 'discharged']}
            onClick={() => onListFilterChange(item.id)}
          />
        ))}

        <QuickDivider />

        {RISK_FILTERS.map(item => (
          <IllustrationFilterBtn
            key={item.id}
            tooltip={item.tooltip}
            active={riskFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-risk-${item.id.toLowerCase()}`}
            art={ART[item.id]}
            onClick={() => onRiskFilterChange(riskFilter === item.id ? null : item.id)}
          />
        ))}

        <QuickDivider />

        <IllustrationFilterBtn
          tooltip="No key worker assigned"
          active={unassignedOnly}
          disabled={disabled}
          testId="service-users-quick-dols"
          art={ART.noKeyWorker}
          onClick={() => onUnassignedOnlyChange(!unassignedOnly)}
        />

        <IllustrationFilterBtn
          tooltip="On hold service users"
          active={onHoldOnly}
          disabled={disabled}
          testId="service-users-quick-absent"
          art={ART.onHold}
          onClick={() => onOnHoldOnlyChange(!onHoldOnly)}
        />

        <QuickDivider />

        <IllustrationFilterBtn
          tooltip="Soft-deleted service users"
          active={listFilter === 'deleted'}
          disabled={disabled}
          testId="service-users-quick-deleted"
          art={ART.deleted}
          onClick={() => onListFilterChange('deleted')}
        />
      </div>
    </TooltipProvider>
  )
}
