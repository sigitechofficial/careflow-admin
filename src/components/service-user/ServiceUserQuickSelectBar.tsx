import * as React from 'react'
import { Ban, HandHeart, Pause, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type QuickSelectListId = 'all' | 'active' | 'discharged' | 'deleted'

export type QuickSelectRiskId = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type Tone = 'teal' | 'amber' | 'rose' | 'blue'

const LEGACY_TOOLTIP_CLASS =
  'max-w-[12rem] rounded-sm border-0 bg-neutral-900 px-3 py-2 text-center text-xs font-normal leading-snug text-white shadow-lg'

const iconSvg =
  '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[2px]'

const OUTLINE_TONE: Record<'teal' | 'amber' | 'rose', string> = {
  teal: 'border-[#8ec4b8] bg-white text-[#6b8f86] hover:bg-[#e8f5f2]',
  amber: 'border-[#e5c76a] bg-white text-[#8a7a4a] hover:bg-[#faf6e8]',
  rose: 'border-[#e5a8ae] bg-white text-[#8a5a5e] hover:bg-[#fdf0f1]',
}

const SOLID_TONE: Record<Tone, string> = {
  teal: 'border-transparent bg-[#9fd4c8] text-white shadow-sm hover:bg-[#8ec4b8]',
  amber: 'border-transparent bg-[#e8d078] text-white shadow-sm hover:bg-[#ddb85a]',
  rose: 'border-transparent bg-[#e8a8b0] text-white shadow-sm hover:bg-[#d8929c]',
  blue: 'border-transparent bg-[#8fc5e8] text-white shadow-sm hover:bg-[#7ab8de]',
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

function OutlineCircleBtn({
  tooltip,
  tone,
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  tooltip: string
  tone: 'teal' | 'amber' | 'rose'
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
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 p-0 leading-none',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1',
        iconSvg,
        active ? 'border-[#4db8c8] bg-[#4db8c8] text-white shadow-md' : OUTLINE_TONE[tone],
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  )

  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

function SolidCircleBtn({
  tooltip,
  tone,
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  tooltip: string
  tone: Tone
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
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border p-0 leading-none',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1',
        iconSvg,
        active ? 'border-[#3da8b8] bg-[#4db8c8] text-white ring-2 ring-[#4db8c8]/30' : SOLID_TONE[tone],
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  )

  return <QuickSelectTooltip label={tooltip}>{button}</QuickSelectTooltip>
}

/** Person icons — regular / timed actions status (legacy tooltips). */
const PERSON_FILTERS: { id: QuickSelectListId; tooltip: string; tone: 'teal' | 'amber' | 'rose' }[] = [
  { id: 'all', tooltip: 'All actions up to date', tone: 'teal' },
  { id: 'active', tooltip: 'Regular action or timed task overdue', tone: 'amber' },
  { id: 'discharged', tooltip: 'Critical tasks overdue', tone: 'rose' },
]

/** Heart icons — care plan status (legacy tooltips). */
const CARE_PLAN_FILTERS: { id: QuickSelectRiskId; tooltip: string; tone: 'teal' | 'amber' | 'rose' }[] = [
  { id: 'LOW', tooltip: 'No care plans outstanding', tone: 'teal' },
  { id: 'MEDIUM', tooltip: 'Care plan review due within a week', tone: 'amber' },
  { id: 'HIGH', tooltip: 'Care plans outstanding', tone: 'rose' },
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

        {PERSON_FILTERS.map((item) => (
          <OutlineCircleBtn
            key={item.id}
            tooltip={item.tooltip}
            tone={item.tone}
            active={listFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-${item.id}`}
            onClick={() => onListFilterChange(item.id)}
          >
            <User strokeWidth={2} />
          </OutlineCircleBtn>
        ))}

        <QuickDivider />

        {CARE_PLAN_FILTERS.map((item) => (
          <SolidCircleBtn
            key={item.id}
            tooltip={item.tooltip}
            tone={item.tone}
            active={riskFilter === item.id}
            disabled={disabled}
            testId={`service-users-quick-risk-${item.id.toLowerCase()}`}
            onClick={() => onRiskFilterChange(riskFilter === item.id ? null : item.id)}
          >
            <HandHeart strokeWidth={2.25} />
          </SolidCircleBtn>
        ))}

        <QuickDivider />

        <SolidCircleBtn
          tooltip="DoLS"
          tone="blue"
          active={unassignedOnly}
          disabled={disabled}
          testId="service-users-quick-dols"
          onClick={() => onUnassignedOnlyChange(!unassignedOnly)}
        >
          <Ban strokeWidth={2.25} />
        </SolidCircleBtn>

        <SolidCircleBtn
          tooltip="Filter absent Service User"
          tone="rose"
          active={onHoldOnly}
          disabled={disabled}
          testId="service-users-quick-absent"
          onClick={() => onOnHoldOnlyChange(!onHoldOnly)}
        >
          <Pause strokeWidth={2.25} />
        </SolidCircleBtn>

        <QuickDivider />

        <SolidCircleBtn
          tooltip="Soft-deleted service users"
          tone="rose"
          active={listFilter === 'deleted'}
          disabled={disabled}
          testId="service-users-quick-deleted"
          onClick={() => onListFilterChange('deleted')}
        >
          <Trash2 strokeWidth={2.25} />
        </SolidCircleBtn>
      </div>
    </TooltipProvider>
  )
}
