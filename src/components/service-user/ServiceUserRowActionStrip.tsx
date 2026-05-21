import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  Eye,
  HandHeart,
  Pause,
  Pill,
  Smile,
  User,
  UserCheck,
  Zap,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { ServiceUserListRow } from '@/lib/service-users-api'

const ICON_BLUE = 'bg-[#6db3d9] hover:bg-[#5ca8ce] border-transparent text-white shadow-sm'
const ICON_CARE_PLAN = 'bg-[#4db8c8] hover:bg-[#3da8b8] border-transparent text-white shadow-sm'
const ICON_ALERT = 'bg-[#e0535f] hover:bg-[#d04552] border-transparent text-white shadow-sm'

const iconSvg =
  '[&_svg]:block [&_svg]:shrink-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[2.25px]'

function circleBase(className?: string) {
  return cn(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 leading-none',
    'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-1',
    iconSvg,
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
}: {
  to: string
  params: { serviceUserId: string }
  search?: Record<string, string>
  title: string
  tone?: 'blue' | 'care-plan' | 'alert'
  children: React.ReactNode
  testId?: string
}) {
  const toneClass =
    tone === 'care-plan' ? ICON_CARE_PLAN : tone === 'alert' ? ICON_ALERT : ICON_BLUE
  return (
    <Link
      to={to}
      params={params}
      search={search}
      title={title}
      data-testid={testId}
      className={circleBase(toneClass)}
    >
      {children}
    </Link>
  )
}

function CircleButton({
  title,
  tone = 'blue',
  children,
  testId,
  onClick,
}: {
  title: string
  tone?: 'blue' | 'alert'
  children: React.ReactNode
  testId?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      data-testid={testId}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className={circleBase(tone === 'alert' ? ICON_ALERT : ICON_BLUE)}
    >
      {children}
    </button>
  )
}

function TextCircleLink({
  to,
  params,
  search,
  label,
  title,
}: {
  to: string
  params?: { serviceUserId: string }
  search?: Record<string, string>
  label: string
  title: string
}) {
  return (
    <Link
      to={to}
      {...(params ? { params } : {})}
      {...(search ? { search } : {})}
      title={title}
      className={cn(circleBase(ICON_BLUE), 'text-xs font-bold tracking-tight')}
    >
      {label}
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
      <CircleLink to="/service-users/$serviceUserId/view" params={params} title="Overview" testId="su-action-overview">
        <Eye strokeWidth={2.25} />
      </CircleLink>
      <CircleLink
        to="/service-users/$serviceUserId/care-plan"
        params={params}
        title="Care Plan"
        tone="care-plan"
        testId="su-action-care-plan"
      >
        <HandHeart strokeWidth={2.25} />
      </CircleLink>
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'personal' }}
        title="More Details"
        testId="su-action-details"
      >
        <User strokeWidth={2.25} />
      </CircleLink>
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'dom' }}
        title="Service Management"
        testId="su-action-service-management"
      >
        <Smile strokeWidth={2.25} />
      </CircleLink>
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'calendar' }}
        title="Calendar"
        testId="su-action-calendar"
      >
        <Calendar strokeWidth={2.25} />
      </CircleLink>
      <CircleLink
        to="/service-users/$serviceUserId/medication"
        params={params}
        title="Medication"
        testId="su-action-medication"
      >
        <Pill strokeWidth={2.25} />
      </CircleLink>
      {onFlashClick ? (
        <CircleButton
          title={user.hasActiveFlashMessage ? 'Flash Message (active)' : 'Flash Message'}
          tone={user.hasActiveFlashMessage ? 'alert' : 'blue'}
          testId="su-action-flash"
          onClick={() => onFlashClick(user)}
        >
          <Zap strokeWidth={2.25} />
        </CircleButton>
      ) : (
        <CircleLink
          to="/service-users/$serviceUserId/view"
          params={params}
          search={{ focus: 'flash' }}
          title={user.hasActiveFlashMessage ? 'Flash Message (active)' : 'Flash Message'}
          tone={user.hasActiveFlashMessage ? 'alert' : 'blue'}
          testId="su-action-flash"
        >
          <Zap strokeWidth={2.25} />
        </CircleLink>
      )}
      <PlaceholderCircle title="Create Session" Icon={UserCheck} />
      <CircleLink
        to="/service-users/$serviceUserId"
        params={params}
        search={{ tab: 'absences' }}
        title={user.hasActiveAbsence ? 'Record Absence (active absence)' : 'Record Absence'}
        tone={user.hasActiveAbsence ? 'alert' : 'blue'}
        testId="su-action-absence"
      >
        <Pause strokeWidth={2.25} />
      </CircleLink>

      <span className="mx-1 hidden h-7 w-px shrink-0 bg-border/80 sm:inline-block" aria-hidden />

      <TextCircleLink to="/in-progress" label="CS" title="Care summary" />
      <TextCircleLink to="/in-progress" label="D" title="Detailed Care report" />
      <TextCircleLink
        to="/service-users/$serviceUserId/observations"
        params={params}
        label="O"
        title="Observation Report"
      />
      <TextCircleLink
        to="/service-users/initial-assessment-checklist"
        params={params}
        search={{ serviceUserId: id }}
        label="A"
        title="Assessment report"
      />
      <TextCircleLink
        to="/service-users/$serviceUserId/care-plan"
        params={params}
        label="C"
        title="Care plan report"
      />
      <PlaceholderCircle label="H" title="House pack history" />
    </div>
  )
}
