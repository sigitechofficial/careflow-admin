import * as React from 'react'
import { ChevronDown, ClipboardCopy } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePlanConditionFactsheet } from '@/features/service-users/care-plans/types'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { toastSuccess } from '@/shared/lib/toast'
import { carePlanFieldLabel } from '@/features/service-users/care-plan/care-plan-first-person-labels'

function fieldKey(sectionId: string, fieldId: string) {
  return `${sectionId}:${fieldId}`
}

function insertableFields(form: CareFormDetail) {
  const types = new Set(['TEXTAREA', 'RICH_TEXT', 'SUMMERNOTE'])
  const rows: Array<{ key: string; label: string }> = []
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (!types.has(field.fieldType)) continue
      rows.push({
        key: fieldKey(section.id, field.id),
        label: `${section.title} — ${carePlanFieldLabel(field.label)}`,
      })
    }
  }
  return rows
}

export function CarePlanFactsheetPanel({
  factsheets,
  form,
  values,
  onChange,
  readOnly,
}: {
  factsheets: CarePlanConditionFactsheet[]
  form: CareFormDetail
  values: CarePlanDraftValues
  onChange: (values: CarePlanDraftValues) => void
  readOnly?: boolean
}) {
  const [open, setOpen] = React.useState(true)
  const [targetFieldKey, setTargetFieldKey] = React.useState('')
  const fields = React.useMemo(() => insertableFields(form), [form])

  React.useEffect(() => {
    if (!targetFieldKey && fields[0]) {
      setTargetFieldKey(fields[0].key)
    }
  }, [fields, targetFieldKey])

  if (factsheets.length === 0) return null

  const onCopy = async (plainText: string) => {
    try {
      await navigator.clipboard.writeText(plainText)
      toastSuccess('Factsheet copied.')
    } catch {
      toastSuccess('Could not copy to clipboard.')
    }
  }

  const onInsert = (plainText: string) => {
    if (readOnly || !targetFieldKey) return
    const existing = values[targetFieldKey]
    const prefix =
      typeof existing === 'string' && existing.trim() ? `${existing.trim()}\n\n` : ''
    onChange({ ...values, [targetFieldKey]: `${prefix}${plainText}` })
    toastSuccess('Factsheet inserted into field.')
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm" data-testid="care-plan-factsheet-panel">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          Condition factsheets ({factsheets.length})
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-3">
          {!readOnly && fields.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Insert into</span>
              <Select value={targetFieldKey} onValueChange={setTargetFieldKey}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map(field => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <ul className="space-y-3">
            {factsheets.map(sheet => (
              <li key={sheet.code} className="rounded-md border border-border bg-muted/20 px-3 py-3 text-sm">
                <p className="font-medium text-foreground">{sheet.title}</p>
                <p className="mt-1 text-muted-foreground">{sheet.summary}</p>
                <RichTextHtml
                  className="prose prose-sm mt-3 max-w-none dark:prose-invert"
                  html={sheet.contentHtml}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void onCopy(sheet.plainText)}>
                    <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
                    Copy text
                  </Button>
                  {!readOnly && fields.length > 0 ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onInsert(sheet.plainText)}>
                      Insert into field
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
