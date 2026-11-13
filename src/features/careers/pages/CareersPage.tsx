import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, CalendarClock, Clock, MapPin, PoundSterling, SearchX } from 'lucide-react'
import { CareersShell } from '@/features/careers/components/CareersShell'
import {
  closingInfo,
  employmentTypeText,
  fetchOpenVacancies,
  formatPay,
  postedAgo,
} from '@/features/careers/api/careers.api'

/** Public list of open jobs (no login). */
export default function CareersPage() {
  const query = useQuery({ queryKey: ['careers', 'list'], queryFn: fetchOpenVacancies, staleTime: 60_000 })
  const jobs = query.data ?? []

  return (
    <CareersShell>
      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Join our team</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Current vacancies</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Help people live well in their own homes. Choose a job below, read about it, and apply online in a few
          minutes — you can attach your CV.
        </p>
      </section>

      {query.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          We could not load the jobs just now. Please refresh the page.
        </p>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-medium">No vacancies right now</p>
          <p className="text-sm text-muted-foreground">Please check back soon.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {jobs.length} open job{jobs.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-3">
            {jobs.map(job => (
              <li key={job.id}>
                <Link
                  to="/careers/$vacancyId"
                  params={{ vacancyId: job.id }}
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <h2 className="font-display text-lg font-semibold leading-snug group-hover:text-primary">
                      {job.title}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      {job.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" aria-hidden /> {job.location}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" aria-hidden /> {employmentTypeText(job.employmentType)}
                      </span>
                      {formatPay(job.salaryRange, job.salaryPeriod) ? (
                        <span className="inline-flex items-center gap-1.5">
                          <PoundSterling className="h-4 w-4" aria-hidden /> {formatPay(job.salaryRange, job.salaryPeriod)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" aria-hidden /> {postedAgo(job.postedAt)}
                      </span>
                      {closingInfo(job.closingDate) ? (
                        <span
                          className={
                            closingInfo(job.closingDate)?.urgent
                              ? 'inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300'
                              : 'inline-flex items-center gap-1.5'
                          }
                        >
                          <CalendarClock className="h-4 w-4" aria-hidden /> Apply by {closingInfo(job.closingDate)?.date}
                          {closingInfo(job.closingDate)?.soon ? ` · ${closingInfo(job.closingDate)?.soon}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:self-center">
                    View and apply <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </CareersShell>
  )
}
