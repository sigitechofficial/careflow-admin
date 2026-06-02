import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import {
  loadCarePlanDraft,
  saveCarePlanDraft,
  type CarePlanDraftValues,
} from '@/features/service-users/care-plan/care-plan-draft-storage'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { useCarePlanFormPage } from '@/features/service-users/hooks/useCarePlanFormPage'

function displayName(d: ServiceUserDetail | null): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

export default function ServiceUserCarePlanFormPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string; formId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const formId = params.formId ?? ''
  const navigate = useNavigate()
  const canUpdate = useAuthStore(s => s.can('service_users.update'))
  const apiConfigured = Boolean(getApiBaseUrl())

  const { profile, form: formQuery, isLoading, error: loadErrorObj } = useCarePlanFormPage(
    serviceUserId,
    formId,
    apiConfigured,
  )
  const detail = profile.data ?? null
  const form: CareFormDetail | null = formQuery.data ?? null
  const loading = isLoading
  const error =
    loadErrorObj instanceof ApiError
      ? loadErrorObj.message
      : loadErrorObj instanceof Error
        ? loadErrorObj.message
        : null

  const [values, setValues] = React.useState<CarePlanDraftValues>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (form && serviceUserId && formId) {
      setValues(loadCarePlanDraft(serviceUserId, formId))
    }
  }, [form, serviceUserId, formId])

  const onSave = () => {
    if (!serviceUserId || !formId) return
    setSaving(true)
    try {
      saveCarePlanDraft(serviceUserId, formId, values)
      toastSuccess('Care plan saved.')
    } catch {
      toastError('Could not save care plan.')
    } finally {
      setSaving(false)
    }
  }

  const backToList = () => {
    void navigate({
      to: '/service-users/$serviceUserId/care-plan',
      params: { serviceUserId },
    })
  }

  if (!serviceUserId || !formId) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Missing service user or form.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </p>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={backToList}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to care plans
            </button>
            <h1 className="text-xl font-semibold text-foreground">{form?.name ?? 'Care plan'}</h1>
            <p className="text-sm text-muted-foreground">{displayName(detail)}</p>
          </div>
        </div>
      </div>

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-6 sm:px-4">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && form && (
          <div className="space-y-6">
            {form.description?.trim() ? (
              <div
                className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-sm"
                data-testid="care-plan-form-description"
              >
                {form.description.trim()}
              </div>
            ) : null}
            <CarePathwayFormRenderer
              form={form}
              values={values}
              onChange={setValues}
              disabled={!canUpdate}
            />
            {canUpdate && (
              <div
                className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6"
                data-testid="care-plan-form-save-footer"
              >
                <Button type="button" variant="outline" onClick={backToList} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save care plan'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
