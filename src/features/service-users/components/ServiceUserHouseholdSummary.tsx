import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import type { InitialAssessmentAnswer } from '@/features/service-users/initial-assessment/types'
import {
  useInitialAssessmentAnswers,
  useInitialAssessmentSubmissions,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'

/**
 * Read-only "Household & family" panel for the DOM Care tab. Pulls lives-with /
 * next-of-kin information straight from the latest Initial Assessment submission
 * so carers see it without it being re-asked or duplicated. Source of truth stays
 * the Initial Assessment — this panel never edits.
 */

function normalize(text: string): string {
  return text
    .trim()
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Some Initial Assessment text answers contain pasted rich HTML — show plain text only. */
function stripHtml(s: string): string {
  if (!/[<>]/.test(s)) return s.trim()
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function answerText(a?: InitialAssessmentAnswer): string {
  if (!a) return ''
  if (a.booleanValue !== null && a.booleanValue !== undefined) return a.booleanValue ? 'Yes' : 'No'
  if (a.textValue) return stripHtml(a.textValue)
  const opts = a.selectedOptions
  if (Array.isArray(opts)) {
    return opts
      .map((o) =>
        typeof o === 'string'
          ? o
          : o && typeof o === 'object' && 'label' in (o as Record<string, unknown>)
            ? String((o as Record<string, unknown>).label)
            : String(o),
      )
      .filter(Boolean)
      .join(', ')
  }
  if (typeof opts === 'string' && opts.trim()) return opts.trim()
  if (a.numberValue !== null && a.numberValue !== undefined) return String(a.numberValue)
  if (a.dateValue) return a.dateValue
  return ''
}

// Question text (in the Initial Assessment) → the label we show in DOM Care.
const LIVING_FIELDS: Array<{ question: string; label: string }> = [
  { question: 'Does the client live alone?', label: 'Lives alone' },
  { question: 'Type of living accommodation', label: 'Accommodation type' },
  { question: 'Other accommodation (please state)', label: 'Other accommodation' },
]

const FAMILY_FIELDS: Array<{ question: string; label: string }> = [
  { question: 'Family, representative, next of kin, advocate, key contacts', label: 'Next of kin / key contacts' },
  { question: 'Representative relationship', label: 'Representative relationship' },
  { question: 'Representative name', label: 'Representative name' },
  { question: 'Does the client receive support from an informal carer?', label: 'Informal carer support' },
  { question: 'Informal carer name', label: 'Informal carer name' },
  { question: 'Informal carer contact (if different)', label: 'Informal carer contact' },
]

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(160px,220px)_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ServiceUserHouseholdSummary({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canReadIA = can('service_users.initial_assessment.read') || can('service_users.read')

  const submissionsQuery = useInitialAssessmentSubmissions(serviceUserId, canReadIA)
  const submissions = submissionsQuery.data ?? []

  // Prefer the most recently touched submission (submitted → completed → created).
  const latest = React.useMemo(() => {
    if (submissions.length === 0) return null
    const when = (s: (typeof submissions)[number]) =>
      s.submittedAt ?? s.completedAt ?? s.updatedAt ?? s.createdAt ?? ''
    return [...submissions].sort((a, b) => when(b).localeCompare(when(a)))[0]
  }, [submissions])

  const answersQuery = useInitialAssessmentAnswers(serviceUserId, latest?.id ?? null, canReadIA)

  const byQuestion = React.useMemo(() => {
    const map = new Map<string, InitialAssessmentAnswer>()
    for (const a of answersQuery.data ?? []) {
      const text = a.question?.questionText
      if (text) map.set(normalize(text), a)
    }
    return map
  }, [answersQuery.data])

  const pick = (fields: Array<{ question: string; label: string }>) =>
    fields
      .map((f) => ({ label: f.label, value: answerText(byQuestion.get(normalize(f.question))) }))
      .filter((r) => r.value)

  if (!canReadIA) return null

  const loading =
    submissionsQuery.isLoading || (Boolean(latest) && answersQuery.isLoading)

  const living = pick(LIVING_FIELDS)
  const family = pick(FAMILY_FIELDS)
  const hasAny = living.length > 0 || family.length > 0

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Household &amp; family</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          From Initial Assessment · read-only
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !latest ? (
        <p className="text-sm text-muted-foreground">
          No Initial Assessment has been started for this client yet.
        </p>
      ) : !hasAny ? (
        <p className="text-sm text-muted-foreground">
          Household and family details have not been recorded in the Initial Assessment yet.
        </p>
      ) : (
        <div className="space-y-5">
          {living.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Living situation</p>
              <dl className="space-y-2">
                {living.map((r) => (
                  <Row key={r.label} label={r.label} value={r.value} />
                ))}
              </dl>
            </div>
          )}
          {family.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Family &amp; informal carers
              </p>
              <dl className="space-y-2">
                {family.map((r) => (
                  <Row key={r.label} label={r.label} value={r.value} />
                ))}
              </dl>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            To change these, edit the client’s Initial Assessment (Social history).
          </p>
        </div>
      )}
    </section>
  )
}
