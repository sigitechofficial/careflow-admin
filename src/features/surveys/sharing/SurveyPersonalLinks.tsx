import * as React from 'react'
import { Copy, Download, Link2, MessageCircle, RefreshCw } from 'lucide-react'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useCompanyStore } from '@/store/company.store'
import type { SurveyTargetKind } from '@/features/surveys/types'
import {
  absoluteSurveyUrl,
  fetchPersonalLinks,
  renewPersonalLink,
  useLinksCopiedHistory,
  type LinksCopiedEntry,
  type PersonalLink,
} from '@/features/surveys/sharing/survey-sharing.api'
import { formatSurveyDateTime } from '@/features/surveys/survey-datetime'
import { buildShareMessages, csvCell } from '@/features/surveys/sharing/survey-share-messages'

/**
 * People's own links on a named staff or service-user survey that is open: copy one person's link
 * (or a ready-to-send message with it), make a new link for one person, copy everyone's, or download
 * them for a mail merge. Every fetch is audited by the API (survey_links_copied). Never shown on an
 * anonymous survey: the API refuses there too.
 */
export type PersonalLinksContext = {
  surveyId: string
  title: string
  targetKind: SurveyTargetKind
  closesAt: string | null
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    toastSuccess(done)
  } catch {
    window.prompt('Copy this:', text)
  }
}

function firstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0]
  return first && first !== 'Employee' ? first : null
}

export function usePersonalMessage(ctx: PersonalLinksContext) {
  const organisation = useCompanyStore(s => s.branding?.displayName ?? null)
  return (link: Pick<PersonalLink, 'name' | 'path'>) =>
    buildShareMessages({
      title: ctx.title,
      url: absoluteSurveyUrl(link.path),
      targetKind: ctx.targetKind,
      isAnonymous: false,
      organisation,
      closesAt: ctx.closesAt,
      linkKind: 'personal',
      firstName: firstName(link.name),
    })
}

