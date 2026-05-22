import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { fetchServiceUser, type ServiceUserDetail } from '@/lib/service-users-api'
import { getCareForm } from '@/features/care-pathway/api/form-builder.api'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import { CarePathwayFormRenderer } from '@/features/service-users/care-plan/CarePathwayFormRenderer'
import {
  loadCarePlanDraft,
  saveCarePlanDraft,
  type CarePlanDraftValues,
} from '@/features/service-users/care-plan/care-plan-draft-storage'
import { ServiceUserModuleTabs } from '@/components/service-user/ServiceUserModuleTabs'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { toastError, toastSuccess } from '@/lib/toast'

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

  const [detail, setDetail] = React.useState<ServiceUserDetail | null>(null)
  const [form, setForm] = React.useState<CareFormDetail | null>(null)
  const [values, setValues] = React.useState<CarePlanDraftValues>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!serviceUserId || !formId || !getApiBaseUrl()) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [su, f] = await Promise.all([fetchServiceUser(serviceUserId), getCareForm(formId)])
        if (cancelled) return
        setDetail(su)
        setForm(f)
        setValues(loadCarePlanDraft(serviceUserId, formId))
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load care plan form')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [serviceUserId, formId])

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
