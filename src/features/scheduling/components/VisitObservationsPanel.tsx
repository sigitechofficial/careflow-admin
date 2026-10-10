import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, ExternalLink, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import {
  fetchVisitObservations,
  type VisitObservationDefinition,
  type VisitObservationFormField,
} from '@/features/scheduling/api/scheduling.api'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'
import { VoiceNoteList } from '@/features/scheduling/components/VoiceNoteList'
import { useVisitVoiceNotes } from '@/features/scheduling/hooks/useVisitVoiceNotes'
import { useCreateServiceUserObservation } from '@/features/service-users/hooks/useServiceUserObservations'
import type { CreateServiceUserObservationPayload } from '@/features/service-users/api/observations-api'

type Props = {
  serviceUserId: string
  scheduledJobId: string
  scheduledVisitId?: string | null
}

export function VisitObservationsPanel({
  serviceUserId,
  scheduledJobId,
  scheduledVisitId,
}: Props) {
  const voiceNoteLookup = useVisitVoiceNotes(scheduledJobId)
  const catalogQuery = useQuery({
    queryKey: ['visit-observations', scheduledJobId],
    queryFn: ({ signal }) => fetchVisitObservations(scheduledJobId, { signal }),
    enabled: Boolean(scheduledJobId),
  })
  const createMutation = useCreateServiceUserObservation()

  const [selectedTypeCode, setSelectedTypeCode] = React.useState<string | null>(null)
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({})
  const [search, setSearch] = React.useState('')

  const data = catalogQuery.data
  const definition: VisitObservationDefinition | null = selectedTypeCode
    ? (data?.definitionsByTypeCode[selectedTypeCode] ?? null)
    : null

  React.useEffect(() => {
    setFieldValues({})
  }, [selectedTypeCode])

  const filteredSections = React.useMemo(() => {
    const sections = data?.catalog.sections ?? []
    const q = search.trim().toLowerCase()
    if (!q) return sections
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.observationTypeCode.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [data?.catalog.sections, search])

  const setField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayloadFromFields = (
    def: VisitObservationDefinition,
  ): CreateServiceUserObservationPayload | null => {
    const payload: Record<string, unknown> = {
      scheduledJobId,
      scheduledVisitId: scheduledVisitId ?? undefined,
      source: 'visit_workspace',
    }
    let numericValue: number | undefined
    let notes: string | undefined
    const wellbeingScores: Array<{ dimensionCode: string; level: number }> = []

    for (const field of def.form.fields) {
      const raw = fieldValues[field.key]?.trim() ?? ''
      if (field.required && !raw && field.inputType !== 'boolean') {
        toastWarning('Missing field', `${field.label} is required.`)
        return null
      }
      if (field.key === 'notes') {
        notes = raw || undefined
        continue
      }
      if (field.inputType === 'boolean') {
        const path = field.payloadPath ?? field.key
        payload[path] = raw === 'true'
        continue
      }
      if (!raw) continue

      if (field.key.startsWith('wellbeing_') || field.payloadPath) {
        const path = field.payloadPath ?? field.key
        if (field.inputType === 'number' || field.inputType === 'score') {
          const n = Number(raw)
          if (!Number.isFinite(n)) {
            toastWarning('Invalid value', `${field.label} must be a number.`)
            return null
          }
          if (field.key.startsWith('wellbeing_') || def.observationTypeCode === 'WELLBEING') {
            wellbeingScores.push({ dimensionCode: String(path).toUpperCase(), level: n })
          } else if (field.key === 'value' && !field.payloadPath) {
            numericValue = n
          } else {
            payload[path] = n
          }
        } else {
          payload[path] = raw
        }
        continue
      }

      if (field.key === 'value' && (field.inputType === 'number' || field.inputType === 'score')) {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          toastWarning('Invalid value', `${field.label} must be a number.`)
          return null
        }
        numericValue = n
        continue
      }

      if (field.inputType === 'number' || field.inputType === 'score') {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          toastWarning('Invalid value', `${field.label} must be a number.`)
          return null
        }
        payload[field.key] = n
      } else {
        payload[field.key] = raw
      }
    }

    const body: CreateServiceUserObservationPayload = {
      observationTypeCode: def.observationTypeCode,
      recordedAt: new Date().toISOString(),
      notes,
      unit: def.unit ?? undefined,
      payload,
    }
    if (numericValue != null) body.numericValue = numericValue
    if (wellbeingScores.length > 0) body.wellbeingScores = wellbeingScores
    return body
  }

  const handleSave = async () => {
    if (!definition) {
      toastWarning('Select observation', 'Choose an observation type first.')
      return
    }
    const body = buildPayloadFromFields(definition)
    if (!body) return
    try {
      await createMutation.mutateAsync({ serviceUserId, body })
      toastSuccess('Observation recorded', `${definition.label} saved for this visit.`)
      setFieldValues({})
      setSelectedTypeCode(null)
      await catalogQuery.refetch()
    } catch (error) {
      toastApiError(error, 'Could not save observation')
    }
  }

  if (catalogQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading observation catalog…
      </div>
    )
  }

  if (catalogQuery.isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not load the visit observation catalog. Refresh and try again.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{data.catalog.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Same observation types as the carer app visit details. Recorded readings are linked to
            this visit.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/service-users/$serviceUserId/observations" params={{ serviceUserId }}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden />
            Full observations
          </Link>
        </Button>
      </div>

      {data.suggested.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Suggested
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.suggested.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTypeCode(item.typeCode)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  selectedTypeCode === item.typeCode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted/60',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Search catalog</Label>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={data.catalog.searchPlaceholder}
          className="h-9"
        />
      </div>

      {filteredSections.map((section) => (
        <section key={section.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTypeCode(item.typeCode)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  selectedTypeCode === item.typeCode
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-muted/40',
                )}
              >
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.subtitle ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      ))}

      {definition ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
            <div>
              <h4 className="text-sm font-semibold text-foreground">{definition.form.title}</h4>
              {definition.form.subtitle ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{definition.form.subtitle}</p>
              ) : null}
              {definition.previousValue ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Previous: {definition.previousValue}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {definition.form.fields.map((field) => (
              <ObservationFieldInput
                key={field.key}
                field={field}
                value={fieldValues[field.key] ?? ''}
                onChange={(value) => setField(field.key, value)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {definition.form.submitLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedTypeCode(null)
                setFieldValues({})
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          Recorded this visit ({data.recordedCount})
        </h4>
        {data.recordedThisVisit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No observations recorded on this visit yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.recordedThisVisit.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{row.title}</p>
                    {/* Multi-field values (backend joins sub-fields with " · ")
                        render one line per sub-field for full, readable detail. */}
                    {row.valueLabel?.trim() ? (
                      <ul className="mt-0.5 space-y-0.5">
                        {row.valueLabel.split(' · ').map((part, index) => {
                          const sep = part.indexOf(': ')
                          return (
                            <li key={index} className="text-sm leading-relaxed">
                              {sep > 0 ? (
                                <>
                                  <span className="text-muted-foreground">
                                    {part.slice(0, sep)}:
                                  </span>{' '}
                                  <span className="font-medium text-foreground">
                                    {part.slice(sep + 2)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-medium text-foreground">{part}</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-sm text-muted-foreground">Recorded</p>
                    )}
                    {row.statusLabel ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.statusLabel}</p>
                    ) : null}
                    {row.notes?.trim() ? (
                      <div className="mt-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Observation notes
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {row.notes}
                        </p>
                      </div>
                    ) : null}
                    <VoiceNoteList
                      voiceNotes={voiceNoteLookup.forSource('observation', row.id)}
                      label="Carer voice notes"
                    />
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatOrganisationDateTime(row.recordedAt)}
                  </p>
                </div>
                {row.bodyMapPins && row.bodyMapPins.length > 0 ? (
                  <div className="mt-2 rounded-md border border-sky-200 bg-sky-50/60 px-2.5 py-2 dark:border-sky-900 dark:bg-sky-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
                      <MapPin className="h-3 w-3" aria-hidden />
                      Body map — {row.bodyMapPins.length} location{row.bodyMapPins.length === 1 ? '' : 's'} marked
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {row.bodyMapPins.map((pin, idx) => (
                        <li key={idx} className="text-xs text-sky-700 dark:text-sky-300">
                          {pin.part}
                          <span className="ml-1 text-sky-500">
                            ({pin.recordView ?? pin.view} · {pin.x.toFixed(1)}, {pin.y.toFixed(1)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <VisitPhotoThumbnails photos={row.photos} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ObservationFieldInput({
  field,
  value,
  onChange,
}: {
  field: VisitObservationFormField
  value: string
  onChange: (value: string) => void
}) {
  const id = `visit-obs-field-${field.key}`

  if (field.inputType === 'select' || field.inputType === 'score') {
    const options =
      field.options && field.options.length > 0
        ? field.options
        : field.inputType === 'score' && field.min != null && field.max != null
          ? Array.from({ length: field.max - field.min + 1 }, (_, i) => {
              const n = (field.min ?? 0) + i
              return { value: String(n), label: String(n) }
            })
          : []
    return (
      <div className="space-y-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {field.label}
          {field.required ? ' *' : ''}
        </Label>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-9">
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helperText ? (
          <p className="text-[11px] text-muted-foreground">{field.helperText}</p>
        ) : null}
      </div>
    )
  }

  if (field.inputType === 'boolean') {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {field.label}
          {field.required ? ' *' : ''}
        </Label>
        <div className="flex gap-2">
          {[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold',
                value === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (field.inputType === 'textarea') {
    return (
      <div className="space-y-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {field.label}
          {field.required ? ' *' : ''}
        </Label>
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={field.placeholder ?? undefined}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {field.label}
        {field.unit ? ` (${field.unit})` : ''}
        {field.required ? ' *' : ''}
      </Label>
      <Input
        id={id}
        type={field.inputType === 'number' ? 'number' : 'text'}
        inputMode={field.inputType === 'number' ? 'decimal' : undefined}
        step={field.step ?? undefined}
        min={field.min ?? undefined}
        max={field.max ?? undefined}
        value={value}
        placeholder={field.placeholder ?? undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.helperText ? (
        <p className="text-[11px] text-muted-foreground">{field.helperText}</p>
      ) : null}
    </div>
  )
}
