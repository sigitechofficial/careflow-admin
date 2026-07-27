import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useInvoiceOrganisation } from '@/features/billing/hooks/useInvoiceOrganisation'
import type { LearningCertificate } from '@/features/learning/types/learning.types'
import { cn } from '@/shared/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificate: LearningCertificate | null
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatCpd(minutes?: number | null) {
  if (minutes == null || Number.isNaN(minutes)) return null
  if (minutes < 60) return `${minutes} Minutes`
  const hours = minutes / 60
  const rounded = Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10
  return `${rounded} Hour${rounded === 1 ? '' : 's'}`
}

function CornerDecor({ className }: { className?: string }) {
  return (
    <div className={cn('absolute h-[18%] w-[18%] min-h-20 min-w-20 max-h-40 max-w-40', className)}>
      <div className="absolute left-0 top-0 h-[72%] w-[72%] rounded-br-[80px] bg-teal-800" />
      <div className="absolute left-0 top-0 h-[54%] w-[54%] rounded-br-[64px] bg-amber-600" />
      <div className="absolute left-0 top-0 h-[36%] w-[36%] rounded-br-[48px] bg-slate-900" />
    </div>
  )
}

export function CertificateViewDialog({ open, onOpenChange, certificate }: Props) {
  const org = useInvoiceOrganisation(open)

  if (!certificate) return null

  const cpdLabel = formatCpd(certificate.cpdMinutes)
  const orgName = org.companyName?.trim() || 'Your Care Organisation'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className={cn(
          'learning-certificate-dialog',
          'flex h-[96dvh] max-h-[96dvh] w-[98vw] max-w-[1400px] flex-col gap-0 overflow-hidden',
          'print:fixed print:inset-0 print:h-auto print:max-h-none print:max-w-none',
          'print:translate-x-0 print:translate-y-0 print:rounded-none print:border-0 print:shadow-none',
        )}
      >
        <DialogHeader className="shrink-0 !py-2.5 print:hidden">
          <DialogTitle>Certificate</DialogTitle>
        </DialogHeader>

        <DialogBody
          className={cn(
            'flex min-h-0 flex-1 items-center justify-center overflow-hidden',
            'bg-slate-100 !p-2 sm:!p-3',
            'print:bg-white print:!p-0',
          )}
        >
          <section
            className={cn(
              'certificate-page certificate-pattern relative overflow-hidden rounded-2xl bg-[#fffdf8]',
              'aspect-[1.414/1] h-auto max-h-full',
              'w-[min(100%,calc((96dvh-7.5rem)*1.414))]',
              'shadow-[0_24px_70px_rgba(15,23,42,0.18)]',
              'print:h-auto print:w-[297mm] print:max-w-none print:rounded-none print:shadow-none',
            )}
            data-testid="learning-certificate-preview"
            style={{
              backgroundImage: [
                'radial-gradient(circle at 20% 20%, rgba(15, 118, 110, 0.06) 0 1px, transparent 1px)',
                'radial-gradient(circle at 80% 80%, rgba(180, 83, 9, 0.05) 0 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '34px 34px',
            }}
          >
            <CornerDecor className="left-0 top-0" />
            <CornerDecor className="bottom-0 right-0 rotate-180" />

            <div className="absolute inset-[2.2%] rounded-xl border-[3px] border-teal-800" />
            <div className="absolute inset-[3.4%] rounded-lg border border-amber-600/80" />
            <div className="absolute inset-[5%] rounded-md border border-slate-300" />

            <div className="relative z-10 flex h-full flex-col px-[5.5%] py-[3.8%]">
              <header className="flex shrink-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-[clamp(2.25rem,6.5vh,3.75rem)] w-[clamp(2.25rem,6.5vh,3.75rem)] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-teal-700 bg-white shadow">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <svg
                        viewBox="0 0 64 64"
                        className="h-[55%] w-[55%] text-teal-700"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M18 37C18 27.6 25.6 20 35 20H46V31C46 40.4 38.4 48 29 48H18V37Z"
                          fill="currentColor"
                          opacity=".18"
                        />
                        <path
                          d="M18 44C26 36 34 30 46 22"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <path
                          d="M28 37C24 33 22 29 22 24"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[clamp(0.55rem,1.2vh,0.75rem)] font-bold uppercase tracking-[0.28em] text-teal-800">
                      {orgName}
                    </p>
                    <p className="mt-0.5 text-[clamp(0.6rem,1.35vh,0.85rem)] text-slate-500">
                      Learning &amp; Development Department
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[clamp(0.5rem,1.1vh,0.7rem)] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Certificate No.
                  </p>
                  <p className="mt-0.5 text-[clamp(0.65rem,1.4vh,0.875rem)] font-bold text-slate-800">
                    {certificate.certificateNumber ?? '—'}
                  </p>
                </div>
              </header>

              <div
                className="mx-auto mt-[1.4%] h-px w-3/4 shrink-0"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(15, 118, 110, 0.65), rgba(180, 83, 9, 0.65), transparent)',
                }}
              />

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <p className="text-[clamp(0.55rem,1.3vh,0.8rem)] font-bold uppercase tracking-[0.4em] text-amber-700">
                  Certificate of Achievement
                </p>

                <h1 className="mt-[1%] font-serif text-[clamp(1.25rem,4.6vh,3.25rem)] font-bold tracking-tight text-slate-900">
                  Training Completion
                </h1>

                <p className="mt-[1.4%] text-[clamp(0.65rem,1.5vh,0.95rem)] text-slate-500">
                  This certificate is proudly presented to
                </p>

                <div className="mt-[0.8%] min-w-[58%] border-b-2 border-slate-700 px-[3%] pb-[0.6%]">
                  <h2 className="font-serif text-[clamp(1.1rem,3.8vh,2.6rem)] font-bold italic text-teal-800">
                    {certificate.employeeName || '—'}
                  </h2>
                </div>

                <p className="mt-[1.3%] max-w-[90%] text-[clamp(0.65rem,1.5vh,0.95rem)] leading-snug text-slate-600">
                  For successfully completing the required training programme
                </p>

                <h3 className="mt-[0.6%] font-serif text-[clamp(0.95rem,2.8vh,1.75rem)] font-bold text-slate-900">
                  {certificate.courseTitle || 'Learning course'}
                </h3>

                {certificate.courseCode ? (
                  <p className="mt-0.5 text-[clamp(0.55rem,1.2vh,0.8rem)] text-slate-500">
                    {certificate.courseCode}
                  </p>
                ) : null}

                <p className="mt-[1%] max-w-[88%] text-[clamp(0.55rem,1.3vh,0.8rem)] leading-snug text-slate-500">
                  The learner has demonstrated the required knowledge and successfully met all
                  assessment and completion requirements for this course.
                </p>

                <div className="mt-[1.2%] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[clamp(0.55rem,1.3vh,0.85rem)]">
                  <div>
                    <span className="font-semibold text-slate-800">Completion Date:</span>{' '}
                    <span className="text-slate-600">{formatDate(certificate.issuedAt)}</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-300" />
                  <div>
                    <span className="font-semibold text-slate-800">Valid Until:</span>{' '}
                    <span className="text-slate-600">{formatDate(certificate.expiresAt)}</span>
                  </div>
                  {cpdLabel ? (
                    <>
                      <div className="h-3.5 w-px bg-slate-300" />
                      <div>
                        <span className="font-semibold text-slate-800">CPD:</span>{' '}
                        <span className="text-slate-600">{cpdLabel}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {certificate.status === 'REVOKED' ? (
                  <p className="mt-1.5 text-[clamp(0.6rem,1.3vh,0.85rem)] font-semibold text-red-700">
                    This certificate has been revoked
                    {certificate.revocationReason ? `: ${certificate.revocationReason}` : ''}
                  </p>
                ) : null}
              </div>

              <footer className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-[2.5%] pt-[0.8%]">
                <div className="text-center">
                  <div className="mx-auto mb-1 h-[clamp(1.25rem,3vh,2.25rem)] w-[70%] max-w-40 border-b border-slate-500" />
                  <p className="text-[clamp(0.45rem,1vh,0.65rem)] font-bold uppercase tracking-[0.18em] text-slate-700">
                    Training Manager
                  </p>
                  <p className="mt-0.5 text-[clamp(0.45rem,0.95vh,0.6rem)] text-slate-500">
                    Authorised Signature
                  </p>
                </div>

                <div className="relative flex h-[clamp(3.25rem,10vh,6.5rem)] w-[clamp(3.25rem,10vh,6.5rem)] items-center justify-center rounded-full border-[3px] border-amber-600 bg-amber-50 shadow">
                  <div className="absolute inset-[8%] rounded-full border border-dashed border-amber-700" />
                  <div className="text-center">
                    <svg
                      viewBox="0 0 64 64"
                      className="mx-auto h-[28%] w-[28%] min-h-4 min-w-4 text-amber-700"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M32 8L38 22L53 24L42 34L45 49L32 42L19 49L22 34L11 24L26 22L32 8Z"
                        fill="currentColor"
                      />
                    </svg>
                    <p className="mt-0.5 text-[clamp(0.4rem,0.9vh,0.55rem)] font-extrabold uppercase tracking-[0.12em] text-amber-800">
                      Certified
                    </p>
                    <p className="text-[clamp(0.35rem,0.8vh,0.5rem)] font-semibold text-amber-700">
                      Training Record
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0 flex-1 text-center">
                    <div className="mx-auto mb-1 h-[clamp(1.25rem,3vh,2.25rem)] w-[70%] max-w-40 border-b border-slate-500" />
                    <p className="text-[clamp(0.45rem,1vh,0.65rem)] font-bold uppercase tracking-[0.18em] text-slate-700">
                      Registered Manager
                    </p>
                    <p className="mt-0.5 text-[clamp(0.45rem,0.95vh,0.6rem)] text-slate-500">
                      Authorised Signature
                    </p>
                  </div>

                  <div className="w-[clamp(2.5rem,7vh,4.5rem)] shrink-0 text-center">
                    <div
                      className="mx-auto grid aspect-square w-full grid-cols-5 gap-0.5 bg-white p-0.5 shadow ring-1 ring-slate-300"
                      title={certificate.verificationCode ?? undefined}
                      aria-label="Verification placeholder"
                    >
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span className="bg-slate-900" />
                      <span />
                      <span className="bg-slate-900" />
                      <span className="bg-slate-900" />
                      <span />
                    </div>
                    <p className="mt-0.5 text-[clamp(0.35rem,0.8vh,0.5rem)] font-semibold uppercase tracking-wide text-slate-500">
                      Verify
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </section>
        </DialogBody>

        <DialogFooter className="shrink-0 !py-2.5 print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => window.print()}>
            Print Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
