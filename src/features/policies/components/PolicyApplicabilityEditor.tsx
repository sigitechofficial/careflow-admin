import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { Label } from '@/shared/ui/form-field'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import type { PolicyApplicabilityInput } from '@/features/policies/types/policy.types'

type Lookup = { id: string; name: string; code?: string }

type Props = {
  value: PolicyApplicabilityInput[]
  onChange: (value: PolicyApplicabilityInput[]) => void
  disabled?: boolean
  locations: Lookup[]
  careTypes: Lookup[]
  locationRestricted?: boolean
  error?: string
}

export function validateApplicability(
  rows: PolicyApplicabilityInput[],
  options: {
    locationRestricted?: boolean
    allowedLocationIds?: string[]
    /** Draft save may persist incomplete targeting; review/submit may not. */
    mode?: 'draft' | 'review'
  } = {},
): string | undefined {
  const locationRestricted = Boolean(options.locationRestricted)
  const allowed = options.allowedLocationIds
  const draft = options.mode === 'draft'

  if (!rows.length) {
    if (draft) return undefined
    return locationRestricted
      ? 'Select a branch for this policy.'
      : 'Choose organisation-wide or add a branch or care service.'
  }

  for (const row of rows) {
    if (row.organisationWide) {
      if (locationRestricted) {
        return 'Your access is limited to assigned branches. Select a branch for each target.'
      }
      if (row.locationId || row.serviceTypeCode) {
        return 'Organisation-wide applicability cannot include a branch or care service.'
      }
      continue
    }

    if (!row.locationId && !row.serviceTypeCode) {
      if (draft) continue
      return locationRestricted
        ? 'Select a branch for each target.'
        : 'Each target needs a branch or a care service.'
    }

    if (locationRestricted && !row.locationId) {
      return 'Select a branch for each target.'
    }

    if (locationRestricted && row.locationId && allowed && !allowed.includes(row.locationId)) {
      return 'Select a branch you have access to.'
    }
  }

  return undefined
}

type TargetedRow = { locationId: string; serviceTypeCode: string }

function toEditorState(value: PolicyApplicabilityInput[]): {
  mode: 'organisation' | 'targeted'
  rows: TargetedRow[]
} {
  if (!value.length || value.some(row => row.organisationWide)) {
    return { mode: 'organisation', rows: [{ locationId: '', serviceTypeCode: '' }] }
  }
  return {
    mode: 'targeted',
    rows: value.map(row => ({
      locationId: row.locationId ?? '',
      serviceTypeCode: row.serviceTypeCode ?? '',
    })),
  }
}

export function PolicyApplicabilityEditor({
  value,
  onChange,
  disabled,
  locations,
  careTypes,
  locationRestricted,
  error,
}: Props) {
  const state = toEditorState(value)
  const mode = locationRestricted ? 'targeted' : state.mode
  const liveError = validateApplicability(value, {
    locationRestricted,
    allowedLocationIds: locationRestricted ? locations.map(item => item.id) : undefined,
  })
  const shownError = error || liveError

  const emitOrg = () => onChange([{ organisationWide: true }])
  const emitRows = (rows: TargetedRow[]) => {
    onChange(
      rows.map(row => ({
        organisationWide: false,
        ...(row.locationId ? { locationId: row.locationId } : {}),
        ...(row.serviceTypeCode ? { serviceTypeCode: row.serviceTypeCode } : {}),
      })),
    )
  }

  const setRow = (index: number, patch: Partial<TargetedRow>) => {
    const next = state.rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    emitRows(next)
  }

  const branchOptions = locationRestricted
    ? locations.map(l => ({ value: l.id, label: l.name }))
    : [{ value: '', label: 'Any branch' }, ...locations.map(l => ({ value: l.id, label: l.name }))]

  const summary = React.useMemo(() => {
    if (mode === 'organisation') return 'Applies to the whole organisation.'
    return state.rows
      .map(row => {
        const bits: string[] = []
        const loc = locations.find(item => item.id === row.locationId)?.name
        const svc = careTypes.find(item => item.code === row.serviceTypeCode)?.name
        if (loc) bits.push(loc)
        if (svc) bits.push(svc)
        return bits.join(' + ')
      })
      .filter(Boolean)
      .join('  OR  ')
  }, [mode, state.rows, locations, careTypes])

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">Applies to</legend>
      <p className="text-sm text-muted-foreground">
        {locationRestricted
          ? 'Your access is limited to assigned branches. Each target must include a branch. Multiple targets are alternatives (any match applies). Within one target, branch and care service must both match when both are set.'
          : 'Choose the whole organisation, or target branches and care services. Multiple targets are alternatives (any match applies). Within one target, branch and care service must both match.'}
      </p>

      {!locationRestricted ? (
        <RadioGroup
          value={mode}
          onValueChange={next => {
            if (next === 'organisation') emitOrg()
            else emitRows(state.rows.length ? state.rows : [{ locationId: '', serviceTypeCode: '' }])
          }}
          className="flex flex-wrap gap-4"
          aria-label="Applicability"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="organisation" id="policy-apply-org" />
            Organisation-wide
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="targeted" id="policy-apply-targeted" />
            Specific branches or care services
          </label>
        </RadioGroup>
      ) : (
        <p className="text-sm text-muted-foreground">Organisation-wide is not available for your branch access.</p>
      )}

      {mode === 'targeted' ? (
        <div className="space-y-3">
          {state.rows.map((row, index) => (
            <div
              key={`app-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-end"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`policy-branch-${index}`}>
                  Branch{locationRestricted ? ' (required)' : ''}
                </Label>
                <Combobox
                  id={`policy-branch-${index}`}
                  value={row.locationId}
                  onChange={v => setRow(index, { locationId: v })}
                  options={branchOptions}
                  placeholder={locationRestricted ? 'Select branch' : 'Branch'}
                  allowDeselect={!locationRestricted}
                  disabled={disabled}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor={`policy-service-${index}`}>Care service</Label>
                <Combobox
                  id={`policy-service-${index}`}
                  value={row.serviceTypeCode}
                  onChange={v => setRow(index, { serviceTypeCode: v })}
                  options={[
                    { value: '', label: 'Any care service' },
                    ...careTypes.map(c => ({ value: c.code ?? c.id, label: c.name })),
                  ]}
                  placeholder="Care service"
                  disabled={disabled}
                />
              </div>
              {state.rows.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove target"
                  onClick={() => emitRows(state.rows.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => emitRows([...state.rows, { locationId: '', serviceTypeCode: '' }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add another target
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground" data-testid="policy-applicability-summary">
        {summary || (locationRestricted ? 'Select a branch.' : 'Add a branch or care service.')}
      </p>
      {shownError ? (
        <p className="text-sm text-destructive" role="alert" data-testid="policy-applicability-error">
          {shownError}
        </p>
      ) : null}
    </fieldset>
  )
}
