import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Gift,
  Globe,
  Home,
  Mail,
  MapPin,
  Phone,
  PoundSterling,
  Route,
  Send,
  Share2,
  ShieldCheck,
  Timer,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { CareersShell, scrollCareersToTop } from '@/features/careers/components/CareersShell'
import { useCompanyBranding } from '@/features/settings/hooks/useCompanySettings'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import {
  closingInfo,
  employmentTypeText,
  fetchOpenVacancy,
  formatPay,
  postedAgo,
  submitApplication,
  type ApplicationInput,
  type PublicVacancy,
} from '@/features/careers/api/careers.api'
import {
  formatClosingDate,
  hoursText,
  shiftLabel,
  workSettingLabel,
} from '@/features/hr/recruitment/utils/recruitment-display.util'
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

/** One of the vacancy's questions: Yes / No buttons, a list to choose from, or a written answer. */
function QuestionField({
  q,
  value,
  onChange,
}: {
  q: PublicVacancy['questions'][number]
  value: string
  onChange: (v: string) => void
}) {
  if (q.type === 'YES_NO') {
    return (
      <Field label={q.text} required={q.required}>
        <YesNo name={q.text} value={value === 'Yes' ? true : value === 'No' ? false : null} onChange={v => onChange(v ? 'Yes' : 'No')} />
      </Field>
    )
  }
  if (q.type === 'CHOICE') {
    return (
      <Field label={q.text} required={q.required}>
        <div role="radiogroup" aria-label={q.text} className="flex flex-wrap gap-2">
          {(q.options ?? []).map(o => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={value === o}
              onClick={() => onChange(o)}
              className={
                value === o
                  ? 'rounded-md border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground'
                  : 'rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted'
              }
            >
              {o}
            </button>
          ))}
        </div>
      </Field>
    )
  }
  return (
    <Field label={q.text} htmlFor={`q-${q.id}`} required={q.required}>
      <textarea
        id={`q-${q.id}`}
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={2000}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </Field>
  )
}

