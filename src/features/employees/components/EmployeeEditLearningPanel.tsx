import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Award, CheckCircle2, ClipboardList, ExternalLink, Loader2 } from 'lucide-react'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import {
  useEmployeeLearningAssignments,
  useEmployeeLearningCertificates,
  useEmployeeLearningEligibility,
} from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { useAuthStore } from '@/features/auth/store'

export function EmployeeEditLearningPanel({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(s =>
    s.can('learning.compliance.read') || s.can('learning.assignments.read') || s.can('learning.certificates.read'),
  )

  const eligibilityQuery = useEmployeeLearningEligibility(employeeId, canRead)
  const assignmentsQuery = useEmployeeLearningAssignments(employeeId, canRead)
  const certificatesQuery = useEmployeeLearningCertificates(employeeId, canRead)

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this employee&apos;s learning records.
      </p>
    )
  }

  const loading = eligibilityQuery.isLoading || assignmentsQuery.isLoading || certificatesQuery.isLoading

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const eligibility = eligibilityQuery.data
  const assignments = assignmentsQuery.data?.rows ?? []
  const certificates = certificatesQuery.data?.rows ?? []

  return (
    <div className="space-y-6" data-testid="employee-edit-learning-panel">
      <ContentSectionHeader
        title="Learning"
        description="Training eligibility, assignments, and certificates for this employee."
        action={
          <Link
            to={LEARNING_PATHS.compliance}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open compliance matrix
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            {eligibility?.eligible ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="text-sm font-medium">Roster eligibility</p>
              <p className={cn('text-xs', eligibility?.eligible ? 'text-emerald-700' : 'text-destructive')}>
                {eligibility?.eligible ? 'Eligible for restricted duties' : 'Restrictions apply'}
              </p>
            </div>
          </div>
          {(eligibility?.restrictions.length ?? 0) > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-destructive">
              {eligibility?.restrictions.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {(eligibility?.warnings.length ?? 0) > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber-700">
              {eligibility?.warnings.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{assignments.length}</p>
              <p className="text-xs text-muted-foreground">Assignments</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{certificates.length}</p>
              <p className="text-xs text-muted-foreground">Certificates</p>
            </div>
          </div>
        </ContentCard>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Recent assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {assignments.slice(0, 10).map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link
                        to={LEARNING_PATHS.courseDetail}
                        params={{ courseId: row.courseId }}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.courseId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={row.status} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to={LEARNING_PATHS.assignments} className="text-sm text-primary hover:underline">
          View all assignments
        </Link>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Certificates</h3>
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certificates issued.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Issued</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {certificates.slice(0, 10).map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{row.courseId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={row.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to={LEARNING_PATHS.certificates} className="text-sm text-primary hover:underline">
          View all certificates
        </Link>
      </section>
    </div>
  )
}
