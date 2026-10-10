import type { LucideIcon } from 'lucide-react'
import { OctagonAlert, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export type ServiceUserRiskCode = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/** Risk profile icons — shield for low → high, octagon alert for critical. */
export const SERVICE_USER_RISK_ICON: Record<
  ServiceUserRiskCode,
  { Icon: LucideIcon; label: string; circle: string }
> = {
  LOW: { Icon: ShieldCheck, label: 'Low risk profile', circle: 'bg-[#5bb7a4]' },
  MEDIUM: { Icon: Shield, label: 'Medium risk profile', circle: 'bg-[#f0c25e]' },
  HIGH: { Icon: ShieldAlert, label: 'High risk profile', circle: 'bg-[#e8615e]' },
  CRITICAL: { Icon: OctagonAlert, label: 'Critical risk profile', circle: 'bg-[#8b1d24]' },
}

export function toServiceUserRiskCode(code?: string | null): ServiceUserRiskCode | null {
  const upper = code?.trim().toUpperCase()
  return upper && upper in SERVICE_USER_RISK_ICON ? (upper as ServiceUserRiskCode) : null
}

/** Solid coloured circle with the risk icon (sized by the parent via className). */
export function ServiceUserRiskIcon({
  code,
  className,
  iconClassName,
}: {
  code: ServiceUserRiskCode
  className?: string
  iconClassName?: string
}) {
  const { Icon, circle } = SERVICE_USER_RISK_ICON[code]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full text-white', circle, className)}
      aria-hidden
    >
      <Icon className={cn('h-[55%] w-[55%]', iconClassName)} strokeWidth={2.25} />
    </span>
  )
}
