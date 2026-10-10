import * as React from 'react'
import { Lock, MessageSquarePlus, PencilLine } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useAddIncidentClarification } from '@/features/incidents/hooks/useIncidents'
import type {
  IncidentClarificationField,
  IncidentClarificationNote,
  IncidentCorrectionEntry,
} from '@/features/incidents/types'

/** Wraps the Raise tab so the badges / lock icons can show tooltips. */
export function CorrectionMarksProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
}

/**
 * "Corrected" badge next to a field that a manager has corrected. Hover shows every correction
 * to it: old → new value, who, when and why.
 */
export function CorrectedBadge({
  corrections,
  fieldKeys,
}: {
  corrections: IncidentCorrectionEntry[] | undefined
  fieldKeys: string[]
}) {
  const rows = (corrections ?? []).filter((c) => fieldKeys.includes(c.fieldKey))
  if (rows.length === 0) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold normal-case tracking-normal text-warning"
          aria-label="Corrected — show what changed"
        >
          <PencilLine className="h-3 w-3" aria-hidden /> Corrected
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="text-xs">
            <p className="font-medium text-foreground">{c.fieldLabel}</p>
            <p className="text-muted-foreground">
              <span className="line-through">{c.fromLabel ?? '—'}</span> → {c.toLabel ?? '—'}
            </p>
            <p className="text-muted-foreground">
              {c.correctedByName ?? 'Unknown'} · {formatOrganisationDateTime(c.createdAt)}
            </p>
            <p className="text-foreground">Reason: {c.reason}</p>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

/** Lock icon for fields that can never be corrected (with why). */
export function LockedMark({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
          aria-label={reason}
        >
          <Lock className="h-3 w-3" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{reason}</TooltipContent>
    </Tooltip>
  )
}

export const REPORTER_ACCOUNT_LOCK = "Carer's account — can't be changed. Add a clarification note."
export const SYSTEM_FIELD_LOCK = "Set when the incident was recorded — can't be changed."

/**
 * Manager clarification notes under a part of the reporter's account, plus "Add clarification".
 * Notes are never edited or deleted.
 */
export function ClarificationNotes({
  incidentId,
  field,
  notes,
  canAdd,
}: {
  incidentId: string
  field: IncidentClarificationField
  notes: IncidentClarificationNote[] | undefined
  canAdd: boolean
}) {
  const add = useAddIncidentClarification(incidentId)
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState('')
  const rows = (notes ?? []).filter((n) => n.field === field)
  if (rows.length === 0 && !canAdd) return null
  return (
    <div className="mt-1.5 space-y-1.5">
      {rows.map((n) => (
        <div key={n.id} className="rounded-md border-l-2 border-info bg-info/5 px-3 py-1.5 text-sm">
          <p className="text-xs text-muted-foreground">
            Clarification · {n.createdByName ?? 'Unknown'} · {formatOrganisationDateTime(n.createdAt)}
          </p>
          <p className="whitespace-pre-wrap text-foreground">{n.note}</p>
        </div>
      ))}
      {canAdd &&
        (open ? (
          <div className="space-y-2 rounded-md border border-dashed border-border p-2">
            <Textarea
              rows={2}
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What needs clarifying? The original text stays as it is."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!text.trim()}
                loading={add.isPending}
                onClick={() =>
                  add.mutate(
                    { field, note: text.trim() },
                    {
                      onSuccess: () => {
                        setText('')
                        setOpen(false)
                      },
                    },
                  )
                }
              >
                Add clarification
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> Add clarification
          </button>
        ))}
    </div>
  )
}
