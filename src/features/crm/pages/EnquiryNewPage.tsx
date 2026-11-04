import { useNavigate, useSearch } from '@tanstack/react-router'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { CrmSectionLayout } from '@/features/crm/components/CrmSectionLayout'
import { EnquiryForm } from '@/features/crm/components/EnquiryForm'
import { useCreateEnquiry } from '@/features/crm/hooks/useCrm'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

export default function EnquiryNewPage() {
  const navigate = useNavigate()
  const create = useCreateEnquiry()
  const { locationId: headerLocationId } = useGlobalLocationScope()
  const { kind } = useSearch({ strict: false }) as { kind?: 'REFERRAL' }
  const title = kind === 'REFERRAL' ? 'New referral' : 'New enquiry'

  return (
    <CrmSectionLayout
      title={title}
      description="Capture a care enquiry from a person or family, or a referral from a professional."
      testId="crm-new-page"
      breadcrumbTail={[{ label: 'Enquiries & Referrals', href: '/crm' }, { label: title }]}
    >
      <EnquiryForm
        defaultKind={kind}
        defaultLocationId={headerLocationId}
        checkDuplicates
        busy={create.isPending}
        onCancel={() => navigate({ to: '/crm' })}
        onSubmit={payload =>
          create.mutate(payload, {
            onSuccess: created => {
              toastSuccess(created.kind === 'REFERRAL' ? 'Referral created' : 'Enquiry created')
              navigate({ to: '/crm/$enquiryId', params: { enquiryId: created.id } })
            },
            onError: e => toastApiError(e, 'Could not save'),
          })
        }
      />
    </CrmSectionLayout>
  )
}
