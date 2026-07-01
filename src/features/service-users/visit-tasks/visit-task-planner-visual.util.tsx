import {
  Activity,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Clock,
  Droplets,
  Flag,
  HeartPulse,
  Layers,
  ListTree,
  Moon,
  PlusCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SprayCan,
  Sun,
  Sunrise,
  Sunset,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type PlannerVisual = {
  icon: LucideIcon
  iconClass: string
  surfaceClass: string
  ringClass: string
}

export const PLANNER_STAT_VISUALS = {
  tasks: {
    icon: ClipboardList,
    iconClass: 'text-primary',
    surfaceClass: 'bg-primary/10',
    ringClass: 'ring-primary/20',
  },
  slots: {
    icon: CalendarClock,
    iconClass: 'text-sky-600 dark:text-sky-400',
    surfaceClass: 'bg-sky-500/10',
    ringClass: 'ring-sky-500/20',
  },
  consent: {
    icon: ShieldCheck,
    iconClass: 'text-amber-600 dark:text-amber-400',
    surfaceClass: 'bg-amber-500/10',
    ringClass: 'ring-amber-500/20',
  },
  categories: {
    icon: Layers,
    iconClass: 'text-violet-600 dark:text-violet-400',
    surfaceClass: 'bg-violet-500/10',
    ringClass: 'ring-violet-500/20',
  },
} as const satisfies Record<string, PlannerVisual>

export const ROUND_VISUALS: Record<string, PlannerVisual> = {
  MORNING: {
    icon: Sunrise,
    iconClass: 'text-amber-600 dark:text-amber-400',
    surfaceClass: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30',
    ringClass: 'ring-amber-200/80 dark:ring-amber-800/60',
  },
  MIDDAY: {
    icon: Sun,
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    surfaceClass: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/30',
    ringClass: 'ring-yellow-200/80 dark:ring-yellow-800/60',
  },
  AFTERNOON: {
    icon: Sun,
    iconClass: 'text-orange-600 dark:text-orange-400',
    surfaceClass: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30',
    ringClass: 'ring-orange-200/80 dark:ring-orange-800/60',
  },
  EVENING: {
    icon: Sunset,
    iconClass: 'text-rose-600 dark:text-rose-400',
    surfaceClass: 'bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/30',
    ringClass: 'ring-rose-200/80 dark:ring-rose-800/60',
  },
  NIGHT: {
    icon: Moon,
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    surfaceClass: 'bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30',
    ringClass: 'ring-indigo-200/80 dark:ring-indigo-800/60',
  },
}

export const GROUP_VISUALS: Record<string, PlannerVisual> = {
  personal_care: {
    icon: Droplets,
    iconClass: 'text-teal-700 dark:text-teal-300',
    surfaceClass: 'bg-teal-500/10',
    ringClass: 'ring-teal-500/20',
  },
  observations_monitoring: {
    icon: Activity,
    iconClass: 'text-sky-700 dark:text-sky-300',
    surfaceClass: 'bg-sky-500/10',
    ringClass: 'ring-sky-500/20',
  },
  condition_specific: {
    icon: HeartPulse,
    iconClass: 'text-rose-700 dark:text-rose-300',
    surfaceClass: 'bg-rose-500/10',
    ringClass: 'ring-rose-500/20',
  },
  equipment_ipc: {
    icon: SprayCan,
    iconClass: 'text-violet-700 dark:text-violet-300',
    surfaceClass: 'bg-violet-500/10',
    ringClass: 'ring-violet-500/20',
  },
  shopping_errands: {
    icon: ShoppingBag,
    iconClass: 'text-amber-700 dark:text-amber-300',
    surfaceClass: 'bg-amber-500/10',
    ringClass: 'ring-amber-500/20',
  },
}

export const SUMMARY_ROW_ICONS = {
  total: ClipboardList,
  slots: Clock,
  catalogue: BookOpen,
} as const

export const SIDEBAR_ICONS = {
  summary: Target,
  category: Layers,
  timeSlot: ListTree,
} as const

export function roundVisual(code: string): PlannerVisual {
  return (
    ROUND_VISUALS[code.toUpperCase()] ?? {
      icon: Clock,
      iconClass: 'text-primary',
      surfaceClass: 'bg-primary/10',
      ringClass: 'ring-primary/20',
    }
  )
}

export function groupVisual(code: string): PlannerVisual {
  return (
    GROUP_VISUALS[code] ?? {
      icon: ClipboardList,
      iconClass: 'text-primary',
      surfaceClass: 'bg-primary/10',
      ringClass: 'ring-primary/20',
    }
  )
}

export function PlannerIconBadge({
  visual,
  size = 'md',
  className,
}: {
  visual: PlannerVisual
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const Icon = visual.icon
  const sizeClass =
    size === 'lg'
      ? 'h-[54px] w-[54px] rounded-2xl [&_svg]:h-6 [&_svg]:w-6'
      : size === 'sm'
        ? 'h-8 w-8 rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5'
        : 'h-10 w-10 rounded-xl [&_svg]:h-4 [&_svg]:w-4'

  return (
    <span
      className={[
        'grid shrink-0 place-items-center ring-1 shadow-sm',
        sizeClass,
        visual.surfaceClass,
        visual.ringClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className={visual.iconClass} aria-hidden />
    </span>
  )
}

export const PlannerEmptyIcons = {
  addFirst: PlusCircle,
  noMatch: Sparkles,
  filter: Flag,
} as const
