import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FigmaActionIcon } from '@/components/service-user/FigmaActionIcon'
import {
  figmaQuickSelectIcon,
  QUICK_SELECT_LIST_ICON,
  QUICK_SELECT_RISK_ICON,
  type ServiceUserQuickSelectIconId,
} from '@/features/service-users/figma-action-icons'

export type QuickSelectListId = 'all' | 'active' | 'discharged' | 'deleted'

export type QuickSelectRiskId = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const LEGACY_TOOLTIP_CLASS =
  'max-w-[12rem] rounded-sm border-0 bg-neutral-900 px-3 py-2 text-center text-xs font-normal leading-snug text-white shadow-lg'

const iconSvg =
  '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[2px]'

const SOLID_TONE: Record<'teal' | 'amber' | 'rose' | 'blue', string> = {
  teal: 'border-transparent bg-[#9fd4c8] text-white shadow-sm hover:bg-[#8ec4b8]',
  amber: 'border-transparent bg-[#e8d078] text-white shadow-sm hover:bg-[#ddb85a]',
  rose: 'border-transparent bg-[#e8a8b0] text-white shadow-sm hover:bg-[#d8929c]',
  blue: 'border-transparent bg-[#8fc5e8] text-white shadow-sm hover:bg-[#7ab8de]',
}

function figmaBtnClass(active?: boolean) {
  return cn(
    'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0',
    'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1',
    active && 'ring-2 ring-[#4db8c8]/50 ring-offset-1',
  )
}

function legacyBtnClass(active: boolean | undefined, toneClass: string) {
  return cn(
    'border',
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 leading-none',
    'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1',
    iconSvg,
    active ? 'border-[#4db8c8] bg-[#4db8c8] text-white shadow-md ring-2 ring-[#4db8c8]/30' : toneClass,
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

function FigmaFilterBtn({
  tooltip,
  active,
  disabled,
  onClick,
  testId,
  figmaId,
}: {
  tooltip: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  testId?: string
  figmaId: ServiceUserQuickSelectIconId
}) {
  const button = (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      className={cn(figmaBtnClass(active), disabled && 'pointer-events-none opacity-40')}
    >
      <FigmaActionIcon src={figmaQuickSelectIcon(figmaId)} title={tooltip} className="h-9 w-9" />
    </button>
  )
  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

function LegacySolidBtn({
  tooltip,
  tone,
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  tooltip: string
  tone: 'teal' | 'amber' | 'rose' | 'blue'
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  testId?: string
  children: React.ReactNode
}) {
  const button = (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      className={cn(legacyBtnClass(active, SOLID_TONE[tone]), disabled && 'pointer-events-none opacity-40')}
    >
      {children}
    </button>
  )
  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

const PERSON_FILTERS: { id: QuickSelectListId; tooltip: string }[] = [
  { id: 'all', tooltip: 'All actions up to date' },
  { id: 'active', tooltip: 'Regular action or timed task overdue' },
  { id: 'discharged', tooltip: 'Critical tasks overdue' },
]

const CARE_PLAN_FILTERS: { id: QuickSelectRiskId; tooltip: string }[] = [
  { id: 'LOW', tooltip: 'No care plans outstanding' },
  { id: 'MEDIUM', tooltip: 'Care plan review due within a week' },
  { id: 'HIGH', tooltip: 'Care plans outstanding' },
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
        className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 pb-0.5 touch-pan-x md:mx-0 md:max-w-none md:flex-wrap md:overflow-visible md:gap-1.5 md:px-0 md:pb-0"
        data-testid="service-users-quick-select"
      >
        <span className="shrink-0 pr-0.5 text-sm font-medium text-muted-foreground">Select</span>

        {PERSON_FILTERS.map(item => {
          const figmaId = QUICK_SELECT_LIST_ICON[item.id]
          return figmaId ? (
            <FigmaFilterBtn
              key={item.id}
              tooltip={item.tooltip}
              active={listFilter === item.id}
              disabled={disabled}
              testId={`service-users-quick-${item.id}`}
              figmaId={figmaId}
              onClick={() => onListFilterChange(item.id)}
            />
          ) : null
        })}

        <QuickDivider />

        {CARE_PLAN_FILTERS.map(item => (
          <FigmaFilterBtn
            key={item.id}
            tooltip={item.tooltip}
            active={riskFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-risk-${item.id.toLowerCase()}`}
            figmaId={QUICK_SELECT_RISK_ICON[item.id]}
            onClick={() => onRiskFilterChange(riskFilter === item.id ? null : item.id)}
          />
        ))}

        <QuickDivider />

        <FigmaFilterBtn
          tooltip="DoLS"
          active={unassignedOnly}
          disabled={disabled}
          testId="service-users-quick-dols"
          figmaId="dols"
          onClick={() => onUnassignedOnlyChange(!unassignedOnly)}
        />

        <FigmaFilterBtn
          tooltip="Filter absent Service User"
          active={onHoldOnly}
          disabled={disabled}
          testId="service-users-quick-absent"
          figmaId="absent"
          onClick={() => onOnHoldOnlyChange(!onHoldOnly)}
        />

        <QuickDivider />

        <LegacySolidBtn
          tooltip="Soft-deleted service users"
          tone="rose"
          active={listFilter === 'deleted'}
          disabled={disabled}
          testId="service-users-quick-deleted"
          onClick={() => onListFilterChange('deleted')}
        >
          <Trash2 strokeWidth={2.25} />
        </LegacySolidBtn>
      </div>
    </TooltipProvider>
  )
}
