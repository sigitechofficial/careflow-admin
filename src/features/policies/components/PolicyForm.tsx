import * as React from 'react'
import { PenLine, Upload } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { RichTextEditor } from '@/shared/ui/rich-text-editor'
import {
  PolicyApplicabilityEditor,
  validateApplicability,
} from '@/features/policies/components/PolicyApplicabilityEditor'
import { PolicyAudienceEditor } from '@/features/policies/components/PolicyAudienceEditor'
import { PolicyDocumentUploader } from '@/features/policies/components/PolicyDocumentUploader'
import { PolicyLinksEditor } from '@/features/policies/components/PolicyLinksEditor'
import { PolicyTagPicker } from '@/features/policies/components/PolicyTagPicker'
import { usePolicyCategories } from '@/features/policies/hooks/usePolicies'
import { usePolicyLookups } from '@/features/policies/hooks/usePolicyLookups'
import {
  buildPolicyContent,
  editorHtmlFromVersion,
  isBlankPolicyHtml,
  isPolicyTiptapDoc,
} from '@/features/policies/policy-content'
import { cn } from '@/shared/lib/utils'
import type {
  PolicyApplicabilityInput,
  PolicyAudienceInput,
  PolicyDocument,
  PolicyDocumentType,
  PolicyLinkInput,
  PolicyVersion,
  PolicyWriteInput,
} from '@/features/policies/types/policy.types'
import { POLICY_DOCUMENT_TYPE_OPTIONS } from '@/features/policies/types/policy.types'
import { POLICY_PATHS } from '@/features/policies/policy-routes'

export type PolicyContentMode = 'EDITOR' | 'UPLOAD'

export type PolicyFormValues = {
  title: string
  reference: string
  documentType: PolicyDocumentType
  primaryCategoryId: string
  description: string
  ownerId: string
  reviewerId: string
  approverId: string
  effectiveDate: string
  reviewDate: string
  acknowledgementRequired: boolean
  contentMode: PolicyContentMode
  contentHtml: string
  contentJson: Record<string, unknown> | null
  uploadedFile: { fileName: string; mimeType: string; fileSize: number } | null
  pendingFileName: string
  tagIds: string[]
  applicability: PolicyApplicabilityInput[]
  audiences: PolicyAudienceInput[]
  links: PolicyLinkInput[]
}

export function emptyPolicyForm(userId: string, organisationWide: boolean): PolicyFormValues {
  return {
    title: '',
    reference: '',
    documentType: 'POLICY',
    primaryCategoryId: '',
    description: '',
    ownerId: userId,
    reviewerId: '',
    approverId: '',
    effectiveDate: '',
    reviewDate: '',
    // Policies are read and signed by default (as in Access Policies & Procedures).
    acknowledgementRequired: true,
    contentMode: 'EDITOR',
    contentHtml: '',
    contentJson: null,
    uploadedFile: null,
    pendingFileName: '',
    tagIds: [],
    applicability: organisationWide ? [{ organisationWide: true }] : [{ organisationWide: false }],
    audiences: [],
    links: [],
  }
}

