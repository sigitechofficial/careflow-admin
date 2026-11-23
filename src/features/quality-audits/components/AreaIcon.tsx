import {
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  ClipboardList,
  Flag,
  FolderOpen,
  ShieldCheck,
  ShieldPlus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  CARE_QUALITY: { icon: Award, tone: 'text-warning' },
  DAILY_CHECKS: { icon: CheckCircle2, tone: 'text-primary' },
  DEMENTIA: { icon: Brain, tone: 'text-info' },
  INFECTION_PREVENTION: { icon: ShieldPlus, tone: 'text-success' },
  LEADERSHIP: { icon: Flag, tone: 'text-info' },
  OPERATIONAL: { icon: ClipboardList, tone: 'text-primary' },
  SAFETY_ALERTS: { icon: AlertTriangle, tone: 'text-destructive' },
  RISK_AND_SAFETY: { icon: ShieldCheck, tone: 'text-success' },
}

/** An icon for an audit area; areas you add get a folder. */
export function AreaIcon({ code, className }: { code: string | null | undefined; className?: string }) {
  const { icon: Icon, tone } = (code && ICONS[code]) || { icon: FolderOpen, tone: 'text-muted-foreground' }
  return <Icon className={cn('h-5 w-5', tone, className)} aria-hidden />
}
