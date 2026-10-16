import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  Layers,
  Loader2,
  PoundSterling,
  Save,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { toastSuccess } from '@/shared/lib/toast'
import { PayCardForm } from '@/features/billing/components/PayCardForm'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { PayCardVersionHistory } from '@/features/billing/components/PayCardVersionHistory'
import { usePayCard } from '@/features/billing/hooks/usePayCards'
import { formatBillingDate, formatPayCardAssignmentDisplay, type PayCard } from '@/features/billing/types/billing-cards.types'

/** Native id on the form in PayCardForm, so header actions here can submit it. */
const PAY_CARD_FORM_ID = 'pay-card-form'
/** Approx. sticky-header height — tab scrolling and the sidebar offset leave this much clear. */
const HEADER_OFFSET = 168

const SECTIONS = [
  { id: 'pay-card-general', label: 'General', icon: FileText },
  { id: 'pay-card-rates', label: 'Pay rates', countKey: 'rates' as const, icon: PoundSterling },
  { id: 'pay-card-rules-policy', label: 'Holidays', icon: CalendarDays },
  { id: 'pay-card-wage-types', label: 'Wage types', icon: Layers },
  { id: 'pay-card-preview', label: 'Pay preview', icon: Calculator },
  { id: 'pay-card-history', label: 'Rate history', editOnly: true, icon: History },
]

/** Scroll the app's main scroll surface to a section, leaving the sticky header clear. */
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // Sections are collapsible <details> (closed by default) — open before scrolling.
  if (el instanceof HTMLDetailsElement) el.open = true
  const scroller = el.closest<HTMLElement>('[data-app-main-scroll]')
  if (scroller) {
    const top =
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - HEADER_OFFSET
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function SectionTabs({ isEdit, ratesCount }: { isEdit: boolean; ratesCount?: number }) {
  return (
    <nav
      className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Pay card sections"
      data-testid="pay-card-section-nav"
    >
      {SECTIONS.filter(s => isEdit || !s.editOnly).map(s => {
        const count = s.countKey === 'rates' ? ratesCount : undefined
        const Icon = s.icon
        return (
          <button
            key={s.id}
            type="button"
            className="group flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => scrollToSection(s.id)}
          >
            <Icon
              className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            {s.label}
            {count != null ? (
              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-foreground">
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function Breadcrumb({ isEdit }: { isEdit: boolean }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/billing" search={{ tab: 'pay-cards' }} className="hover:text-foreground">
        Pay cards
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="text-foreground">{isEdit ? 'Edit pay card' : 'New pay card'}</span>
    </nav>
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
        <Breadcrumb isEdit={isEdit} />
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
    <div className="min-w-0">
      <PayCardEditorHeader card={card} isEdit={isEdit} onCancel={backToList} />

      <div className="pt-6">
        <PayCardForm
          key={card?.id ?? 'new'}
          formId={PAY_CARD_FORM_ID}
          card={card}
          onCancel={backToList}
          onSaved={saved => {
            toastSuccess(isEdit ? `Pay card "${saved.name}" updated.` : `Pay card "${saved.name}" created.`)
            backToList()
          }}
        />

        {card ? (
          <div className="pt-6">
            <PayCardVersionHistory cardId={card.id} currency={card.currency} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Sticky page header: breadcrumb, title row, meta, actions, and the section tab bar. */
function PayCardEditorHeader({
  card,
  isEdit,
  onCancel,
}: {
  card: PayCard | null
  isEdit: boolean
  onCancel: () => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 pt-1 md:-mx-[22px] md:px-[22px]">
      <Breadcrumb isEdit={isEdit} />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {isEdit && card ? card.name : 'New pay card'}
              </h1>
              {card ? (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {card.code}
                </span>
              ) : null}
              {card ? <RateCardStatusBadge status={card.status} /> : null}
              {card ? <Badge variant="muted">Version {card.version ?? 1}</Badge> : null}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Set who this template is for, then add the £ rates carers are paid.
            </p>

            {card ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {formatBillingDate(card.effectiveFrom)} → {formatBillingDate(card.effectiveTo)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {formatPayCardAssignmentDisplay(card)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                  {card.rules.length} rate{card.rules.length === 1 ? '' : 's'}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={PAY_CARD_FORM_ID}
            leftIcon={isEdit ? <Save className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          >
            {isEdit ? 'Save changes' : 'Create pay card'}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <SectionTabs isEdit={isEdit} ratesCount={card?.rules.length} />
      </div>
    </div>
  )
}