export function formFromPolicy(document: PolicyDocument, version: PolicyVersion | null, userId: string): PolicyFormValues {
  const current = version ?? document.currentVersion
  const uploaded =
    current?.hasDocument && current.fileName
      ? { fileName: current.fileName, mimeType: current.mimeType ?? '', fileSize: current.fileSize ?? 0 }
      : null
  return {
    title: document.title,
    reference: document.reference,
    documentType: document.documentType,
    primaryCategoryId: document.primaryCategoryId,
    description: document.description ?? '',
    ownerId: document.ownerId ?? userId,
    reviewerId: document.reviewerId ?? '',
    approverId: document.approverId ?? '',
    effectiveDate: current?.effectiveDate ?? '',
    reviewDate: current?.reviewDate ?? '',
    acknowledgementRequired: current?.acknowledgementRequired ?? false,
    contentMode: uploaded ? 'UPLOAD' : 'EDITOR',
    contentHtml: editorHtmlFromVersion(current?.contentJson, current?.contentHtml),
    contentJson: isPolicyTiptapDoc(current?.contentJson) ? current.contentJson.doc : null,
    uploadedFile: uploaded,
    pendingFileName: '',
    tagIds: document.tags.map(tag => tag.id),
    applicability: (current?.applicability ?? []).map(row => ({
      organisationWide: row.organisationWide,
      ...(row.locationId ? { locationId: row.locationId } : {}),
      ...(row.serviceTypeCode ? { serviceTypeCode: row.serviceTypeCode } : {}),
    })),
    audiences: (current?.audiences ?? []).map(row => ({
      targetType: row.targetType,
      ...(row.roleId ? { roleId: row.roleId } : {}),
      ...(row.jobTitleId ? { jobTitleId: row.jobTitleId } : {}),
      ...(row.workAreaId ? { workAreaId: row.workAreaId } : {}),
      ...(row.locationId ? { locationId: row.locationId } : {}),
    })),
    links: (current?.links ?? []).map(row => ({
      moduleType: row.moduleType,
      scope: row.scope,
      ...(row.recordId ? { recordId: row.recordId } : {}),
      ...(row.sectionKey ? { sectionKey: row.sectionKey } : {}),
      ...(row.label ? { label: row.label } : {}),
    })),
  }
}

export function policyFormToWriteInput(values: PolicyFormValues): PolicyWriteInput {
  const content = buildPolicyContent(values.contentHtml, values.contentJson)
  const applicability = values.applicability.filter(
    row => row.organisationWide || Boolean(row.locationId) || Boolean(row.serviceTypeCode),
  )
  const audiences = values.audiences.filter(row => {
    if (row.targetType === 'ALL_EMPLOYEES') return true
    if (row.targetType === 'ROLE') return Boolean(row.roleId)
    if (row.targetType === 'JOB_TITLE') return Boolean(row.jobTitleId)
    if (row.targetType === 'WORK_AREA') return Boolean(row.workAreaId)
    if (row.targetType === 'LOCATION') return Boolean(row.locationId)
    return false
  })
  const links = values.links.filter(row => {
    if (row.scope === 'MODULE') return true
    if (row.scope === 'SECTION') return Boolean(row.sectionKey?.trim())
    return Boolean(row.recordId)
  })
  const payload: PolicyWriteInput = {
    title: values.title.trim(),
    reference: values.reference.trim(),
    documentType: values.documentType,
    primaryCategoryId: values.primaryCategoryId,
    source: values.contentMode,
  }
  if (values.description.trim()) payload.description = values.description.trim()
  if (values.ownerId) payload.ownerId = values.ownerId
  if (values.reviewerId) payload.reviewerId = values.reviewerId
  if (values.approverId) payload.approverId = values.approverId
  if (values.effectiveDate) payload.effectiveDate = values.effectiveDate
  if (values.reviewDate) payload.reviewDate = values.reviewDate
  payload.acknowledgementRequired = values.acknowledgementRequired
  if (values.tagIds.length) payload.tagIds = values.tagIds
  if (applicability.length) payload.applicability = applicability
  if (audiences.length) payload.audiences = audiences
  if (links.length) payload.links = links
  if (values.contentMode === 'EDITOR' && !isBlankPolicyHtml(content.contentHtml)) {
    payload.contentJson = content.contentJson
    payload.contentHtml = content.contentHtml
  }
  return payload
}

type Props = {
  values: PolicyFormValues
  onChange: (values: PolicyFormValues) => void
  onSubmit: () => void
  submitLabel: string
  pending?: boolean
  readOnly?: boolean
  errors?: Partial<Record<keyof PolicyFormValues, string>>
  /** When false, Save draft stays disabled (no change to persist). Defaults to true. */
  hasChanges?: boolean
  pendingFile?: File | null
  onPendingFileChange?: (file: File | null) => void
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  uploadError?: string | null
  onRemoveUploaded?: () => void
  removingDocument?: boolean
}