/** The mail-merge file: one row per person, with their link (and whether they have answered, when shown). */
export function personalLinksCsv(links: PersonalLink[]): string {
  const withAnswered = links.some(l => l.answered !== null)
  const head = ['Name', 'Link', ...(withAnswered ? ['Answered'] : [])]
  const rows = links.map(l => [l.name, absoluteSurveyUrl(l.path), ...(withAnswered ? [l.answered ? 'Yes' : 'No'] : [])])
  return [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}

function downloadText(fileName: string, text: string) {
  // A byte order mark so spreadsheet programs read names with accents correctly.
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

/** Asked before any personal link is copied: holding it means answering as that person. */
function ConfirmCopy({
  open,
  title,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  open: boolean
  title: string
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={o => (!o ? onCancel() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Anyone holding a person’s link can answer as that person. Only send each link to its person. Copying links is
            recorded on the survey.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const WHAT_LABEL: Record<LinksCopiedEntry['what'], (n: number) => string> = {
  ONE: () => 'copied one person’s link',
  ALL: n => `copied ${n} ${n === 1 ? 'link' : 'links'}`,
  MAIL_MERGE: n => `downloaded ${n} ${n === 1 ? 'link' : 'links'} for a mail merge`,
  NEW_LINK: () => 'made a new link for one person',
}

/** Who copied people's own links, or made a new one, and when (never the links). */
export function LinksCopiedHistory({ surveyId }: { surveyId: string }) {
  const [open, setOpen] = React.useState(false)
  const { data, isLoading } = useLinksCopiedHistory(surveyId, open)
  const id = React.useId()
  return (
    <div className="border-b border-border px-4 py-2 text-xs" data-testid="links-copied-history">
      <button
        type="button"
        className="font-medium text-foreground underline-offset-2 hover:underline"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >
        {open ? 'Hide who copied links' : 'Who copied links'}
      </button>
      {open ? (
        <div id={id} className="mt-1.5">
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !data?.length ? (
            <p className="text-muted-foreground">Nobody has copied any links yet.</p>
          ) : (
            <ul className="space-y-0.5 text-muted-foreground">
              {data.map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  {formatSurveyDateTime(e.at)}: <span className="text-foreground">{e.by}</span> {WHAT_LABEL[e.what](e.count)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function PersonalLinksToolbar({ ctx, canSeeAnswered }: { ctx: PersonalLinksContext; canSeeAnswered: boolean }) {
  const [onlyNotAnswered, setOnlyNotAnswered] = React.useState(canSeeAnswered)
  const [busy, setBusy] = React.useState(false)
  const [pending, setPending] = React.useState<'ALL' | 'CSV' | null>(null)
  const id = React.useId()

  const run = async (purpose: 'ALL' | 'CSV') => {
    setPending(null)
    setBusy(true)
    try {
      const links = await fetchPersonalLinks(ctx.surveyId, { purpose, ...(canSeeAnswered && onlyNotAnswered ? { onlyNotAnswered: true } : {}) })
      if (!links.length) {
        toastSuccess('Everyone has answered: there are no links to copy')
        return
      }
      if (purpose === 'CSV') {
        const safe = ctx.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'survey'
        downloadText(`${safe}-links.csv`, personalLinksCsv(links))
        toastSuccess(`${links.length} ${links.length === 1 ? 'link' : 'links'} downloaded`)
      } else {
        await copy(links.map(l => `${l.name}: ${absoluteSurveyUrl(l.path)}`).join('\n'), `${links.length} ${links.length === 1 ? 'link' : 'links'} copied`)
      }
    } catch (e) {
      toastApiError(e, 'Could not get the links')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2" data-testid="personal-links-toolbar">
      <span className="flex items-center gap-1 text-xs font-medium text-foreground">
        <Link2 className="h-3.5 w-3.5" aria-hidden /> Their own links
      </span>
      {canSeeAnswered ? (
        <label htmlFor={`${id}-only`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input id={`${id}-only`} type="checkbox" checked={onlyNotAnswered} onChange={e => setOnlyNotAnswered(e.target.checked)} />
          Only people who have not answered
        </label>
      ) : null}
      <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => setPending('ALL')}>
        <Copy className="h-3.5 w-3.5" aria-hidden /> Copy all links
      </Button>
      <Button type="button" size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => setPending('CSV')}>
        <Download className="h-3.5 w-3.5" aria-hidden /> Download for a mail merge
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        Each link is personal: anyone who has it can answer as that person. Copying them is recorded.
      </p>
      <ConfirmCopy
        open={pending !== null}
        title={pending === 'CSV' ? 'Download everyone’s links?' : 'Copy everyone’s links?'}
        confirmLabel={pending === 'CSV' ? 'Download' : 'Copy links'}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && void run(pending)}
      />
    </div>
  )
}

export function PersonalLinkRowActions({ ctx, recipientId, name, answered }: { ctx: PersonalLinksContext; recipientId: string; name: string; answered: boolean }) {
  const message = usePersonalMessage(ctx)
  const [confirm, setConfirm] = React.useState(false)
  const [pending, setPending] = React.useState<'link' | 'message' | null>(null)
  const [busy, setBusy] = React.useState(false)

  const one = async (what: 'link' | 'message') => {
    setPending(null)
    setBusy(true)
    try {
      const [link] = await fetchPersonalLinks(ctx.surveyId, { purpose: 'ONE', recipientIds: [recipientId] })
      if (!link) return
      if (what === 'link') await copy(absoluteSurveyUrl(link.path), `Link for ${name} copied`)
      else await copy(message(link).whatsapp, `Message for ${name} copied`)
    } catch (e) {
      toastApiError(e, 'Could not get the link')
    } finally {
      setBusy(false)
    }
  }

  const renew = async () => {
    setBusy(true)
    try {
      const res = await renewPersonalLink(ctx.surveyId, recipientId)
      await copy(absoluteSurveyUrl(res.path), `New link for ${name} copied: the old one no longer works`)
    } catch (e) {
      toastApiError(e, 'Could not make a new link')
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  if (answered) return null
  return (
    <div className="flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={busy} onClick={() => setPending('link')} aria-label={`Copy the link for ${name}`}>
        <Copy className="h-3.5 w-3.5" aria-hidden /> Link
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={busy} onClick={() => setPending('message')} aria-label={`Copy a message with the link for ${name}`}>
        <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Message
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" disabled={busy} onClick={() => setConfirm(true)} aria-label={`Make a new link for ${name}`}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden /> New link
      </Button>
      <ConfirmCopy
        open={pending !== null}
        title={`Copy ${name}’s own link?`}
        confirmLabel={pending === 'message' ? 'Copy message' : 'Copy link'}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && void one(pending)}
      />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make a new link for {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their old link stops working at once (for example, if it went to the wrong person), including the link in
              any email we sent them. The new link is copied for you to send them. The carer app and the portal keep
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void renew()
              }}
            >
              Make a new link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
