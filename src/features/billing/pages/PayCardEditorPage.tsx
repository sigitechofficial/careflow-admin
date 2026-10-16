import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, CreditCard, Loader2, Pencil } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { toastSuccess } from '@/shared/lib/toast'
import { PayCardForm } from '@/features/billing/components/PayCardForm'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { PayCardVersionHistory } from '@/features/billing/components/PayCardVersionHistory'
import { usePayCard } from '@/features/billing/hooks/usePayCards'

const SECTIONS = [
  { id: 'pay-card-general', label: 'General' },
  { id: 'pay-card-rates', label: 'Pay rates' },
  { id: 'pay-card-rules-policy', label: 'Holidays' },
  { id: 'pay-card-wage-types', label: 'Wage types' },
  { id: 'pay-card-preview', label: 'Pay preview' },
  { id: 'pay-card-history', label: 'Rate history', editOnly: true },
]

function SectionNav({ isEdit }: { isEdit: boolean }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Pay card sections" data-testid="pay-card-section-nav">
      {SECTIONS.filter(s => isEdit || !s.editOnly).map(s => (
        <button
          key={s.id}
          type="button"
          className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}

function BackToPayCards() {
  return (
    <Link
      to="/billing"
      search={{ tab: 'pay-cards' }}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Pay cards
    </Link>
  )
}

/** Full-page create (`/billing/pay-cards/new`) and edit (`/billing/pay-cards/$payCardId/edit`) for carer pay cards. */
export default function PayCardEditorPage() {
  const navigate = useNavigate()
  const { payCardId } = useParams({ strict: false }) as { payCardId?: string }
  const isEdit = !!payCardId
  const cardQuery = usePayCard(payCardId ?? null, isEdit)
  const card = cardQuery.data ?? null

  const backToList = () => void navigate({ to: '/billing', search: { tab: 'pay-cards' } })

  if (isEdit && (cardQuery.isLoading || cardQuery.error || !card)) {
    return (
      <div className="min-w-0 space-y-6 pb-10">
        <BackToPayCards />
        <ContentCard>
          {cardQuery.isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading pay card…
            </p>
          ) : (
            <p className="text-sm text-destructive">
              {cardQuery.error instanceof ApiError ? cardQuery.error.message : 'Pay card not found.'}
            </p>
          )}
        </ContentCard>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-4">
        <BackToPayCards />
        <ContentSectionHeader
          icon={isEdit ? <Pencil className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          title={isEdit && card ? `Edit pay card · ${card.name}` : 'New pay card'}
          description="Set who this template is for, then add the £ rates carers are paid."
          action={
            card ? (
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Version {card.version ?? 1}
                </span>
                <RateCardStatusBadge status={card.status} />
              </div>
            ) : undefined
          }
        />
        <SectionNav isEdit={isEdit} />
      </div>

      <PayCardForm
        key={card?.id ?? 'new'}
        card={card}
        onCancel={backToList}
        onSaved={saved => {
          toastSuccess(isEdit ? `Pay card "${saved.name}" updated.` : `Pay card "${saved.name}" created.`)
          backToList()
        }}
      />

      {card ? <PayCardVersionHistory cardId={card.id} currency={card.currency} /> : null}
    </div>
  )
}
