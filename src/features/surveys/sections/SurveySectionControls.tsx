import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, FolderInput, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiJson } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { surveyKeys } from '@/features/surveys/keys'

/**
 * The section manager on the survey page (API: survey-sections.service.ts, every change audited).
 * A section is the heading its questions share. Rename and introduction work once people have
 * answered too; moving follows the "Show only if" rules, and the API says why when it cannot.
 */
export const SECTION_INTRO_MAX = 300

type Change = { title: string; rename?: string; introduction?: string | null; move?: 'up' | 'down' }

export function useSectionActions(surveyId: string) {
  const qc = useQueryClient()
  // Returned, so a change resolves once the page shows it (focus can then move to what changed).
  const done = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) }),
      qc.invalidateQueries({ queryKey: surveyKeys.all() }),
    ])
  const post = (path: string) => async (body: object) =>
    apiJson(`/surveys/${surveyId}/sections/${path}`, { method: 'POST', body: JSON.stringify(body) })
  return {
    change: useMutation({ mutationFn: (c: Change) => post('change')(c), onSuccess: done }),
    remove: useMutation({ mutationFn: (title: string) => post('remove')({ title }), onSuccess: done }),
    gather: useMutation({ mutationFn: (title: string) => post('gather')({ title }), onSuccess: done }),
    place: useMutation({
      mutationFn: (p: { questionId: string; title: string | null }) => post('place')(p),
      onSuccess: done,
    }),
  }
}

