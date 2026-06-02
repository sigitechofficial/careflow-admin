import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FileText, Search } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeDocumentsRegistry } from '@/features/employees/hooks/useEmployees'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function GeneralEmployeeDocumentsPage() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const tokenReady = Boolean(useAuthStore(s => s.accessToken)?.includes('.'))
  const enabled = apiConfigured && tokenReady

  const { data: rows = [], isLoading: loading, error: queryError, refetch } = useEmployeeDocumentsRegistry(enabled)
  const [query, setQuery] = React.useState('')

  const error =
    queryError instanceof ApiError
      ? queryError.message
      : queryError
        ? 'Could not load documents.'
        : null

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q)),
    )
  }, [rows, query])

  if (!apiConfigured) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Configure VITE_API_BASE_URL to load employee documents.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">General Employee Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All uploaded employee documents across the organisation.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No documents found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      to="/employee/$employeeId/edit"
                      params={{ employeeId: row.employeeId }}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.employeeName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const href = resolveMediaUrl(row.fileUrl)
                      return href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {row.name}
                        </a>
                      ) : (
                        row.name
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatBytes(row.fileSize)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.uploadedDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.tags.map(tag => (
                        <span
                          key={tag}
                          className={cn(
                            'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground',
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