export function PolicyForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  pending,
  readOnly,
  errors,
  hasChanges = true,
  pendingFile = null,
  onPendingFileChange,
  uploadStatus = 'idle',
  uploadProgress = 0,
  uploadError = null,
  onRemoveUploaded,
  removingDocument,
}: Props) {
  const user = useAuthStore(s => s.user)
  const categoriesQuery = usePolicyCategories({ limit: 100, isActive: true })
  const lookups = usePolicyLookups()
  const categories = categoriesQuery.data?.rows ?? []
  const patch = (partial: Partial<PolicyFormValues>) => onChange({ ...values, ...partial })

  const sourceOption = (mode: PolicyContentMode, title: string, hint: string, Icon: typeof PenLine, testId: string) => {
    const selected = values.contentMode === mode
    return (
      <button
        type="button"
        disabled={readOnly}
        data-testid={testId}
        aria-pressed={selected}
        onClick={() => patch({ contentMode: mode })}
        className={cn(
          'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
          selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/40',
          readOnly && 'opacity-70',
        )}
      >
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
        </span>
      </button>
    )
  }

  return (
    <form
      className="divide-y divide-border"
      noValidate
      onSubmit={e => {
        e.preventDefault()
        onSubmit()
      }}
      data-testid="policy-form"
    >
      <FormSection
        step={1}
        title="Basic information"
        description="Name the policy, give it a reference and choose where it sits in the library."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Policy title" required htmlFor="policy-title" error={errors?.title}>
            <Input
              id="policy-title"
              value={values.title}
              onChange={e => patch({ title: e.target.value })}
              placeholder="e.g. Safeguarding Adults Policy"
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Reference" required htmlFor="policy-reference" error={errors?.reference}>
            <Input
              id="policy-reference"
              value={values.reference}
              onChange={e => patch({ reference: e.target.value })}
              placeholder="e.g. POL-SG-001"
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Document type" required htmlFor="policy-document-type">
            <Combobox
              id="policy-document-type"
              value={values.documentType}
              onChange={v => patch({ documentType: v as PolicyDocumentType })}
              options={POLICY_DOCUMENT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              allowDeselect={false}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Category" required htmlFor="policy-category" error={errors?.primaryCategoryId}>
            <Combobox
              id="policy-category"
              value={values.primaryCategoryId}
              onChange={v => patch({ primaryCategoryId: v })}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
              placeholder={
                categoriesQuery.isLoading
                  ? 'Loading categories…'
                  : categories.length === 0
                    ? 'No categories yet'
                    : 'Select category'
              }
              loading={categoriesQuery.isLoading}
              disabled={readOnly}
              emptyText="No categories found. Create one on the Categories page."
            />
            {!categoriesQuery.isLoading && categories.length === 0 ? (
              <p className="text-sm text-destructive" role="alert" data-testid="policy-category-empty">
                Create a category on the{' '}
                <a className="underline" href={POLICY_PATHS.categories}>
                  Categories
                </a>{' '}
                page before saving a draft. Searching here does not create a category.
              </p>
            ) : null}
          </FormField>
        </div>
        <FormField label="Description" htmlFor="policy-description">
          <Textarea
            id="policy-description"
            value={values.description}
            onChange={e => patch({ description: e.target.value })}
            rows={3}
            placeholder="A short summary of what this policy covers"
            disabled={readOnly}
          />
        </FormField>
      </FormSection>

      <FormSection
        step={2}
        title="Policy content"
        description="Write the policy here, or upload the PDF or Word document you already have."
        testId="policy-content-source"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {sourceOption('EDITOR', 'Write policy', 'Create and format the policy inside CareFlow.', PenLine, 'policy-source-editor')}
          {sourceOption('UPLOAD', 'Upload document', 'Upload an existing PDF or Word policy.', Upload, 'policy-source-upload')}
        </div>
        {values.contentMode === 'EDITOR' ? (
          <FormField label="Policy text" htmlFor="policy-content" error={errors?.contentHtml}>
            <div data-testid="policy-rich-text-editor">
              <RichTextEditor
                value={values.contentHtml}
                placeholder="Write the policy…"
                disabled={readOnly}
                minHeight={280}
                onChange={(html, json) => patch({ contentHtml: html, contentJson: json ?? values.contentJson })}
              />
            </div>
          </FormField>
        ) : (
          <FormField label="Source document" error={errors?.contentHtml}>
            <PolicyDocumentUploader
              uploaded={values.uploadedFile}
              pendingFile={pendingFile}
              status={uploadStatus === 'idle' && (pendingFile || values.uploadedFile) ? 'success' : uploadStatus}
              progress={uploadProgress}
              error={uploadError}
              disabled={readOnly}
              onSelectFile={file => {
                onPendingFileChange?.(file)
                patch({ pendingFileName: file.name })
              }}
              onClearPending={() => {
                onPendingFileChange?.(null)
                patch({ pendingFileName: '', uploadedFile: values.uploadedFile })
              }}
              onRemoveUploaded={() => {
                onPendingFileChange?.(null)
                patch({ pendingFileName: '', uploadedFile: null })
                onRemoveUploaded?.()
              }}
              removing={removingDocument}
            />
          </FormField>
        )}
      </FormSection>

      <FormSection
        step={3}
        title="Ownership & dates"
        description="Who looks after the policy, when it starts and when it must be reviewed."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Owner" htmlFor="policy-owner">
            <Input
              id="policy-owner"
              value={values.ownerId && values.ownerId === user?.id ? (user?.displayName ?? 'You') : values.ownerId ? 'Assigned owner' : (user?.displayName ?? 'You')}
              disabled
              readOnly
            />
          </FormField>
          <FormField label="Reviewer" htmlFor="policy-reviewer">
            <Combobox
              id="policy-reviewer"
              value={values.reviewerId}
              onChange={v => patch({ reviewerId: v })}
              options={[
                { value: '', label: 'Not assigned' },
                ...(user ? [{ value: user.id, label: user.displayName }] : []),
              ]}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Approver" htmlFor="policy-approver">
            <Combobox
              id="policy-approver"
              value={values.approverId}
              onChange={v => patch({ approverId: v })}
              options={[
                { value: '', label: 'Not assigned' },
                ...(user ? [{ value: user.id, label: user.displayName }] : []),
              ]}
              disabled={readOnly}
            />
          </FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Effective date" htmlFor="policy-effective">
            <Input
              id="policy-effective"
              type="date"
              value={values.effectiveDate}
              onChange={e => patch({ effectiveDate: e.target.value })}
              disabled={readOnly}
            />
          </FormField>
          <FormField label="Review date" htmlFor="policy-review">
            <Input
              id="policy-review"
              type="date"
              value={values.reviewDate}
              onChange={e => patch({ reviewDate: e.target.value })}
              disabled={readOnly}
            />
          </FormField>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm" htmlFor="policy-ack">
          <input
            id="policy-ack"
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={values.acknowledgementRequired}
            onChange={e => patch({ acknowledgementRequired: e.target.checked })}
            disabled={readOnly}
          />
          <span>
            <span className="font-medium text-foreground">Staff must read and acknowledge</span>
            <span className="block text-muted-foreground">
              Once published, everyone in the audience is asked to confirm they have read and understood this version. A new
              version asks them again.
            </span>
          </span>
        </label>
      </FormSection>

      <FormSection
        step={4}
        title="Who it applies to"
        description="The branches and care services this policy covers, and the staff who must read it."
      >
        <PolicyApplicabilityEditor
          value={values.applicability}
          onChange={applicability => patch({ applicability })}
          disabled={readOnly}
          locations={lookups.locations}
          careTypes={lookups.careTypes}
          locationRestricted={lookups.isLocationRestricted}
          error={errors?.applicability}
        />
        <div className="border-t border-border pt-5">
          <PolicyAudienceEditor
            value={values.audiences}
            onChange={audiences => patch({ audiences })}
            disabled={readOnly}
            roles={lookups.roles}
            jobTitles={lookups.jobTitles}
            workAreas={lookups.workAreas}
            locations={lookups.locations}
          />
        </div>
      </FormSection>

      <FormSection
        step={5}
        title="Tags & links"
        description="Optional. Tags help staff find the policy; links show it in the right place in CareFlow."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <PolicyTagPicker value={values.tagIds} onChange={tagIds => patch({ tagIds })} disabled={readOnly} />
        </div>
        <div className="border-t border-border pt-5">
          <PolicyLinksEditor value={values.links} onChange={links => patch({ links })} disabled={readOnly} />
        </div>
      </FormSection>

      {!readOnly ? (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Fields marked <span className="text-destructive">*</span> are required. Saving keeps the policy as a draft; nothing is published yet.
          </p>
          <Button
            type="submit"
            className="ml-auto"
            data-testid="policy-save-draft"
            disabled={pending || uploadStatus === 'uploading'}
          >
            {pending || uploadStatus === 'uploading' ? 'Saving…' : submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

/** A numbered form section: heading and help on the left, fields on the right (stacked on small screens). */
function FormSection({
  step,
  title,
  description,
  testId,
  children,
}: {
  step: number
  title: string
  description: string
  testId?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="grid gap-4 py-7 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"
      data-testid={testId}
    >
      <div className="flex gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold leading-7">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  )
}

export type PolicyFormValidationOptions = {
  locationRestricted?: boolean
  allowedLocationIds?: string[]
  hasPendingFile?: boolean
}

function validatePersistableFields(
  values: PolicyFormValues,
  options: PolicyFormValidationOptions,
  mode: 'draft' | 'review',
): Partial<Record<keyof PolicyFormValues, string>> {
  const errors: Partial<Record<keyof PolicyFormValues, string>> = {}
  if (!values.title.trim()) errors.title = 'Enter a policy title.'
  if (!values.reference.trim()) errors.reference = 'Enter a reference.'
  if (!values.primaryCategoryId) errors.primaryCategoryId = 'Select a category.'
  if (values.effectiveDate && values.reviewDate && values.reviewDate < values.effectiveDate) {
    errors.reviewDate = 'Review date cannot be before the effective date.'
  }
  const applicabilityError = validateApplicability(values.applicability, {
    locationRestricted: options.locationRestricted,
    allowedLocationIds: options.allowedLocationIds,
    mode,
  })
  if (applicabilityError) errors.applicability = applicabilityError
  return errors
}

/** Fields the API must have to create or update a draft. Content, dates, audience, and links may be empty. */
export function validatePolicyDraft(
  values: PolicyFormValues,
  options: PolicyFormValidationOptions = {},
): Partial<Record<keyof PolicyFormValues, string>> {
  return validatePersistableFields(values, options, 'draft')
}

/** Everything required before submitting the policy for review. */
export function validatePolicyForReview(
  values: PolicyFormValues,
  options: PolicyFormValidationOptions = {},
): Partial<Record<keyof PolicyFormValues, string>> {
  const errors = validatePersistableFields(values, options, 'review')
  if (values.contentMode === 'EDITOR' && isBlankPolicyHtml(values.contentHtml)) {
    errors.contentHtml = 'Enter policy content.'
  }
  if (
    values.contentMode === 'UPLOAD' &&
    !values.uploadedFile &&
    !values.pendingFileName &&
    !options.hasPendingFile
  ) {
    errors.contentHtml = 'Upload a PDF or Word document.'
  }
  return errors
}

export function firstPolicyFormError(
  errors: Partial<Record<keyof PolicyFormValues, string>>,
): string | undefined {
  return Object.values(errors).find((message): message is string => Boolean(message))
}

export function validatePolicyForm(
  values: PolicyFormValues,
  options: PolicyFormValidationOptions = {},
): Partial<Record<keyof PolicyFormValues, string>> {
  return validatePolicyForReview(values, options)
}
