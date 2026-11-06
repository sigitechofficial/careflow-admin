import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Textarea } from '@/shared/ui/form-field'
import {
  ContributingFactorDetailEditor,
  ContributingFactorsReadView,
  type FactorRecordOptions,
} from '@/features/incidents/components/ContributingFactorDetail'
import {
  INVESTIGATION_RECORDS_REVIEWED_OPTIONS,
  type ContributingFactorDetail,
  type ContributingFactorDetails,
  type InvestigationRecord,
} from '@/features/incidents/types'

export type InvestigationEvidenceValues = {
  recordsReviewed: string[]
  recordsReviewedDetails: ContributingFactorDetails
  evidenceNotes: string
  outstandingEvidence: string
}

export function initialEvidenceValues(
  investigation: InvestigationRecord | null,
): InvestigationEvidenceValues {
  return {
    recordsReviewed: investigation?.recordsReviewed ?? [],
    recordsReviewedDetails: investigation?.recordsReviewedDetails ?? {},
    evidenceNotes: investigation?.evidenceNotes ?? '',
    outstandingEvidence: investigation?.outstandingEvidence ?? '',
  }
}

const recordLabel = (code: string) =>
  INVESTIGATION_RECORDS_REVIEWED_OPTIONS.find((o) => o.value === code)?.label ?? code

/** A titled sub-section that can be collapsed, with an optional count. */
function SubSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
        {count !== undefined && count > 0 ? ` (${count})` : ''}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </div>
  )
}

/** Evidence (part A): records reviewed with links, evidence notes, outstanding evidence. */
export function InvestigationEvidenceForm({
  values,
  onChange,
  recordOptions,
  involvedEmployees,
  hasServiceUser,
}: {
  values: InvestigationEvidenceValues
  onChange: (patch: Partial<InvestigationEvidenceValues>) => void
  recordOptions: FactorRecordOptions
  involvedEmployees: { id: string; name: string | null }[]
  hasServiceUser: boolean
}) {
  const toggle = (code: string) =>
    onChange({
      recordsReviewed: values.recordsReviewed.includes(code)
        ? values.recordsReviewed.filter((c) => c !== code)
        : [...values.recordsReviewed, code],
    })
  const setDetail = (code: string, detail: ContributingFactorDetail) =>
    onChange({ recordsReviewedDetails: { ...values.recordsReviewedDetails, [code]: detail } })

  return (
    <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What the investigation reviewed and relied on before reaching findings. Optional while
          investigating.
        </p>
      </div>

      <SubSection title="Records reviewed" count={values.recordsReviewed.length}>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {INVESTIGATION_RECORDS_REVIEWED_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={values.recordsReviewed.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              {o.label}
            </label>
          ))}
        </div>
        {values.recordsReviewed.length > 0 && (
          <div className="mt-2 space-y-2">
            {INVESTIGATION_RECORDS_REVIEWED_OPTIONS.filter((o) =>
              values.recordsReviewed.includes(o.value),
            ).map((o) => (
              <ContributingFactorDetailEditor
                key={o.value}
                label={o.label}
                config={{ pick: o.pick, question: o.question }}
                detail={values.recordsReviewedDetails[o.value] ?? {}}
                onChange={(d) => setDetail(o.value, d)}
                recordOptions={recordOptions}
                involvedEmployees={involvedEmployees}
                hasServiceUser={hasServiceUser}
              />
            ))}
          </div>
        )}
      </SubSection>

      <SubSection title="Evidence notes">
        <p className="text-xs text-muted-foreground">
          Record anything important identified while reviewing the available records.
        </p>
        <Textarea
          className="mt-1"
          rows={3}
          value={values.evidenceNotes}
          onChange={(e) => onChange({ evidenceNotes: e.target.value })}
          aria-label="Evidence notes"
        />
      </SubSection>

      <SubSection title="Outstanding evidence">
        <p className="text-xs text-muted-foreground">
          Evidence still awaited or unavailable — for example: GP report requested and not yet
          received, police statement unavailable, family member not yet contacted, MAR record
          incomplete.
        </p>
        <Textarea
          className="mt-1"
          rows={2}
          value={values.outstandingEvidence}
          onChange={(e) => onChange({ outstandingEvidence: e.target.value })}
          aria-label="Outstanding evidence"
        />
      </SubSection>
    </div>
  )
}

/** Read-only evidence. Nothing is shown when no evidence was recorded. */
export function InvestigationEvidenceReadView({ investigation }: { investigation: InvestigationRecord }) {
  const kinds = investigation.recordsReviewed ?? []
  if (!kinds.length && !investigation.evidenceNotes && !investigation.outstandingEvidence) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
      {kinds.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Records reviewed ({kinds.length})
          </p>
          <ContributingFactorsReadView
            factors={kinds}
            details={investigation.recordsReviewedDetails}
            labelFor={recordLabel}
          />
        </div>
      )}
      {investigation.evidenceNotes && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence notes</p>
          <p className="mt-0.5 whitespace-pre-wrap text-foreground">{investigation.evidenceNotes}</p>
        </div>
      )}
      {investigation.outstandingEvidence && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding evidence</p>
          <p className="mt-0.5 whitespace-pre-wrap text-foreground">
            {investigation.outstandingEvidence}
          </p>
        </div>
      )}
    </div>
  )
}
