import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import {
  SERVICE_USER_MODULE_CONTENT_WIDE_CLASS,
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import {
  useDeleteServiceUserCommunicationNote,
  useServiceUserCommunicationNotes,
} from '@/features/service-users/hooks/useServiceUserCommunicationNotes'
import {
  formatCommunicationNoteDate,
  formatCommunicationNoteTime,
} from '@/features/service-users/comms/communication-note-format'
import type { CommunicationNoteRow } from '@/features/service-users/comms/types'
import { AddCommunicationNoteDialog } from '@/features/service-users/comms/components/AddCommunicationNoteDialog'
import { ViewCommunicationNoteDialog } from '@/features/service-users/comms/components/ViewCommunicationNoteDialog'
import { Button } from '@/shared/ui/button'
import { ContentCard, contentTitleClass } from '@/shared/ui/content-section'
import { DataTable } from '@/shared/ui/data-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export default function ServiceUserCommsPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())
  const profileQuery = useServiceUser(serviceUserId)
  const notesQuery = useServiceUserCommunicationNotes(serviceUserId, apiConfigured)
  const deleteMutation = useDeleteServiceUserCommunicationNote(serviceUserId)

  const [addOpen, setAddOpen] = React.useState(false)
  const [viewNote, setViewNote] = React.useState<CommunicationNoteRow | null>(null)
  const [deleteNote, setDeleteNote] = React.useState<CommunicationNoteRow | null>(null)

  const rows = notesQuery.data ?? []

  const confirmDelete = async () => {
    if (!deleteNote) return
    try {
      await deleteMutation.mutateAsync(deleteNote.id)
      if (viewNote?.id === deleteNote.id) setViewNote(null)
      setDeleteNote(null)
      toastSuccess('Communication note deleted')
    } catch (e) {
      toastApiError(e, 'Could not delete communication note')
    }
  }

  const columns = React.useMemo<ColumnDef<CommunicationNoteRow>[]>(
    () => [
      {
        accessorKey: 'recordedAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatCommunicationNoteDate(row.original.recordedAt)}
          </span>
        ),
      },
      {
        id: 'time',
        accessorFn: row => row.recordedAt,
        header: 'Time',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatCommunicationNoteTime(row.original.recordedAt)}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.name}</span>,
      },
      {
        accessorKey: 'position',
        header: 'Position/Role',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.position}</span>,
      },
      {
        accessorKey: 'reason',
        header: 'Reason for communication',
        cell: ({ row }) => (
          <span className="max-w-[280px] truncate" title={row.original.reason}>
            {row.original.reason}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewNote(row.original)}
              aria-label="View communication note"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteNote(row.original)}
              aria-label="Delete communication note"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  if (profileQuery.isLoading && !profileQuery.data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS} data-testid="service-user-comms-page">
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={profileQuery.data ?? null}
        shellLayout="wide"
      />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} shellLayout="wide" />

      <div className={SERVICE_USER_MODULE_CONTENT_WIDE_CLASS}>
        <ContentCard className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={cn(contentTitleClass, 'inline-flex items-center gap-2')}>
              <MessageCircle className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden />
              Add a Communication Note
            </h2>
            <Button
              type="button"
              size="icon"
              onClick={() => setAddOpen(true)}
              disabled={!apiConfigured}
              aria-label="Add communication note"
              data-testid="add-communication-note-button"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {!apiConfigured ? (
            <p className="text-sm text-muted-foreground">
              Configure <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> to load and save
              communication notes.
            </p>
          ) : notesQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading communication notes…
            </div>
          ) : notesQuery.isError ? (
            <p className="text-sm text-destructive">Could not load communication notes.</p>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              emptyMessage="No communication notes yet."
            />
          )}
        </ContentCard>
      </div>

      <AddCommunicationNoteDialog
        serviceUserId={serviceUserId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <ViewCommunicationNoteDialog
        note={viewNote}
        open={Boolean(viewNote)}
        onOpenChange={open => {
          if (!open) setViewNote(null)
        }}
      />

      <AlertDialog open={Boolean(deleteNote)} onOpenChange={open => !open && setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete communication note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the note
              {deleteNote?.name ? ` from ${deleteNote.name}` : ''}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
