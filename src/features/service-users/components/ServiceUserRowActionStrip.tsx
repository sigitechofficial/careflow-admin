import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { UserCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import type { ServiceUserListRow } from '@/features/service-users/types'
import { FigmaActionIcon } from '@/features/service-users/components/FigmaActionIcon'
import {
  figmaActionIcon,
  figmaReportIcon,
  type ServiceUserFigmaActionId,
  type ServiceUserFigmaReportId,
} from '@/features/service-users/figma-action-icons'
import { carePlanListStatusPresentation } from '@/features/service-users/care-plans/care-plan-list-status'
import {
  SERVICE_USER_RISK_ICON,
  ServiceUserRiskIcon,
  toServiceUserRiskCode,
} from '@/features/service-users/components/ServiceUserRiskIcon'

/** Locked destinations for list row actions — Profile work must not change these. */
export const SERVICE_USER_ROW_ACTION_LINKS = {
  overview: { to: '/service-users/$serviceUserId/view' as const },
  carePlan: { to: '/service-users/$serviceUserId/care-plan' as const },
  details: { to: '/service-users/$serviceUserId' as const, search: { tab: 'personal' } },
  serviceManagement: { to: '/service-users/$serviceUserId' as const, search: { tab: 'dom' } },
  calendar: { to: '/service-users/$serviceUserId' as const, search: { tab: 'calendar' } },
  medication: { to: '/service-users/$serviceUserId/medication' as const },
  flashFallback: { to: '/service-users/$serviceUserId/view' as const, search: { focus: 'flash' } },
  absence: { to: '/service-users/$serviceUserId' as const, search: { tab: 'absences' } },
  careSummaryReport: { to: '/service-users/$serviceUserId/view' as const },
  detailedCareReport: { to: '/service-users/$serviceUserId/activity' as const },
  observationsReport: { to: '/service-users/$serviceUserId/observations' as const },
  assessmentReport: { to: '/service-users/initial-assessment' as const },
  carePlanReport: { to: '/service-users/$serviceUserId/care-plan' as const },
} as const

const iconSvg =
  '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[2.25px]'

const ICON_BLUE = 'bg-[#6db3d9] hover:bg-[#5ca8ce] border-transparent text-white shadow-sm'
const ICON_ALERT = 'bg-[#e0535f] hover:bg-[#d04552] border-transparent text-white shadow-sm'

function circleBase(className?: string) {
  return cn(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 leading-none',
    'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-1',
    iconSvg,
    className,
  )
}

function figmaCircleBase(className?: string) {
  return cn(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full p-0',
    'border-0 bg-transparent shadow-none',
    'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-1',
    className,
  )
}

function CircleLink({
  to,
  params,
  search,
  title,
  tone = 'blue',
  children,
  testId,
  figmaIcon,
  figmaSrc,
  carePlanListStatus,
}: {
  to: string
  params: { serviceUserId: string }
  search?: Record<string, string>
  title: string
  tone?: 'blue' | 'alert'
  children?: React.ReactNode
  testId?: string
  figmaIcon?: ServiceUserFigmaActionId
  figmaSrc?: string
  carePlanListStatus?: string
}) {
  const src = figmaSrc ?? (figmaIcon ? figmaActionIcon(figmaIcon) : undefined)
  const className = src ? figmaCircleBase() : circleBase(tone === 'alert' ? ICON_ALERT : ICON_BLUE)
  return (
    <Link
      to={to}
      params={params}
      search={search}
      title={title}
      data-testid={testId}
      data-care-plan-list-status={carePlanListStatus}
      className={className}
    >
      {src ? <FigmaActionIcon src={src} title={title} /> : children}
    </Link>
  )
}

function CircleButton({
  title,
  tone = 'blue',
  children,
  testId,
  onClick,
  figmaIcon,
}: {
  title: string
  tone?: 'blue' | 'alert'
  children?: React.ReactNode
  testId?: string
  onClick: () => void
  figmaIcon?: ServiceUserFigmaActionId
}) {
  const className = figmaIcon ? figmaCircleBase() : circleBase(tone === 'alert' ? ICON_ALERT : ICON_BLUE)
  return (
    <button
      type="button"
      title={title}
      data-testid={testId}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={className}
    >
      {figmaIcon ? (
        <FigmaActionIcon src={figmaActionIcon(figmaIcon)} title={title} />
      ) : (
        children
      )}
    </button>
  )
}

function ReportCircleLink({
  to,
  params,
  search,
  reportId,
  title,
}: {
  to: string
  params?: { serviceUserId: string }
  search?: Record<string, string>
  reportId: ServiceUserFigmaReportId
  title: string
}) {
  return (
    <Link
      to={to}
      {...(params ? { params } : {})}
      {...(search ? { search } : {})}
      title={title}
      className={figmaCircleBase()}
    >
      <FigmaActionIcon src={figmaReportIcon(reportId)} title={title} />
    </Link>
  )
}

function PlaceholderCircle({ label, title, Icon }: { label?: string; title: string; Icon?: LucideIcon }) {
  return (
    <Link
      to="/in-progress"
      title={`${title} (coming soon)`}
      className={cn(circleBase(ICON_BLUE), label && 'text-xs font-bold tracking-tight')}
    >
      {Icon ? <Icon strokeWidth={2.25} /> : label}
    </Link>
  )
}

type Props = {
  user: ServiceUserListRow
  className?: string
  archived?: boolean
  onFlashClick?: (user: ServiceUserListRow) => void
  /** Show only the Overview button (used on the list page). */
  compact?: boolean
}

export function ServiceUserRowActionStrip({ user, className, archived, onFlashClick, compact }: Props) {
  const id = user.id
  const params = { serviceUserId: id }
  const carePlanIcon = carePlanListStatusPresentation(user.carePlanListStatus)
  const riskCode = toServiceUserRiskCode(user.riskLevel?.code)

  if (archived) {
    return (
      <p className={cn('text-xs italic text-muted-foreground', className)}>
        Archived record
      </p>
    )
  }

  return (
    <div
      className={cn('flex flex-nowrap items-center justify-end gap-1', className)}
      data-testid="service-user-row-actions"
    >
      <CircleLink
        to={SERVICE_USER_ROW_ACTION_LINKS.overview.to}
        params={params}
        title="Overview"
        testId="su-action-overview"
        figmaIcon="overview"
      />
      {onFlashClick ? (
        <CircleButton
          title={user.hasActiveFlashMessage ? 'Flash Message (active)' : 'Flash Message'}
          testId="su-action-flash"
          onClick={() => onFlashClick(user)}
          figmaIcon="flash"
        />
      ) : (
        <CircleLink
          to={SERVICE_USER_ROW_ACTION_LINKS.flashFallback.to}
          params={params}
          search={SERVICE_USER_ROW_ACTION_LINKS.flashFallback.search}
          title={user.hasActiveFlashMessage ? 'Flash Message (active)' : 'Flash Message'}
          testId="su-action-flash"
          figmaIcon="flash"
        />
      )}
      {/* Care plan review status and risk profile — shown on every row, compact included. */}
      {riskCode ? (
        <span
          title={user.riskLevel?.name ? `${user.riskLevel.name} risk` : SERVICE_USER_RISK_ICON[riskCode].label}
          data-testid="su-row-risk"
          data-risk={riskCode}
          className="inline-flex"
        >
          <ServiceUserRiskIcon code={riskCode} className="h-8 w-8" />
        </span>
      ) : null}
      <CircleLink
        to={SERVICE_USER_ROW_ACTION_LINKS.carePlan.to}
        params={params}
        title={carePlanIcon.title}
        testId="su-action-care-plan"
        figmaSrc={carePlanIcon.src}
        carePlanListStatus={carePlanIcon.status}
      />
      {!compact && (
        <>
          <CircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.details.to}
            params={params}
            search={SERVICE_USER_ROW_ACTION_LINKS.details.search}
            title="More Details"
            testId="su-action-details"
            figmaIcon="details"
          />
          <CircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.serviceManagement.to}
            params={params}
            search={SERVICE_USER_ROW_ACTION_LINKS.serviceManagement.search}
            title="Service Management"
            testId="su-action-service-management"
            figmaIcon="serviceManagement"
          />
          <CircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.calendar.to}
            params={params}
            search={SERVICE_USER_ROW_ACTION_LINKS.calendar.search}
            title="Calendar"
            testId="su-action-calendar"
            figmaIcon="calendar"
          />
          <CircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.medication.to}
            params={params}
            title="Medication"
            testId="su-action-medication"
            figmaIcon="medication"
          />
          <PlaceholderCircle title="Create Session" Icon={UserCheck} />
          <CircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.absence.to}
            params={params}
            search={SERVICE_USER_ROW_ACTION_LINKS.absence.search}
            title={user.hasActiveAbsence ? 'Record Absence (active absence)' : 'Record Absence'}
            testId="su-action-absence"
            figmaIcon="absence"
          />

          <span className="mx-1 hidden h-7 w-px shrink-0 bg-border/80 sm:inline-block" aria-hidden />

          <ReportCircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.careSummaryReport.to}
            params={params}
            reportId="CS"
            title="Care summary"
          />
          <ReportCircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.detailedCareReport.to}
            params={params}
            reportId="D"
            title="Detailed Care report"
          />
          <ReportCircleLink
            to={SERVICE_USER_ROW_ACTION_LINKS.observationsReport.to}
            params={params}
            reportId="O"
            title="Observation Report"
          />
        </>
      )}
      {/* Hidden for now: Assessment report, Care plan report, House pack history */}
    </div>
  )
}
