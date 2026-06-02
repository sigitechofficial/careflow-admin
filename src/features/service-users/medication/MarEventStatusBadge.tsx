import * as React from 'react'
import { useMedicationLookups } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import {
  buildMarStatusCodeMap,
  resolveMarStatusDisplay,
} from '@/features/service-users/medication/mar-status-display'
import { MedicationStatusBadge } from '@/features/service-users/medication/MedicationStatusBadge'

export function MarEventStatusBadge({
  status,
  statusCode,
  className,
}: {
  status: string
  statusCode?: string | null
  className?: string
}) {
  const lookupsQuery = useMedicationLookups()
  const display = React.useMemo(() => {
    const map = buildMarStatusCodeMap(lookupsQuery.data?.statusCodes ?? [])
    return resolveMarStatusDisplay({ status, statusCode }, map)
  }, [lookupsQuery.data?.statusCodes, status, statusCode])

  return (
    <MedicationStatusBadge
      code={display.code}
      label={display.label}
      color={display.color}
      textColor={display.textColor}
      className={className}
    />
  )
}
