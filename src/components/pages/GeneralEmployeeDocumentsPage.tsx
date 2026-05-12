import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FileText, Search } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchEmployeeDocumentsRegistry,
  type EmployeeDocumentRegistryRow,
} from '@/lib/employees-api'
import { resolveMediaUrl } from '@/lib/media-url'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function GeneralEmployeeDocumentsPage() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const tokenReady = Boolean(accessToken?.includes('.'))

  const [rows, setRows] = React.useState<EmployeeDocumentRegistryRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')

  const load = React.useCallback(async () => {
    if (!apiConfigured || !tokenReady) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEmployeeDocumentsRegistry()
      setRows(data)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not load documents.'
      setError(msg)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [apiConfigured, tokenReady])

  React.useEffect(() => {
    void load()
  }, [load])

  const q = query.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!q) return rows
    return rows.filter(
      r =>
        r.employeeName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        r.fileName.toLowerCase().includes(q),
    )
  }, [rows, q])

  const offline = !apiConfigured || !tokenReady

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-1.5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-muted-foreground" />
            General Employee Documents
          </div>
          <p className="text-sm text-muted-foreground">
            Files uploaded against employee profiles (insurance, right-to-work, training, etc.). Open a row to download;
            use Edit employee to manage documents for one person.
          </p>
        </div>
      </div>

      {offline ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> and sign in with{' '}
            <code className="rounded bg-muted px-1">employees.documents.read</code> to load this list.
          </CardContent>
        </Card>
      ) : null}

      {!offline && error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!offline ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by employee, title, or file name…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9"
                aria-label="Filter documents"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">Document</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Size</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Uploaded</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                        {rows.length === 0 ? 'No documents uploaded yet.' : 'No rows match your filter.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(r => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-foreground">{r.employeeName}</div>
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: r.employeeId }}
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Edit employee
                          </Link>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <a
                                href={resolveMediaUrl(r.fileUrl) ?? r.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {r.name}
                              </a>
                              {r.description ? (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                              ) : null}
                              <p className="mt-0.5 text-[11px] text-muted-foreground/80">{r.fileName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatBytes(r.fileSize)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(r.uploadedDate).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <a
                            href={resolveMediaUrl(r.fileUrl) ?? r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn('text-xs font-medium text-primary underline-offset-2 hover:underline')}
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {rows.length} document{rows.length === 1 ? '' : 's'}.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
