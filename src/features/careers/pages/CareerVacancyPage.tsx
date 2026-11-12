import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  PoundSterling,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { CareersShell, scrollCareersToTop } from '@/features/careers/components/CareersShell'
import {
  closingInfo,
  employmentTypeText,
  fetchOpenVacancy,
  formatPay,
  postedAgo,
  submitApplication,
  type ApplicationInput,
} from '@/features/careers/api/careers.api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

const MAX_CV_BYTES = 10 * 1024 * 1024
const CV_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function YesNo({
  name,
  value,
  onChange,
}: {
  name: string
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex overflow-hidden rounded-md border border-input">
      {[
        { v: true, label: 'Yes' },
        { v: false, label: 'No' },
      ].map(o => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            'px-5 py-2 text-sm transition-colors',
            value === o.v ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Paragraphs({ text }: { text: string }) {
  return <div className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{text}</div>
}

function ApplicationForm({ vacancyId, jobTitle, onDone }: { vacancyId: string; jobTitle: string; onDone: (email: string) => void }) {
  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    coverLetter: '',
    website: '',
  })
  const [rightToWork, setRightToWork] = React.useState<boolean | null>(null)
  const [drives, setDrives] = React.useState<boolean | null>(null)
  const [consent, setConsent] = React.useState(false)
  const [cv, setCv] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const submit = useMutation({
    mutationFn: (input: ApplicationInput) => submitApplication(vacancyId, input),
    onSuccess: () => onDone(form.email.trim()),
    onError: (err: Error) => setError(err.message),
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  function pickFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (file.size > MAX_CV_BYTES) {
      setError('Your CV is too large. Please upload a file under 10 MB.')
      return
    }
    setCv(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (rightToWork === null) {
      setError('Please tell us if you have the right to work in the UK.')
      return
    }
    if (!consent) {
      setError('Please agree to us using your details for your application.')
      return
    }
    submit.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || undefined,
      hasRightToWork: rightToWork,
      drivesForWork: drives ?? undefined,
      coverLetter: form.coverLetter.trim() || undefined,
      consent,
      website: form.website,
      cv,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="ap-first" required>
          <Input id="ap-first" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} required />
        </Field>
        <Field label="Last name" htmlFor="ap-last" required>
          <Input id="ap-last" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} required />
        </Field>
        <Field label="Email" htmlFor="ap-email" required>
          <Input id="ap-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Phone" htmlFor="ap-phone" required>
          <Input id="ap-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} required />
        </Field>
      </div>
      <Field label="Address" htmlFor="ap-address">
        <Input id="ap-address" autoComplete="street-address" value={form.address} onChange={set('address')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Do you have the right to work in the UK?" required>
          <YesNo name="Right to work in the UK" value={rightToWork} onChange={setRightToWork} />
        </Field>
        <Field label="Do you have a driving licence and a car for work?">
          <YesNo name="Driving licence and car" value={drives} onChange={setDrives} />
        </Field>
      </div>

      <Field label="Your CV" hint="PDF, Word, JPG or PNG, up to 10 MB. No CV? You can still apply — tell us about yourself below.">
        <input
          ref={fileRef}
          type="file"
          accept={CV_ACCEPT}
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0])}
        />
        {cv ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{cv.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{(cv.size / 1024 / 1024).toFixed(1)} MB</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setCv(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              aria-label="Remove CV"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              pickFile(e.dataTransfer.files?.[0])
            }}
            className="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/20"
          >
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Upload your CV</span>
            <span className="text-xs text-muted-foreground">Click to choose a file, or drag it here</span>
          </button>
        )}
      </Field>

      <Field label="Why would you like this job?" htmlFor="ap-cover" hint="Your experience, availability, anything you would like us to know.">
        <textarea
          id="ap-cover"
          rows={5}
          value={form.coverLetter}
          onChange={set('coverLetter')}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="ap-website">Website</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
          required
        />
        <span>
          I agree to my details being used to consider my application for {jobTitle}. Read our{' '}
          <Link to="/legal/privacy-policy" className="text-primary underline" target="_blank">
            privacy policy
          </Link>
          .<span className="text-destructive"> *</span>
        </span>
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submit.isPending}>
        {submit.isPending ? 'Sending your application…' : 'Submit application'}
      </Button>
    </form>
  )
}

