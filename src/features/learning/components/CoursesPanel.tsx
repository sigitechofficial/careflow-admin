import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Eye, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import {
  useLearningCategories,
  useLearningCourses,
  useLearningCourseStatusCounts,
} from '@/features/learning/hooks/useLearning'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'

/** Plain-text description for the list (the Details step can save formatted text). */
function descriptionText(row: { description?: string | null; shortDescription?: string | null }): string {
  const html = row.description || row.shortDescription || ''
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** One tab per course status (agreed 13 Nov 2026). Published first. */
const STATUS_TABS: Array<{ value: 'PUBLISHED' | 'DRAFT' | 'WITHDRAWN' | 'ARCHIVED'; label: string; empty: string }> = [
  { value: 'PUBLISHED', label: 'Published', empty: 'No published courses.' },
  { value: 'DRAFT', label: 'Drafts', empty: 'No draft courses.' },
  { value: 'WITHDRAWN', label: 'Withdrawn', empty: 'No withdrawn courses.' },
  { value: 'ARCHIVED', label: 'Archived', empty: 'No archived courses.' },
]
type StatusTab = (typeof STATUS_TABS)[number]['value']

export function CoursesPanel() {
  const canManage = useAuthStore(s => s.can('learning.courses.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<StatusTab>('PUBLISHED')
  const [categoryId, setCategoryId] = React.useState('')

  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })
  // Names for the Category column, including retired categories that old courses still use.
  const allCategoriesQuery = useLearningCategories({ limit: 100 })
  const categoryName = React.useMemo(
    () => new Map((allCategoriesQuery.data?.rows ?? []).map(c => [c.id, c.name])),
    [allCategoriesQuery.data],
  )
  const coursesQuery = useLearningCourses({
    page,
    limit: 20,
    search: search || undefined,
    status,
    categoryId: categoryId || undefined,
  }, { alwaysFresh: true })
  const countsQuery = useLearningCourseStatusCounts({
    search: search || undefined,
    categoryId: categoryId || undefined,
  })
  const counts = countsQuery.data
  // Refresh the tab counts whenever the list loads new data, so both show the same moment.
  const listUpdatedAt = coursesQuery.dataUpdatedAt
  const refetchCounts = countsQuery.refetch
  React.useEffect(() => {
    if (listUpdatedAt) void refetchCounts()
  }, [listUpdatedAt, refetchCounts])
  const activeTab = STATUS_TABS.find(t => t.value === status) ?? STATUS_TABS[0]

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

      <Tabs
        value={status}
        onValueChange={v => {
          setStatus(v as StatusTab)
          setPage(1)
        }}
      >
        <TabsList variant="underline" aria-label="Course status">
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} variant="underline" data-testid={`courses-tab-${t.value}`}>
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground">{counts ? counts[t.value] : ''}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
        <p className="py-8 text-center text-sm text-muted-foreground">
          {search || categoryId ? 'No courses match your filters.' : (activeTab?.empty ?? 'No courses.')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    {descriptionText(row) ? (
                      <div className="text-xs text-muted-foreground line-clamp-1">{descriptionText(row)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {(row.categoryId && categoryName.get(row.categoryId)) ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <LearningStatusBadge status={row.status} />
                      {row.status === 'DRAFT' && row.draftVersionNumber ? (
                        <span className="text-xs text-muted-foreground" title="Version being edited">
                          v{row.draftVersionNumber}
                        </span>
                      ) : null}
                      {row.publishedVersionNumber ? (
                        <span className="text-xs text-muted-foreground" title="Version carers get">
                          v{row.publishedVersionNumber}
                        </span>
                      ) : null}
                      {row.draftVersionNumber && (row.status === 'PUBLISHED' || row.status === 'WITHDRAWN') ? (
                        <span
                          className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          title="A new version is being edited and is not published yet"
                        >
                          v{row.draftVersionNumber} draft
                        </span>
                      ) : null}
                    </div>
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
