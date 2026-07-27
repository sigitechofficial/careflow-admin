import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { useLearningCategories, useLearningCourses } from '@/features/learning/hooks/useLearning'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'
import type { LearningCourseStatus } from '@/features/learning/types/learning.types'

const STATUS_OPTIONS: Array<{ value: LearningCourseStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export function CoursesPanel() {
  const canManage = useAuthStore(s => s.can('learning.courses.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<LearningCourseStatus | ''>('')
  const [categoryId, setCategoryId] = React.useState('')

  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })
  const coursesQuery = useLearningCourses({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
  })

  const rows = coursesQuery.data?.rows ?? []
  const meta = coursesQuery.data?.meta

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categoriesQuery.data?.rows ?? []).map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="space-y-4" data-testid="learning-courses-panel">
      <ContentSectionHeader
        title="Courses"
        description="Browse and manage learning courses. Open a course to edit content and publish versions."
        action={
          canManage ? (
            <Button size="sm" asChild>
              <Link to={LEARNING_PATHS.courseNew}>
                <Plus className="mr-1 h-4 w-4" />
                New course
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search courses…"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Combobox
          className="w-44"
          value={status}
          onChange={v => {
            setStatus(v as LearningCourseStatus | '')
            setPage(1)
          }}
          options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          placeholder="Status"
        />
        <Combobox
          className="w-48"
          value={categoryId}
          onChange={v => {
            setCategoryId(v)
            setPage(1)
          }}
          options={categoryOptions}
          placeholder="Category"
        />
      </div>

      {coursesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No courses match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    {row.shortDescription ? (
                      <div className="text-xs text-muted-foreground line-clamp-1">{row.shortDescription}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">
                    <LearningStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.estimatedDurationMinutes ? `${row.estimatedDurationMinutes} min` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={LEARNING_PATHS.courseDetail} params={{ courseId: row.id }}>
                        <Eye className="mr-1 h-4 w-4" />
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.hasNextPage}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
