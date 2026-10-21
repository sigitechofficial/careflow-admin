import { useNavigate } from '@tanstack/react-router'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { EnquiryForm } from '@/features/crm/components/EnquiryForm'
import { useCreateEnquiry } from '@/features/crm/hooks/useCrm'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

export default function EnquiryNewPage() {
  const navigate = useNavigate()
  const create = useCreateEnquiry()
  const { locationId: headerLocationId } = useGlobalLocationScope()

  return (
    <CrmSectionLayout
      title="New enquiry"
      description="Capture a new care enquiry or referral."
      testId="crm-new-page"
      breadcrumbTail={[{ label: 'Enquiries', href: '/crm' }, { label: 'New enquiry' }]}
    >
      <EnquiryForm
        submitLabel="Create enquiry"
        defaultLocationId={headerLocationId}
        checkDuplicates
        busy={create.isPending}
        onCancel={() => navigate({ to: '/crm' })}
        onSubmit={payload =>
          create.mutate(payload, {
            onSuccess: created => {
              toastSuccess('Enquiry created')
              navigate({ to: '/crm/$enquiryId', params: { enquiryId: created.id } })
            },
            onError: e => toastApiError(e, 'Could not create enquiry'),
          })
        }
      />
    </CrmSectionLayout>
  )
}