/** Rename a section and set its introduction (one dialog, both optional). */
function EditSectionDialog({
  title,
  introduction,
  open,
  onClose,
  onSave,
  saving,
}: {
  title: string
  introduction: string
  open: boolean
  onClose: () => void
  onSave: (next: { title: string; introduction: string }) => void
  saving: boolean
}) {
  const [name, setName] = React.useState(title)
  const [intro, setIntro] = React.useState(introduction)
  const id = React.useId()
  React.useEffect(() => {
    if (open) {
      setName(title)
      setIntro(introduction)
    }
  }, [open, title, introduction])
  return (
    <Dialog open={open} onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Section “{title}”</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-name`} className="text-sm font-medium">
              Heading
            </label>
            <Input id={`${id}-name`} value={name} maxLength={200} onChange={e => setName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Changes the heading on every question in this section.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-intro`} className="text-sm font-medium">
              Introduction (optional)
            </label>
            <textarea
              id={`${id}-intro`}
              rows={3}
              maxLength={SECTION_INTRO_MAX}
              value={intro}
              onChange={e => setIntro(e.target.value)}
              aria-describedby={`${id}-intro-help`}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p id={`${id}-intro-help`} className="text-xs text-muted-foreground">
              One or two short sentences shown under the heading to people answering. {intro.length}/{SECTION_INTRO_MAX}
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !name.trim()} onClick={() => onSave({ title: name.trim(), introduction: intro.trim() })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The first control a keyboard can reach inside an element. */
function firstFocusable(el: Element | null | undefined): HTMLElement | null {
  return (
    el?.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ??
    null
  )
}

/** One section's heading on the survey page, with its actions. */
export function SurveySectionHeader({
  surveyId,
  title,
  introduction,
  canEdit,
  isFirst,
  isLast,
  split,
  onAddHere,
  onDropQuestion,
}: {
  surveyId: string
  /** '' = the questions with no section. */
  title: string
  introduction: string | null
  canEdit: boolean
  isFirst: boolean
  isLast: boolean
  /** The same heading is used somewhere else too. */
  split: boolean
  onAddHere: () => void
  /** A question dragged onto this heading moves into the section. */
  onDropQuestion: (questionId: string) => void
}) {
  const actions = useSectionActions(surveyId)
  const [editing, setEditing] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [over, setOver] = React.useState(false)
  const busy = actions.change.isPending || actions.remove.isPending
  // Focus management (WCAG 2.4.3): a move never leaves focus on a button that just became
  // unavailable, and removing a section moves focus to its first question, not to the page top.
  const itemRef = React.useRef<HTMLLIElement>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const upRef = React.useRef<HTMLButtonElement>(null)
  const downRef = React.useRef<HTMLButtonElement>(null)
  const afterRemove = React.useRef<Element | null>(null)
  const move = async (direction: 'up' | 'down') => {
    await run(
      actions.change.mutateAsync({ title, move: direction }),
      direction === 'up' ? 'Section moved up' : 'Section moved down',
      'Could not move the section',
    )
    requestAnimationFrame(() => {
      const used = direction === 'up' ? upRef.current : downRef.current
      const other = direction === 'up' ? downRef.current : upRef.current
      if (used && !used.disabled) used.focus()
      else if (other && !other.disabled) other.focus()
      else headingRef.current?.focus()
    })
  }

  const run = async (p: Promise<unknown>, done: string, failed: string) => {
    try {
      await p
      toastSuccess(done)
    } catch (e) {
      toastApiError(e, failed)
    }
  }

  const save = async (next: { title: string; introduction: string }) => {
    try {
      if (next.introduction !== (introduction ?? '')) {
        await actions.change.mutateAsync({ title, introduction: next.introduction || null })
      }
      if (next.title !== title) await actions.change.mutateAsync({ title, rename: next.title })
      toastSuccess('Section saved')
      setEditing(false)
    } catch (e) {
      toastApiError(e, 'Could not save the section')
    }
  }

  return (
    <li
      ref={itemRef}
      className={`pt-3 ${over ? 'rounded-md ring-2 ring-teal-600/50' : ''}`}
      data-testid="survey-section"
      onDragOver={e => {
        if (!canEdit || !e.dataTransfer.types.includes('application/x-careflow-question')) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        setOver(false)
        const id = e.dataTransfer.getData('application/x-careflow-question')
        if (id) onDropQuestion(id)
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={title ? 'survey-section-heading' : 'survey-no-section'}
          >
            {title || 'No section'}
          </h3>
          {introduction ? <p className="mt-0.5 text-xs text-muted-foreground" data-testid="survey-section-intro">{introduction}</p> : null}
        </div>
        {canEdit && title ? (
          <div className="flex shrink-0 flex-wrap items-center gap-0.5" role="group" aria-label={`Section ${title}`}>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 px-2" onClick={onAddHere}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add question here
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 px-2" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Rename or introduction
            </Button>
            {!split ? (
              <>
                <Button
                  ref={upRef}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Move section ${title} up`}
                  disabled={busy || isFirst}
                  onClick={() => void move('up')}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  ref={downRef}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Move section ${title} down`}
                  disabled={busy || isLast}
                  onClick={() => void move('down')}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              aria-label={`Remove section ${title} (its questions are kept)`}
              disabled={busy}
              onClick={() => setRemoving(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
      <EditSectionDialog
        title={title}
        introduction={introduction ?? ''}
        open={editing}
        saving={actions.change.isPending}
        onClose={() => setEditing(false)}
        onSave={next => void save(next)}
      />
      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogContent
          onCloseAutoFocus={e => {
            // The Remove button has gone with the section: go to the section's first question instead.
            const target = firstFocusable(afterRemove.current)
            afterRemove.current = null
            if (target?.isConnected) {
              e.preventDefault()
              target.focus()
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the section “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its questions stay where they are, without a heading. Its introduction is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                // Its first question stays on the page (same element), so it can take focus afterwards.
                const firstQuestion = itemRef.current?.nextElementSibling ?? null
                void actions.remove
                  .mutateAsync(title)
                  .then(() => {
                    toastSuccess('Section removed: its questions are kept')
                    afterRemove.current = firstQuestion
                    setRemoving(false)
                  })
                  .catch((err: unknown) => toastApiError(err, 'Could not remove the section'))
              }}
            >
              Remove section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

/** A heading used on questions that are not next to each other: say so, and offer to fix it. */
export function SplitSectionsWarning({ surveyId, titles, canEdit }: { surveyId: string; titles: string[]; canEdit: boolean }) {
  const { gather } = useSectionActions(surveyId)
  if (!titles.length) return null
  return (
    <div role="note" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100" data-testid="split-sections-warning">
      {titles.map(t => (
        <p key={t} className="flex flex-wrap items-center gap-2">
          <span>
            “{t}” is used on questions that are not next to each other, so people see the heading twice.
          </span>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={gather.isPending}
              onClick={() =>
                void gather
                  .mutateAsync(t)
                  .then(() => toastSuccess('Section put together'))
                  .catch((e: unknown) => toastApiError(e, 'Could not put the section together'))
              }
            >
              Put them together
            </Button>
          ) : null}
        </p>
      ))}
    </div>
  )
}

/** Keyboard (and screen reader) way to move a question into another section. */
export function MoveToSectionButton({
  surveyId,
  questionId,
  questionNumber,
  current,
  sections,
}: {
  surveyId: string
  questionId: string
  questionNumber: number
  current: string
  sections: string[]
}) {
  const { place } = useSectionActions(surveyId)
  const [open, setOpen] = React.useState(false)
  const [choice, setChoice] = React.useState('')
  const [fresh, setFresh] = React.useState('')
  const id = React.useId()
  const others = sections.filter(s => s !== current)
  const target = choice === '__new' ? fresh.trim() : choice
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label={`Move question ${questionNumber} to another section`}
        title="Move to another section"
        onClick={() => {
          setChoice(others[0] ?? '__none')
          setFresh('')
          setOpen(true)
        }}
      >
        <FolderInput className="h-4 w-4" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move question {questionNumber} to…</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <label htmlFor={`${id}-to`} className="text-sm font-medium">
              Section
            </label>
            <select
              id={`${id}-to`}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={choice}
              onChange={e => setChoice(e.target.value)}
            >
              {others.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {current ? <option value="__none">No section (at the end)</option> : null}
              <option value="__new">A new section…</option>
            </select>
            {choice === '__new' ? (
              <Input aria-label="New section heading" value={fresh} maxLength={200} onChange={e => setFresh(e.target.value)} />
            ) : null}
            <p className="text-xs text-muted-foreground">It goes to the end of that section.</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={place.isPending || (choice === '__new' && !target)}
              onClick={() =>
                void place
                  .mutateAsync({ questionId, title: choice === '__none' ? null : target })
                  .then(() => {
                    toastSuccess('Question moved')
                    setOpen(false)
                  })
                  .catch((e: unknown) => toastApiError(e, 'Could not move the question'))
              }
            >
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
