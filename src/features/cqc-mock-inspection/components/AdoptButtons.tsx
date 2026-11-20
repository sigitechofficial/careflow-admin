import * as React from 'react'
import { BookCopy, Loader2, Undo2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
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
import type { AdoptLibraryResult } from '../types'
import { useAdoptPolicies, useAdoptSurveys, useUndoAdoptPolicy, useUndoAdoptSurvey } from '../hooks'

export type AdoptKind = 'policy' | 'survey'

/**
 * Who may adopt from here: policies need policies.create; surveys need surveys.manage and access to
 * every branch, because an adopted survey becomes a template for the whole organisation.
 */
export function useCanAdopt(kind: AdoptKind): boolean {
  return useAuthStore(s =>
    kind === 'policy'
      ? s.can('policies.create')
      : s.can('surveys.manage') && !Array.isArray(s.user?.assignedLocationIds),
  )
}

const NEXT_STEP: Record<AdoptKind, string> = {
  policy: 'It is now your own draft policy: open it to check, edit and publish it.',
  survey: 'It is now in your survey Templates: open it to start a survey.',
}

function useAdopt(kind: AdoptKind) {
  const policies = useAdoptPolicies()
  const surveys = useAdoptSurveys()
  const mutation = kind === 'policy' ? policies : surveys
  const run = async (ids: string[]) => {
    try {
      const result: AdoptLibraryResult = await mutation.mutateAsync(ids)
      if (result.created.length === 1) toastSuccess(`Adopted: ${result.created[0]!.title}`, NEXT_STEP[kind])
      else if (result.created.length) toastSuccess(`Adopted ${result.created.length} ${kind === 'policy' ? 'policies' : 'surveys'}`, NEXT_STEP[kind])
      else toastSuccess('Nothing new to adopt', result.skipped.map(s => `${s.title} (${s.reason})`).join('; '))
    } catch (e) {
      toastApiError(e, 'Could not adopt')
    }
  }
  return { run, pending: mutation.isPending }
}

/** Small "Adopt" button on one policy or survey card. */
export function AdoptOneButton({ kind, id, title }: { kind: AdoptKind; id: string; title: string }) {
  const { run, pending } = useAdopt(kind)
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 shrink-0 px-2 text-xs"
      disabled={pending}
      onClick={() => void run([id])}
      aria-label={`Adopt ${title}`}
      data-testid={`mock-adopt-${kind}`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <BookCopy className="mr-1 h-3.5 w-3.5" aria-hidden />}
      {pending ? '' : 'Adopt'}
    </Button>
  )
}

/**
 * Who may undo adopting from here: a policy needs policies.archive (deleting a draft); a survey needs the same
 * access as adopting it.
 */
export function useCanUndoAdopt(kind: AdoptKind): boolean {
  const canSurvey = useCanAdopt('survey')
  const canPolicy = useAuthStore(s => s.can('policies.archive'))
  return kind === 'policy' ? canPolicy : canSurvey
}

/**
 * "Undo adopt" on an adopted policy or survey, after a confirmation. `id` is the organisation's own copy: a
 * policy's never-published draft is deleted; a survey template is removed (surveys already sent keep their answers).
 */
export function UndoAdoptButton({ kind, id, title }: { kind: AdoptKind; id: string; title: string }) {
  const policy = useUndoAdoptPolicy()
  const survey = useUndoAdoptSurvey()
  const mutation = kind === 'policy' ? policy : survey
  const [open, setOpen] = React.useState(false)
  const run = async () => {
    try {
      await mutation.mutateAsync(id)
      toastSuccess(`Adoption undone: ${title}`, kind === 'policy' ? 'Your draft copy was deleted.' : 'It was removed from your survey Templates.')
    } catch (e) {
      toastApiError(e, 'Could not undo adopt')
    }
  }
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
        disabled={mutation.isPending}
        onClick={() => setOpen(true)}
        aria-label={`Undo adopt ${title}`}
        data-testid={`mock-undo-adopt-${kind}`}
      >
        {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Undo2 className="mr-1 h-3.5 w-3.5" aria-hidden />}
        {mutation.isPending ? '' : 'Undo adopt'}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo adopting {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === 'policy'
                ? 'Your draft copy of this policy is deleted, with any edits made to it. This cannot be undone, but you can adopt the ready-made policy again.'
                : 'Your survey template is removed. Surveys already started from it keep their answers. You can adopt the ready-made survey again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()} data-testid={`mock-undo-adopt-${kind}-confirm`}>
              Undo adopt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** "Adopt all N" for the policies or surveys not yet adopted, after a confirmation. */
export function AdoptAllButton({ kind, ids }: { kind: AdoptKind; ids: string[] }) {
  const canAdopt = useCanAdopt(kind)
  const { run, pending } = useAdopt(kind)
  const [open, setOpen] = React.useState(false)
  if (!canAdopt || !ids.length) return null
  const noun = kind === 'policy' ? (ids.length === 1 ? 'policy' : 'policies') : ids.length === 1 ? 'survey' : 'surveys'
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        disabled={pending}
        onClick={() => setOpen(true)}
        data-testid={`mock-adopt-all-${kind}`}
      >
        {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <BookCopy className="mr-1 h-3.5 w-3.5" aria-hidden />}
        Adopt all {ids.length}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Adopt {ids.length} {noun}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {kind === 'policy'
                ? `Each one becomes your own draft policy with your organisation's name filled in. Check, edit and publish them before staff see them.`
                : 'Each one is added to your survey Templates for the whole organisation, ready to start a survey from.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => void run(ids)}
              data-testid={`mock-adopt-all-${kind}-confirm`}
            >
              Adopt {ids.length} {noun}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
