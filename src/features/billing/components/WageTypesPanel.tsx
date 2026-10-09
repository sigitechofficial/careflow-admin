import * as React from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useUpdateWageType, useWageTypes } from '@/features/billing/hooks/useWageTypes'
import {
  CALCULATION_METHOD_LABELS,
  WAGE_TYPE_CATEGORY_LABELS,
  WAGE_TYPE_CATEGORY_ORDER,
  WAGE_TYPE_SUPPORT_LABELS,
  type WageType,
  type WageTypeCategory,
} from '@/features/billing/types/wage-types.types'

const SUPPORT_BADGE: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = {
  PAYCARD: 'success',
  PAY_ITEM: 'info',
  UK_PAYROLL: 'info',
  PARTIAL: 'warning',
  PLANNED: 'secondary',
}

function WageTypeRow({ row, canManage }: { row: WageType; canManage: boolean }) {
  const updateMutation = useUpdateWageType()
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(row.name)
  const [description, setDescription] = React.useState(row.description ?? '')

  const save = async (body: { name?: string; description?: string | null; isActive?: boolean }) => {
    try {
      await updateMutation.mutateAsync({ code: row.code, body })
      toastSuccess('Wage type updated.')
      setEditing(false)
    } catch (err) {
      toastApiError(err, 'Could not update wage type.')
    }
  }

  return (
    <tr className="border-b border-border align-top last:border-0" data-testid={`wage-type-${row.code}`}>
      <td className="px-3 py-2.5">
        {editing ? (
          <div className="space-y-2">
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} aria-label="Display name" />
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Description"
              aria-label="Description"
            />
          </div>
        ) : (
          <>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.description ? <p className="text-xs text-muted-foreground">{row.description}</p> : null}
          </>
        )}
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.code}</p>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{row.unit.toLowerCase()}</td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {row.allowedMethods.map(m => CALCULATION_METHOD_LABELS[m] ?? m).join(', ')}
      </td>
      <td className="px-3 py-2.5">
        {row.support ? (
          <div className="space-y-1">
            <Badge variant={SUPPORT_BADGE[row.support.level] ?? 'secondary'}>
              {WAGE_TYPE_SUPPORT_LABELS[row.support.level] ?? row.support.level}
            </Badge>
            <p className="text-xs text-muted-foreground">{row.support.note}</p>
          </div>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        {row.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
      </td>
      {canManage ? (
        <td className="px-3 py-2.5">
          {editing ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-8"
                leftIcon={<Save className="h-3.5 w-3.5" />}
                disabled={updateMutation.isPending || !name.trim()}
                onClick={() => void save({ name: name.trim(), description: description.trim() || null })}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Cancel"
                onClick={() => {
                  setEditing(false)
                  setName(row.name)
                  setDescription(row.description ?? '')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit name" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={updateMutation.isPending}
                onClick={() => void save({ isActive: !row.isActive })}
              >
                {row.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )}
        </td>
      ) : null}
    </tr>
  )
}

/** Wage type catalogue: protected codes, editable names, and an honest view of what is automatic today. */
export function WageTypesPanel() {
  const canManage = useAuthStore(s => s.can('billing.pay_cards.manage' as never))
  const wageTypesQuery = useWageTypes()
  const rows = wageTypesQuery.data ?? []

  return (
    <div className="space-y-6" data-testid="wage-types-panel">
      <ContentSectionHeader
        title="Wage types"
        description="UK domiciliary care pay components. Codes are fixed; you can rename them or switch them off. 'On pay card' types are set as rates on each pay card."
      />

      {wageTypesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading wage types…</p> : null}
      {wageTypesQuery.error ? (
        <p className="text-sm text-destructive">
          {wageTypesQuery.error instanceof ApiError ? wageTypesQuery.error.message : 'Could not load wage types.'}
        </p>
      ) : null}

      {WAGE_TYPE_CATEGORY_ORDER.map(category => {
        const inCategory = rows.filter(r => r.category === category)
        if (!inCategory.length) return null
        return (
          <section key={category} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {WAGE_TYPE_CATEGORY_LABELS[category as WageTypeCategory]}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Wage type</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Calculation methods</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">How it is paid today</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    {canManage ? <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {inCategory.map(row => (
                    <WageTypeRow key={row.code} row={row} canManage={canManage} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
