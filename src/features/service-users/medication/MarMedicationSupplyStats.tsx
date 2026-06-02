import type { MedicationSupplySummary } from '@/features/service-users/api/medication-mar.api'
import {
  marSupplyContextItems,
  marSupplyDaysLabel,
  marSupplyModelShortLabel,
} from '@/features/service-users/medication/mar-supply-display'

export function MarMedicationSupplyStats({
  summary,
  variant = 'header',
}: {
  summary: MedicationSupplySummary | null | undefined
  variant?: 'header' | 'label'
}) {
  if (!summary) return null

  const hasQty = summary.quantityRemaining != null
  const hasDays = summary.daysRemaining != null
  const contextItems = marSupplyContextItems(summary)

  if (!hasQty && !hasDays && contextItems.length === 0) return null

  const rootClass = variant === 'header' ? 'mar-supply-stats mar-supply-stats-header' : 'mar-supply-stats'

  return (
    <div className={rootClass}>
      <span className="mar-supply-stat-model">{marSupplyModelShortLabel(summary.supplyModel)}</span>

      {hasQty && (
        <span className="mar-supply-stat-qty">
          <strong>{summary.quantityRemaining}</strong>
          {summary.quantityTotal != null && (
            <span className="mar-supply-stat-of"> of {summary.quantityTotal}</span>
          )}{' '}
          {summary.qtyUnit} left
        </span>
      )}

      {hasDays && (
        <span className="mar-supply-stat-days">
          <strong>{summary.daysRemaining}</strong> {marSupplyDaysLabel(summary)}
        </span>
      )}

      {contextItems.map(item => (
        <span key={`${item.label}-${item.value}`} className="mar-supply-stat-context">
          {item.label} <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  )
}
