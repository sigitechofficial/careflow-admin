import * as React from 'react'
import {
  Eye,
  EyeOff,
  Calendar,
  Info,
  Filter,
  Trash2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'
import type { TemporaryInspectorRow } from '@/features/employees/types'
import {
  useCreateTemporaryInspector,
  useDeleteTemporaryInspector,
  useTemporaryInspectorOptions,
  useTemporaryInspectors,
} from '@/features/employees/hooks/useTemporaryInspectors'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { MultiSelect } from '@/shared/ui/multi-select'
import { operationalTodayIso, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'

const PAGE_SIZE = 5

const RESIDENT_SCOPE_TOOLTIP =
  'The temporary user will be able to see data only for the selected service users. Leave empty (or clear all) for access to all service users.'

/** Today 09:00–17:00 in the organisation timezone (datetime-local values). */
function defaultWindow(): { from: string; to: string } {
  const day = operationalTodayIso()
  return { from: `${day}T09:00`, to: `${day}T17:00` }
}

function FormRow({
  label,
  required,
  labelTooltip,
  children,
  className,
}: {
  label: string
  required?: boolean
  labelTooltip?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        {labelTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="More information"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left leading-snug">
              {labelTooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export default function TempInspectorPage() {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const tokenReady = Boolean(accessToken?.includes('.'))

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [userName, setUserName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPwd, setShowPwd] = React.useState(false)
  const [dateWindow, setDateWindow] = React.useState(() => defaultWindow())
  const [reason, setReason] = React.useState('')
  const [residentKeys, setResidentKeys] = React.useState<string[]>([])

  const enabled = apiConfigured && tokenReady
  const optionsQuery = useTemporaryInspectorOptions(enabled)
  const listQuery = useTemporaryInspectors(enabled)
  const createMutation = useCreateTemporaryInspector()
  const deleteMutation = useDeleteTemporaryInspector()

  const serviceUserOptions = optionsQuery.data ?? []
  const rows = listQuery.data ?? []
  const listLoading = listQuery.isLoading
  const optionsLoading = optionsQuery.isLoading
  const saving = createMutation.isPending
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    if (optionsQuery.error) {
      const msg =
        optionsQuery.error instanceof ApiError
          ? optionsQuery.error.message
          : 'Could not load service user options.'
      setBanner({ type: 'error', text: msg })
    }
  }, [optionsQuery.error])

  React.useEffect(() => {
    if (listQuery.error) {
      const msg =
        listQuery.error instanceof ApiError ? listQuery.error.message : 'Could not load temporary inspectors.'
      setBanner({ type: 'error', text: msg })
    }
  }, [listQuery.error])

  React.useEffect(() => {
    setPage(1)
  }, [rows.length])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (id: string) => {
    if (!enabled) return
    setBanner(null)
    try {
      await deleteMutation.mutateAsync(id)
      setBanner({ type: 'success', text: 'Temporary inspector removed.' })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Delete failed.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const handleSave = async () => {
    if (!apiConfigured || !tokenReady) {
      setBanner({ type: 'error', text: 'Configure API URL and sign in to save.' })
      return
    }
    if (!firstName.trim() || !lastName.trim() || !userName.trim() || !password.trim() || !reason.trim()) {
      setBanner({ type: 'error', text: 'Fill in all required fields.' })
      return
    }
    // The access window is entered in organisation time, not the device's.
    const vf = new Date(orgDatetimeLocalToIso(dateWindow.from))
    const vt = new Date(orgDatetimeLocalToIso(dateWindow.to))
    if (Number.isNaN(vf.getTime()) || Number.isNaN(vt.getTime()) || vt.getTime() <= vf.getTime()) {
      setBanner({ type: 'error', text: 'Valid to must be after valid from.' })
      return
    }

    setBanner(null)
    try {
      await createMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: userName.trim(),
        password,
        reason: reason.trim(),
        validFrom: vf.toISOString(),
        validTo: vt.toISOString(),
        ...(residentKeys.length ? { serviceUserKeys: residentKeys } : {}),
      })
      setBanner({ type: 'success', text: 'Temporary inspector saved.' })
      setFirstName('')
      setLastName('')
      setUserName('')
      setPassword('')
      setReason('')
      setResidentKeys([])
      setDateWindow(defaultWindow())
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Save failed.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const offlineHelp =
    !apiConfigured || !tokenReady
      ? 'Set VITE_API_BASE_URL and sign in with a real account (employees.read / employees.update) to load and save records.'
      : null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {banner ? (
          <div
            role="status"
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            )}
          >
            {banner.text}
          </div>
        ) : null}

        {offlineHelp ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {offlineHelp}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">How they sign in:</span> open{' '}
            <Link to="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
            , choose <strong className="text-foreground">Temporary inspector</strong>, and enter this record’s username
            and password (not email). Access only works between Valid from and Valid to.
          </div>
        )}

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-1.5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Temporary Inspector Login
            </div>
            <p className="text-sm text-muted-foreground">
              Create and manage temporary inspector access (stored in the database).
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pb-6 pt-6">
            <h2 className="mb-6 text-lg font-semibold">Add Temporary User</h2>

            <div className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
              <div className="space-y-5">
                <FormRow label="First Name" required>
                  <Input placeholder="Enter first name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </FormRow>

                <FormRow label="User Name" required>
                  <Input placeholder="Enter user name" value={userName} onChange={e => setUserName(e.target.value)} />
                </FormRow>

                <FormRow label="Password" required>
                  <div className="relative flex">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="flex h-9 w-full rounded-l-md border border-input border-r-0 bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="h-9 rounded-r-md border border-input border-l-0 bg-background px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormRow>

                <FormRow label="Reason for Login" required>
                  <textarea
                    rows={4}
                    placeholder="Enter reason for login"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </FormRow>

                <FormRow label="Select residents" labelTooltip={RESIDENT_SCOPE_TOOLTIP}>
                  <MultiSelect
                    options={serviceUserOptions.map(o => ({ value: o.id, label: o.name }))}
                    value={residentKeys}
                    onChange={setResidentKeys}
                    placeholder={optionsLoading ? 'Loading…' : 'All service users — pick one or more to restrict'}
                    searchPlaceholder="Search residents…"
                    disabled={!tokenReady || optionsLoading || serviceUserOptions.length === 0}
                    className="min-h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional scope (multi-select).{' '}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                        >
                          <Info className="h-3.5 w-3.5" />
                          How this works
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm text-left leading-snug">
                        {RESIDENT_SCOPE_TOOLTIP}
                      </TooltipContent>
                    </Tooltip>
                  </p>
                </FormRow>
              </div>

              <div className="space-y-5">
                <FormRow label="Last Name" required>
                  <Input placeholder="Enter last name" value={lastName} onChange={e => setLastName(e.target.value)} />
                </FormRow>

                <FormRow label="Valid from" required>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={dateWindow.from}
                      onChange={e => setDateWindow(w => ({ ...w, from: e.target.value }))}
                      className="min-w-0 flex-1"
                    />
                    <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Calendar className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </FormRow>

                <FormRow label="Valid to" required>
                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={dateWindow.to}
                      onChange={e => setDateWindow(w => ({ ...w, to: e.target.value }))}
                      className="min-w-0 flex-1"
                    />
                    <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Calendar className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </FormRow>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-border pt-4">
              <Button onClick={() => void handleSave()} disabled={saving || !tokenReady} className="px-8">
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pb-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">Inspector Name</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">Status</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">Expire on</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">User Name</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">Resident scope</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">Reason for Login</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    paged.map(row => (
                      <tr
                        key={row.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-muted/20"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant={row.status === 'Active' ? 'success' : 'muted'} size="sm">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.expireOnLabel}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.username}</td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                          {row.residentScopeLabel}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.reason}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              title="Remove"
                              onClick={() => void handleDelete(row.id)}
                              className="text-destructive/60 transition-colors hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {!listLoading && paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No records found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4">
              <p className="text-xs text-muted-foreground">
                Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, rows.length)}{' '}
                of {rows.length} entries
              </p>

              <div className="flex items-center gap-1">
                <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
                  Previous
                </PaginationBtn>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      'h-8 w-8 rounded text-xs font-medium transition-colors',
                      page === n
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-foreground hover:bg-muted'
                    )}
                  >
                    {n}
                  </button>
                ))}

                <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                  <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                </PaginationBtn>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

function PaginationBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 items-center rounded border border-border px-3 text-xs font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-40'
          : 'bg-background text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
