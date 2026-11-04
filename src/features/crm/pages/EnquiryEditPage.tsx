import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useFocusField } from '@/shared/lib/use-focus-field'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { EnquiryForm } from '@/features/crm/components/EnquiryForm'
import { useEnquiry, useUpdateEnquiry } from '@/features/crm/hooks/useCrm'

export default function EnquiryEditPage() {
  const params = useParams({ strict: false }) as { enquiryId?: string }
  const enquiryId = params.enquiryId ?? ''
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { focus?: string; returnTo?: string }
  const { data: enquiry, isLoading } = useEnquiry(enquiryId)
  const update = useUpdateEnquiry(enquiryId)
  useFocusField(search.focus)

  // Opened from another CRM page (e.g. "what is missing" before creating the service user): go back there.
  const backToDetail = () =>
    search.returnTo
      ? navigate({ to: search.returnTo })
      : navigate({ to: '/crm/$enquiryId', params: { enquiryId } })

  if (isLoading) {
    return (
      <CrmSectionLayout title="Edit enquiry" description="Loading…" testId="crm-edit-loading">
        <LoadingSpinner />
      </CrmSectionLayout>
    )
  }

  if (!enquiry) {
    return (
      <CrmSectionLayout title="Enquiry not found" description="" testId="crm-edit-missing">
        <EmptyState title="Enquiry not found" description="This enquiry may have been removed." />
      </CrmSectionLayout>
    )
  }

  return (
    <CrmSectionLayout
      title={`Edit ${enquiry.referenceNumber}`}
      description={`${enquiry.firstName} ${enquiry.lastName}`}
      testId="crm-edit-page"
      breadcrumbTail={[
        { label: 'Enquiries & Referrals', href: '/crm' },
        { label: enquiry.referenceNumber, href: `/crm/${enquiry.id}` },
        { label: 'Edit' },
      ]}
    >
      <EnquiryForm
        key={enquiry.id}
        initial={enquiry}
        submitLabel="Save changes"
        busy={update.isPending}
        onCancel={backToDetail}
        onSubmit={payload =>
          update.mutate(payload, {
            onSuccess: () => {
              toastSuccess('Enquiry updated')
              backToDetail()
            },
            onError: e => toastApiError(e, 'Could not update enquiry'),
          })
        }
      />
    </CrmSectionLayout>
  )
}