function ApplicationForm({ job, onDone }: { job: PublicVacancy; onDone: (email: string) => void }) {
  const vacancyId = job.id
  const jobTitle = job.title
  const questions = job.questions ?? []
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
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
    if (questions.length) {
      const missing = questions.find(q => q.required && !answers[q.id]?.trim())
      if (missing) {
        setError(`Please answer: ${missing.text}`)
        return
      }
    } else if (rightToWork === null) {
      setError('Please tell us if you have the right to work in the UK.')
      return
    }
    if (job.cvRequirement === 'REQUIRED' && !cv) {
      setError('Please attach your CV.')
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
      ...(questions.length
        ? { answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim())) }
        : { hasRightToWork: rightToWork ?? undefined, drivesForWork: drives ?? undefined }),
      coverLetter: form.coverLetter.trim() || undefined,
      consent,
      website: form.website,
      cv,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate={false}>
      <FormSection number={1} title="Your details">
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
      </FormSection>

      <FormSection number={2} title="A few questions" description="Quick answers help us match you to the right shifts.">
        {questions.length ? (
          <div className="space-y-5">
            {questions.map(q => (
              <QuestionField key={q.id} q={q} value={answers[q.id] ?? ''} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Do you have the right to work in the UK?" required>
              <YesNo name="Right to work in the UK" value={rightToWork} onChange={setRightToWork} />
            </Field>
            <Field label="Do you have a driving licence and a car for work?">
              <YesNo name="Driving licence and car" value={drives} onChange={setDrives} />
            </Field>
          </div>
        )}
      </FormSection>

      <FormSection number={3} title={job.cvRequirement === 'HIDDEN' ? 'About you' : 'Your CV and a few words'}>
        {job.cvRequirement === 'HIDDEN' ? null : (
          <Field
            label="Your CV"
            required={job.cvRequirement === 'REQUIRED'}
            hint={
              job.cvRequirement === 'REQUIRED'
                ? 'PDF, Word, JPG or PNG, up to 10 MB.'
                : 'PDF, Word, JPG or PNG, up to 10 MB. No CV? You can still apply — tell us about yourself below.'
            }
          >
            <input ref={fileRef} type="file" accept={CV_ACCEPT} className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
            {cv ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{cv.name}</span>
                    <span className="block text-xs text-muted-foreground">{(cv.size / 1024 / 1024).toFixed(1)} MB · ready to send</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCv(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  aria-label="Remove CV"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
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
                className="group flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors group-hover:text-primary">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-medium">Upload your CV</span>
                <span className="text-xs text-muted-foreground">Click to choose a file, or drag it here</span>
              </button>
            )}
          </Field>
        )}

        <Field label="Why would you like this job?" htmlFor="ap-cover" hint="Your experience, availability, anything you would like us to know.">
          <textarea
            id="ap-cover"
            rows={5}
            value={form.coverLetter}
            onChange={set('coverLetter')}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      </FormSection>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="ap-website">Website</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input accent-[hsl(var(--primary))]"
            required
          />
          <span className="leading-relaxed">
            I agree to my details being used to consider my application for {jobTitle}. Read our{' '}
            <Link to="/legal/privacy-policy" className="font-medium text-primary underline underline-offset-2" target="_blank">
              privacy policy
            </Link>
            .<span className="text-destructive"> *</span>
          </span>
        </label>

        {error ? (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Your details are only used for this application.
          </p>
          <Button type="submit" size="lg" className="sm:min-w-[220px]" disabled={submit.isPending}>
            {submit.isPending ? 'Sending your application…' : (
              <>
                Submit application <Send className="ml-2 h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** A numbered part of the application form. */
function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{number}</span>
        <span>
          <span className="block font-display text-base font-semibold">{title}</span>
          {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
        </span>
      </legend>
      {children}
    </fieldset>
  )
}

/** A section card on the job page, with an icon and a heading. */
function Section({ icon, title, children, id }: { icon: React.ReactNode; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
      <h2 className="mb-5 flex items-center gap-3 font-display text-lg font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** One fact with an icon (job details grid). */
function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-medium">{value}</dd>
      </div>
    </div>
  )
}

/** Requirements: one per line becomes a checklist; a single paragraph stays as text. */
function Checklist({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
  if (lines.length < 2) return <Paragraphs text={text} />
  return (
    <ul className="grid gap-3">
      {lines.map(l => (
        <li key={l} className="flex items-start gap-3 text-[15px] leading-relaxed">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span>{l}</span>
        </li>
      ))}
    </ul>
  )
}

const NEXT_STEPS = [
  { title: 'Apply online', text: 'About 5 minutes. No account needed.' },
  { title: 'We get in touch', text: 'We look at every application and call you for a quick chat.' },
  { title: 'Interview', text: 'Meet the team and ask us anything.' },
  { title: 'Checks and start', text: 'References and DBS, then your induction and paid training.' },
]

/** Public job page: the details, then the application form (no login). */
export default function CareerVacancyPage() {
  const { vacancyId } = useParams({ strict: false }) as { vacancyId: string }
  const query = useQuery({
    queryKey: ['careers', 'vacancy', vacancyId],
    queryFn: () => fetchOpenVacancy(vacancyId),
    retry: false,
  })
  const branding = useCompanyBranding().data
  const orgName = branding?.displayName?.trim() || branding?.companyName?.trim() || 'Our team'
  const logo = resolveMediaUrl(branding?.displayLogoUrl, branding?.updatedAt)
  const job = query.data
  const pay = job ? formatPay(job.salaryRange, job.salaryPeriod) : null
  const closing = job ? closingInfo(job.closingDate) : null
  const hours = job ? hoursText(job.hoursType, job.hoursPerWeekMin, job.hoursPerWeekMax) : null
  const where = job ? workSettingLabel(job.workSetting) : null
  const [submittedTo, setSubmittedTo] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const formRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (submittedTo) scrollCareersToTop()
  }, [submittedTo])

  const toForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the address bar still has it */
    }
  }

  return (
    <CareersShell>
      <Link to="/careers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All vacancies
      </Link>

      {query.isLoading ? (
        <div className="space-y-6" aria-hidden>
          <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      ) : !job ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Briefcase className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 font-display text-lg font-semibold">This job is no longer open</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been filled. Have a look at our other vacancies.</p>
          <Button asChild className="mt-6">
            <Link to="/careers">See current vacancies</Link>
          </Button>
        </div>
      ) : submittedTo ? (
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-card text-center shadow-sm">
          <div className="bg-gradient-to-b from-emerald-500/10 to-transparent px-8 pb-2 pt-10">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold">Thank you for applying</h1>
          </div>
          <div className="px-8 pb-10">
            <p className="mt-2 text-muted-foreground">
              We have received your application for <span className="font-medium text-foreground">{job.title}</span>. We will look at it and
              contact you about the next steps.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">A confirmation has been sent to {submittedTo}.</p>
            <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
              {NEXT_STEPS.slice(1).map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 2}</span>
                  <span>
                    <span className="font-medium">{s.title}</span> <span className="text-muted-foreground">— {s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button asChild variant="outline" className="mt-8">
              <Link to="/careers">See other vacancies</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-24 lg:pb-0">
          {/* Hero */}
          <header className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" aria-hidden />
            <div className="relative p-6 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={logo} alt="" className="h-11 w-11 rounded-xl border border-border bg-background object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                      {orgName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{orgName}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.reference} · {postedAgo(job.postedAt)}
                    </p>
                  </div>
                </div>
                {closing ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                      closing.urgent
                        ? 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-300'
                        : 'bg-background text-muted-foreground ring-1 ring-border',
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Apply by {closing.date}
                    {closing.soon ? ` · ${closing.soon}` : ''}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 max-w-3xl font-display text-3xl font-bold tracking-tight [text-wrap:balance] md:text-4xl">{job.title}</h1>

              <ul className="mt-5 flex flex-wrap gap-2 text-sm">
                {job.location ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 ring-1 ring-border">
                    <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden /> {job.location}
                  </li>
                ) : null}
                <li className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 ring-1 ring-border">
                  <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden /> {employmentTypeText(job.employmentType)}
                </li>
                {hours ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 ring-1 ring-border">
                    <Timer className="h-4 w-4 text-muted-foreground" aria-hidden /> {hours}
                  </li>
                ) : null}
                {pay ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300">
                    <PoundSterling className="h-4 w-4" aria-hidden /> {pay}
                  </li>
                ) : null}
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={toForm}>
                  Apply now <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" onClick={() => void copyLink()}>
                  {copied ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Share2 className="mr-2 h-4 w-4" aria-hidden />}
                  {copied ? 'Link copied' : 'Share this job'}
                </Button>
              </div>
            </div>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <article className="min-w-0 space-y-6">
              <Section icon={<ClipboardList className="h-5 w-5" aria-hidden />} title="Job details">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {where ? <Fact icon={<Home className="h-4 w-4" aria-hidden />} label="Where you will work" value={where} /> : null}
                  <Fact
                    icon={<CalendarDays className="h-4 w-4" aria-hidden />}
                    label="Start"
                    value={job.startDate ? formatClosingDate(job.startDate) : 'As soon as possible'}
                  />
                  {hours ? <Fact icon={<Timer className="h-4 w-4" aria-hidden />} label="Hours" value={hours} /> : null}
                  <Fact icon={<Users className="h-4 w-4" aria-hidden />} label="People needed" value={job.numberOfPositions} />
                </dl>
                {job.shifts?.length ? (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Shifts</p>
                    <ul className="flex flex-wrap gap-2">
                      {job.shifts.map(s => (
                        <li key={s} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                          {shiftLabel(s)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>

              {job.benefits?.length ? (
                <Section icon={<Gift className="h-5 w-5" aria-hidden />} title="What you get">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {job.benefits.map(b => (
                      <li key={b} className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-medium">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden /> {b}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {job.description ? (
                <Section icon={<FileText className="h-5 w-5" aria-hidden />} title="About the job">
                  <Paragraphs text={job.description} />
                </Section>
              ) : null}

              {job.requirements ? (
                <Section icon={<UserCheck className="h-5 w-5" aria-hidden />} title="What we are looking for">
                  <Checklist text={job.requirements} />
                </Section>
              ) : null}

              <Section icon={<Route className="h-5 w-5" aria-hidden />} title="What happens next">
                <ol className="grid gap-4 sm:grid-cols-2">
                  {NEXT_STEPS.map((s, i) => (
                    <li key={s.title} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-medium">{s.title}</span>
                        <span className="block text-sm text-muted-foreground">{s.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>

              <div ref={formRef} id="apply" className="scroll-mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-6 py-6 md:px-8">
                  <h2 className="font-display text-xl font-bold">Apply for this job</h2>
                  <p className="mt-1 text-sm text-muted-foreground">It takes about 5 minutes. No account needed.</p>
                </div>
                <div className="p-6 md:p-8">
                  <ApplicationForm job={job} onDone={setSubmittedTo} />
                </div>
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {pay ? (
                  <div className="border-b border-border bg-emerald-500/5 px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pay</p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">{pay}</p>
                  </div>
                ) : null}
                <dl className="space-y-3 p-5 text-sm">
                  <SummaryRow icon={<Briefcase className="h-4 w-4" aria-hidden />} label="Contract" value={employmentTypeText(job.employmentType)} />
                  {hours ? <SummaryRow icon={<Timer className="h-4 w-4" aria-hidden />} label="Hours" value={hours} /> : null}
                  {job.location ? <SummaryRow icon={<MapPin className="h-4 w-4" aria-hidden />} label="Location" value={job.location} /> : null}
                  <SummaryRow
                    icon={<CalendarDays className="h-4 w-4" aria-hidden />}
                    label="Start"
                    value={job.startDate ? formatClosingDate(job.startDate) : 'As soon as possible'}
                  />
                  {closing ? (
                    <SummaryRow
                      icon={<CalendarClock className="h-4 w-4" aria-hidden />}
                      label="Closing date"
                      value={
                        <>
                          {closing.date}
                          {closing.soon ? (
                            <span className={cn('block text-xs', closing.urgent ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                              {closing.soon}
                            </span>
                          ) : null}
                        </>
                      }
                    />
                  ) : null}
                </dl>
                <div className="px-5 pb-5">
                  <Button className="w-full" size="lg" onClick={toForm}>
                    Apply now
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">About 5 minutes · No account needed</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={logo} alt="" className="h-10 w-10 rounded-lg border border-border object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                      {orgName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">About the employer</p>
                    <p className="font-semibold">{orgName}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {branding?.phoneNumber ? (
                    <li>
                      <a href={`tel:${branding.phoneNumber}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <Phone className="h-4 w-4" aria-hidden /> {branding.phoneNumber}
                      </a>
                    </li>
                  ) : null}
                  {branding?.email ? (
                    <li>
                      <a href={`mailto:${branding.email}`} className="inline-flex items-center gap-2 break-all text-muted-foreground hover:text-foreground">
                        <Mail className="h-4 w-4 shrink-0" aria-hidden /> {branding.email}
                      </a>
                    </li>
                  ) : null}
                  {branding?.companyWebsite ? (
                    <li>
                      <a
                        href={branding.companyWebsite.startsWith('http') ? branding.companyWebsite : `https://${branding.companyWebsite}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Globe className="h-4 w-4" aria-hidden /> Visit our website
                      </a>
                    </li>
                  ) : null}
                </ul>
                <Link to="/careers" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  See all our vacancies <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </aside>
          </div>

          {/* Phones: the apply button stays in reach while reading. */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{job.title}</p>
                {pay ? <p className="truncate text-xs font-medium text-emerald-700 dark:text-emerald-300">{pay}</p> : null}
              </div>
              <Button onClick={toForm}>Apply now</Button>
            </div>
          </div>
        </div>
      )}
    </CareersShell>
  )
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  )
}