/** Public job page: the details, then the application form (no login). */
export default function CareerVacancyPage() {
  const { vacancyId } = useParams({ strict: false }) as { vacancyId: string }
  const query = useQuery({
    queryKey: ['careers', 'vacancy', vacancyId],
    queryFn: () => fetchOpenVacancy(vacancyId),
    retry: false,
  })
  const job = query.data
  const pay = job ? formatPay(job.salaryRange, job.salaryPeriod) : null
  const closing = job ? closingInfo(job.closingDate) : null
  const [submittedTo, setSubmittedTo] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (submittedTo) scrollCareersToTop()
  }, [submittedTo])

  return (
    <CareersShell>
      <Link to="/careers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All vacancies
      </Link>

      {query.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : !job ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium">This job is no longer open</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been filled. Have a look at our other vacancies.</p>
          <Link to="/careers" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            See current vacancies
          </Link>
        </div>
      ) : submittedTo ? (
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Thank you for applying</h1>
          <p className="mt-2 text-muted-foreground">
            We have received your application for <span className="font-medium text-foreground">{job.title}</span>.
            We will look at it and contact you about the next steps.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">A confirmation has been sent to {submittedTo}.</p>
          <Link to="/careers" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            See other vacancies
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="space-y-6">
            <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <p className="font-mono text-xs text-muted-foreground">{job.reference}</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {job.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden /> {job.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" aria-hidden /> {employmentTypeText(job.employmentType)}
                </span>
                {pay ? (
                  <span className="inline-flex items-center gap-1.5">
                    <PoundSterling className="h-4 w-4" aria-hidden /> {pay}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden /> {postedAgo(job.postedAt)}
                </span>
              </div>
              {closing ? (
                <p
                  className={
                    closing.urgent
                      ? 'mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300'
                      : 'mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'
                  }
                >
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  Apply by {closing.date}
                  {closing.soon ? <span className="text-muted-foreground">· {closing.soon}</span> : null}
                </p>
              ) : null}
            </header>

            {job.description ? (
              <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-3 font-display text-lg font-semibold">About the job</h2>
                <Paragraphs text={job.description} />
              </section>
            ) : null}
            {job.requirements ? (
              <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-3 font-display text-lg font-semibold">What we are looking for</h2>
                <Paragraphs text={job.requirements} />
              </section>
            ) : null}

            <section ref={formRef} id="apply" className="scroll-mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Apply for this job</h2>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">It takes about 5 minutes.</p>
              <ApplicationForm vacancyId={job.id} jobTitle={job.title} onDone={setSubmittedTo} />
            </section>
          </article>

          {/* Wide screens only: on a phone the same facts are in the header and the form follows the text. */}
          <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Contract</dt>
                    <dd className="font-medium">{employmentTypeText(job.employmentType)}</dd>
                  </div>
                </div>
                {pay ? (
                  <div className="flex items-start gap-3">
                    <PoundSterling className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted-foreground">Pay</dt>
                      <dd className="font-medium">{pay}</dd>
                    </div>
                  </div>
                ) : null}
                {closing ? (
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted-foreground">Closing date</dt>
                      <dd className="font-medium">
                        {closing.date}
                        {closing.soon ? (
                          <span className={closing.urgent ? 'block text-xs text-amber-700 dark:text-amber-300' : 'block text-xs text-muted-foreground'}>
                            {closing.soon}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                  <div>
                    <dt className="text-xs text-muted-foreground">Positions</dt>
                    <dd className="font-medium">{job.numberOfPositions}</dd>
                  </div>
                </div>
              </dl>
              <Button
                type="button"
                className="mt-5 w-full"
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Apply now
              </Button>
            </div>
          </aside>
        </div>
      )}
    </CareersShell>
  )
}
