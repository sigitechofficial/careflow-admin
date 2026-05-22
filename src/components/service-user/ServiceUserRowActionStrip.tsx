import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { UserCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ServiceUserListRow } from '@/lib/service-users-api'
import { FigmaActionIcon } from '@/components/service-user/FigmaActionIcon'
import {
  figmaActionIcon,
  figmaReportIcon,
  type ServiceUserFigmaActionId,
  type ServiceUserFigmaReportId,
} from '@/features/service-users/figma-action-icons'

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
}: {
  to: string
  params: { serviceUserId: string }
  search?: Record<string, string>
  title: string
  tone?: 'blue' | 'alert'
  children?: React.ReactNode
  testId?: string
  figmaIcon?: ServiceUserFigmaActionId
}) {
  const className = figmaIcon ? figmaCircleBase() : circleBase(tone === 'alert' ? ICON_ALERT : ICON_BLUE)
  return (
    <Link
      to={to}
      params={params}
      search={search}
      title={title}
      data-testid={testId}
      className={className}
    >
      {figmaIcon ? (
        <FigmaActionIcon src={figmaActionIcon(figmaIcon)} title={title} />
      ) : (
        children
      )}
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
}

export function ServiceUserRowActionStrip({ user, className, archived, onFlashClick }: Props) {
  const id = user.id
  const params = { serviceUserId: id }

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
        to="/service-users/$serviceUserId/view"
        params={params}
        title="Overview"
        testId="su-action-overview"
        figmaIcon="overview"
      />
      <CircleLink
        to="/service-users/$serviceUserId/care-plan"
        params={params}
        title="Care Plan"
        testId="su-action-care-plan"
        figmaIcon="carePlan"
      />
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'personal' }}
        title="More Details"
        testId="su-action-details"
        figmaIcon="details"
      />
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'dom' }}
        title="Service Management"
        testId="su-action-service-management"
        figmaIcon="serviceManagement"
      />
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'calendar' }}
        title="Calendar"
        testId="su-action-calendar"
        figmaIcon="calendar"
      />
      <CircleLink
        to="/service-users/$serviceUserId/medication"
        params={params}
        title="Medication"
        testId="su-action-medication"
        figmaIcon="medication"
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
          to="/service-users/$serviceUserId/view"
          params={params}
          search={{ focus: 'flash' }}
          title={user.hasActiveFlashMessage ? 'Flash Message (active)' : 'Flash Message'}
          testId="su-action-flash"
          figmaIcon="flash"
        />
      )}
      <PlaceholderCircle title="Create Session" Icon={UserCheck} />
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'absences' }}
        title={user.hasActiveAbsence ? 'Record Absence (active absence)' : 'Record Absence'}
        testId="su-action-absence"
        figmaIcon="absence"
      />

      <span className="mx-1 hidden h-7 w-px shrink-0 bg-border/80 sm:inline-block" aria-hidden />

      <ReportCircleLink to="/in-progress" reportId="CS" title="Care summary" />
      <ReportCircleLink to="/in-progress" reportId="D" title="Detailed Care report" />
      <ReportCircleLink
        to="/service-users/$serviceUserId/observations"
        params={params}
        reportId="O"
        title="Observation Report"
      />
      <ReportCircleLink
        to="/service-users/initial-assessment-checklist"
        params={params}
        search={{ serviceUserId: id }}
        reportId="A"
        title="Assessment report"
      />
      <ReportCircleLink
        to="/service-users/$serviceUserId/care-plan"
        params={params}
        reportId="C"
        title="Care plan report"
      />
      <ReportCircleLink to="/in-progress" reportId="H" title="House pack history" />
    </div>
  )
}
