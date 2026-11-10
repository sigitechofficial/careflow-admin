import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { FigmaActionIcon } from '@/features/service-users/components/FigmaActionIcon'
import {
  figmaQuickSelectIcon,
  type ServiceUserQuickSelectIconId,
} from '@/features/service-users/figma-action-icons'
import {
  carePlanListStatusPresentation,
  type CarePlanListStatus,
} from '@/features/service-users/care-plans/care-plan-list-status'
import {
  SERVICE_USER_RISK_ICON,
  ServiceUserRiskIcon,
} from '@/features/service-users/components/ServiceUserRiskIcon'

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
  src,
}: {
  tooltip: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  testId?: string
  figmaId?: ServiceUserQuickSelectIconId
  /** Icon URL when not one of the quick-select assets (e.g. care plan status icons). */
  src?: string
}) {
  const iconSrc = src ?? (figmaId ? figmaQuickSelectIcon(figmaId) : '')
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
      <FigmaActionIcon src={iconSrc} title={tooltip} className="h-9 w-9" />
    </button>
  )
  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

function RiskFilterBtn({
  code,
  active,
  disabled,
  onClick,
}: {
  code: QuickSelectRiskId
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  const tooltip = SERVICE_USER_RISK_ICON[code].label
  const button = (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      data-testid={`service-users-quick-risk-${code.toLowerCase()}`}
      onClick={onClick}
      className={cn(figmaBtnClass(active), disabled && 'pointer-events-none opacity-40')}
    >
      <ServiceUserRiskIcon code={code} className="h-9 w-9" />
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

/** Same icons as each row's care plan status (care plan review dates). */
const CARE_PLAN_FILTERS: { id: CarePlanListStatus; tooltip: string }[] = [
  { id: 'none', tooltip: 'No care plan' },
  { id: 'ok', tooltip: 'Care plans up to date' },
  { id: 'due_within_week', tooltip: 'Care plan review due soon' },
  { id: 'overdue', tooltip: 'Care plan review overdue' },
]

const RISK_FILTERS: QuickSelectRiskId[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export type ServiceUserQuickSelectBarProps = {
  listFilter: QuickSelectListId | null
  onListFilterChange: (id: QuickSelectListId) => void
  carePlanFilter: CarePlanListStatus | ''
  onCarePlanFilterChange: (next: CarePlanListStatus | '') => void
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
  carePlanFilter,
  onCarePlanFilterChange,
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

        {CARE_PLAN_FILTERS.map(item => (
          <FigmaFilterBtn
            key={item.id}
            tooltip={item.tooltip}
            active={carePlanFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-care-plan-${item.id}`}
            src={carePlanListStatusPresentation(item.id).src}
            onClick={() => onCarePlanFilterChange(carePlanFilter === item.id ? '' : item.id)}
          />
        ))}

        <QuickDivider />

        {RISK_FILTERS.map(code => (
          <RiskFilterBtn
            key={code}
            code={code}
            active={riskFilter === code}
            disabled={disabled}
            onClick={() => onRiskFilterChange(riskFilter === code ? null : code)}
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
          onClick={() => onListFilterChange(listFilter === 'deleted' ? 'active' : 'deleted')}
        >
          <Trash2 strokeWidth={2.25} />
        </LegacySolidBtn>
      </div>
    </TooltipProvider>
  )
}
