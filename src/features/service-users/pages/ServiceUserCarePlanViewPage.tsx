import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Pencil, Printer } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import type { CareFormSectionRow } from '@/features/care-pathway/types/care-pathway.types'
import { isFieldVisible } from '@/features/care-pathway/utils/form-builder-conditional-logic.util'
import { useAuthStore } from '@/features/auth/store'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useCarePlanFormPage } from '@/features/service-users/hooks/useCarePlanFormPage'
import { serviceUserDisplayName } from '@/features/service-users/lib/service-user-display'
import {
  useCarePlanInstance,
  useCarePlanPublishedVersion,
} from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import { CarePlanVersionHistoryPanel } from '@/features/service-users/care-plans/components/CarePlanVersionHistoryPanel'
import {
  CARE_PLAN_META,
  DEPENDENCY_LEVEL_OPTIONS,
  metaString,
} from '@/features/service-users/care-plan/care-plan-form-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { carePlanFieldLabel } from '@/features/service-users/care-plan/care-plan-first-person-labels'
import {
  carePlanValueKey,
  formatCarePlanAnswer,
  type CarePlanReadAnswer,
} from '@/features/service-users/care-plan/care-plan-read-view.util'

/* ─── Small pieces ───────────────────────────────────────────────────── */

function Answer({ answer }: { answer: CarePlanReadAnswer }) {
  switch (answer.kind) {
    case 'empty':
      return <span className="text-sm italic text-muted-foreground">Not recorded</span>
    case 'text':
      return <p className="whitespace-pre-line text-sm text-foreground">{answer.text}</p>
    case 'html':
      return (
        <div
          className="prose prose-sm max-w-none text-foreground dark:prose-invert [&_p]:my-1"
          // Sanitised to the rich-text allow-list (same as the API applies on save).
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(answer.html) }}
        />
      )
    case 'list':
      return (
        <ul className="flex flex-wrap gap-1.5">
          {answer.items.map((item) => (
            <li key={item} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )
    case 'image':
      return (
        <img
          src={answer.src}
          alt={answer.alt}
          className="max-h-40 rounded-md border border-border bg-white object-contain p-1"
        />
      )
    case 'file':
      return <p className="text-sm text-foreground">{answer.name}</p>
  }
}

function DocSection({
  title,
  description,
  children,
  testId,
}: {
  title: string
  description?: string | null
  children: React.ReactNode
  testId?: string
}) {
  return (
    <section
      className="break-inside-avoid rounded-xl border border-border bg-card px-6 py-5 print:border-0 print:px-0"
      data-testid={testId}
    >
      <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
      {description?.trim() ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function QaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-border/70 py-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function FormSections({ sections, values }: { sections: CareFormSectionRow[]; values: CarePlanDraftValues }) {
  return (
    <>
      {sections.map((section) => {
        const fields = section.fields.filter(
          (f) => f.fieldType === 'SECTION_TEXT' || isFieldVisible(f, values),
        )
        if (!fields.length) return null
        return (
          <DocSection
            key={section.id}
            title={section.title}
            description={section.description}
            testId={`care-plan-read-section-${section.id}`}
          >
            <dl>
              {fields.map((field) =>
                field.fieldType === 'SECTION_TEXT' ? (
                  <div key={field.id} className="border-t border-border/70 py-3 text-sm text-muted-foreground first:border-t-0 first:pt-0">
                    {field.label.trim() ? <p className="font-medium text-foreground">{carePlanFieldLabel(field.label)}</p> : null}
                    {field.helpText?.trim() ? <p className="mt-1">{field.helpText}</p> : null}
                  </div>
                ) : (
                  <QaRow key={field.id} label={carePlanFieldLabel(field.label)}>
                    <Answer answer={formatCarePlanAnswer(field, values[carePlanValueKey(section.id, field.id)])} />
                  </QaRow>
                ),
              )}
            </dl>
          </DocSection>
        )
      })}
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

/**
 * The published care plan as a read-only document (latest published version). Editing happens on the
 * care plan form page; publishing there opens this page.
 */
export default function ServiceUserCarePlanViewPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string; formId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const formId = params.formId ?? ''
  const navigate = useNavigate()
  const canUpdate = useAuthStore((s) => s.can('service_users.update'))
  const apiConfigured = Boolean(getApiBaseUrl())

  const { profile, form: formQuery, isLoading } = useCarePlanFormPage(serviceUserId, formId, apiConfigured)
  const instanceQuery = useCarePlanInstance(serviceUserId, formId, apiConfigured && Boolean(formId))
  const latest = instanceQuery.data?.latestPublishedVersion ?? null
  const versionQuery = useCarePlanPublishedVersion(serviceUserId, formId, latest?.id, apiConfigured && Boolean(latest?.id))

  const form = formQuery.data ?? null
  const instance = instanceQuery.data ?? null
  const values: CarePlanDraftValues = versionQuery.data?.values ?? {}
  const loading = isLoading || instanceQuery.isLoading || (Boolean(latest?.id) && versionQuery.isLoading)
  const hasDraft = instance?.displayStatus === 'PUBLISHED_WITH_DRAFT'
  const archived = instance?.lifecycle?.status === 'ARCHIVED'

  const toEditor = () =>
    void navigate({ to: '/service-users/$serviceUserId/care-plan/forms/$formId', params: { serviceUserId, formId } })
  const backToList = () =>
    void navigate({ to: '/service-users/$serviceUserId/care-plan', params: { serviceUserId } })

  const reviewStatus = metaString(values, CARE_PLAN_META.reviewStatus)
  // Same default the editor shows (and publishes from) when no level was picked.
  const dependency = metaString(values, CARE_PLAN_META.dependencyLevel) || DEPENDENCY_LEVEL_OPTIONS[1]
  const nextReview = instance?.nextReviewDueAt ?? metaString(values, CARE_PLAN_META.nextReviewDate)
  const summaries = [
    { label: 'Care plan summary', html: metaString(values, CARE_PLAN_META.carePlanSummary) },
    { label: 'Review and evaluation summary', html: metaString(values, CARE_PLAN_META.reviewSummary) },
  ].filter((s) => formatCarePlanAnswer({ fieldType: 'RICH_TEXT', label: s.label }, s.html).kind !== 'empty')
  const consent = {
    name: metaString(values, CARE_PLAN_META.consentName),
    note: metaString(values, CARE_PLAN_META.consentNote),
    signature: metaString(values, CARE_PLAN_META.signature),
    capacity: metaString(values, CARE_PLAN_META.consentCapacityNotes),
  }
  const hasConsent = Boolean(consent.name.trim() || consent.note.trim() || consent.signature || consent.capacity.trim())

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background print:bg-white" data-testid="care-plan-read-page">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6 print:border-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={backToList}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to care plans
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{form?.name ?? instance?.formName ?? 'Care plan'}</h1>
              {latest ? (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    archived
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
                  )}
                >
                  {archived ? 'Archived' : 'Live'} · Version {latest.versionNumber}
                </span>
              ) : null}
              <CarePlanReviewBadge review={instance?.review} />
            </div>
            <p className="text-sm text-muted-foreground">{serviceUserDisplayName(profile.data ?? null)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={!latest}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
            {canUpdate && !archived ? (
              <Button type="button" size="sm" onClick={toEditor} data-testid="care-plan-read-edit">
                <Pencil className="mr-1.5 h-4 w-4" />
                {hasDraft ? 'Continue editing update' : 'Edit plan'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <ServiceUserModuleTabs serviceUserId={serviceUserId} />
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-3 py-6 sm:px-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !latest || !form ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">This care plan has not been published yet.</p>
            {canUpdate ? (
              <Button type="button" size="sm" className="mt-3" onClick={toEditor}>
                Open the care plan
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {hasDraft ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 print:hidden">
                An update to this plan is in progress. This page shows the published version carers use.{' '}
                <button type="button" onClick={toEditor} className="font-medium underline">
                  Open the update
                </button>
              </p>
            ) : null}

            <section className="grid gap-4 rounded-xl border border-border bg-card px-6 py-5 sm:grid-cols-2 lg:grid-cols-4 print:border-0 print:px-0">
              <MetaItem
                label="Published"
                value={formatOrganisationDateTime(latest.publishedAt)}
              />
              <MetaItem label="Status" value={reviewStatus || 'Active'} />
              <MetaItem label="Dependency level" value={dependency} />
              <MetaItem label="Next review" value={nextReview ? formatOrganisationDate(nextReview) : '—'} />
              {latest.summary?.trim() ? (
                <div className="sm:col-span-2 lg:col-span-4">
                  <MetaItem label="What changed in this version" value={latest.summary} />
                </div>
              ) : null}
            </section>

            {summaries.length ? (
              <DocSection title="Summary" testId="care-plan-read-summary">
                <dl>
                  {summaries.map((s) => (
                    <QaRow key={s.label} label={s.label}>
                      <Answer answer={formatCarePlanAnswer({ fieldType: 'RICH_TEXT', label: s.label }, s.html)} />
                    </QaRow>
                  ))}
                </dl>
              </DocSection>
            ) : null}

            <FormSections sections={form.sections} values={values} />

            {hasConsent ? (
              <DocSection title="Consent" testId="care-plan-read-consent">
                <dl>
                  {consent.name.trim() ? <QaRow label="Consent given by"><Answer answer={{ kind: 'text', text: consent.name }} /></QaRow> : null}
                  {consent.note.trim() ? (
                    <QaRow label="Consent notes">
                      <Answer answer={formatCarePlanAnswer({ fieldType: 'RICH_TEXT', label: 'Consent notes' }, consent.note)} />
                    </QaRow>
                  ) : null}
                  {consent.capacity.trim() ? (
                    <QaRow label="Mental capacity notes">
                      <Answer answer={formatCarePlanAnswer({ fieldType: 'RICH_TEXT', label: 'Mental capacity notes' }, consent.capacity)} />
                    </QaRow>
                  ) : null}
                  {consent.signature ? (
                    <QaRow label="Signature">
                      <Answer answer={formatCarePlanAnswer({ fieldType: 'SIGNATURE', label: 'Consent' }, consent.signature)} />
                    </QaRow>
                  ) : null}
                </dl>
              </DocSection>
            ) : null}

            <div className="print:hidden">
              <CarePlanVersionHistoryPanel serviceUserId={serviceUserId} formId={formId} />
            </div>

            <p className="text-center text-xs text-muted-foreground print:hidden">
              Risk profile, care actions, body map and care history are on the{' '}
              <Link
                to="/service-users/$serviceUserId/care-plan/forms/$formId"
                params={{ serviceUserId, formId }}
                className="font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                care plan workspace
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  )
}
