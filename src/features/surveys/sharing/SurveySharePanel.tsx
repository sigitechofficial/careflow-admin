import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Code2, Copy, Download, ExternalLink, Link2, Mail, MessageCircle, Printer, QrCode, RefreshCw, Smartphone } from 'lucide-react'
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
import { buildSurveyShareUrl } from '@/features/surveys/api/surveys.api'
import { SurveyBranchLinksPanel } from '@/features/surveys/components/SurveyBranchLinksPanel'
import type { SurveyDetail } from '@/features/surveys/types'
import { useRenewMainLink, useSetSharedLink, useShareLinks, useSharedLinkSettings } from '@/features/surveys/sharing/survey-sharing.api'
import { SurveyQrCode, downloadQrSvg } from '@/features/surveys/sharing/SurveyQrCode'
import { buildShareMessages, mailtoHref, websiteButtonSnippet, whatsappHref } from '@/features/surveys/sharing/survey-share-messages'
import { SharedLinkLimit } from '@/features/surveys/sharing/SharedLinkLimit'

/** What turning on the shared link means, shown before it is turned on. */
export function sharedLinkTradeOffs(namedSurvey: boolean): string[] {
  return namedSurvey
    ? [
        ...SHARED_LINK_TRADE_OFFS.slice(0, 2),
        'Someone the survey was sent to could answer twice: once with their own link and once through the shared link. Results show the two separately, and the response rate counts their own answers only.',
        ...SHARED_LINK_TRADE_OFFS.slice(2),
      ]
    : SHARED_LINK_TRADE_OFFS
}

const SHARED_LINK_TRADE_OFFS = [
  'Anyone who has the link can answer, and can answer more than once. CareFlow cannot tell who answered.',
  'Answers through the link are never linked to a name. You cannot reply to them, and they do not count as anyone on the survey’s list having answered.',
  'Questions asking to be contacted are not shown on the link.',
  'Answers are kept back and added in groups, like anonymous answers, so nobody can tell who answered from when an answer appears.',
  'Results show how many people answered through the link, never which answers came through it.',
  'Turning the link off stops it at once. Turning it on again gives a new link.',
]

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    toastSuccess(done)
  } catch {
    window.prompt('Copy this:', text)
  }
}

function CopyBlock({ id, label, value, rows = 4, actions }: { id: string; label: string; value: string; rows?: number; actions?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        readOnly
        rows={rows}
        value={value}
        className="w-full resize-y rounded-md border border-input bg-muted/40 px-2.5 py-1.5 font-sans text-xs text-foreground"
        onFocus={e => e.currentTarget.select()}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void copyText(value, `${label} copied`)}>
          <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
        </Button>
        {actions}
      </div>
    </div>
  )
}

type Section = 'messages' | 'qr' | 'website'

/**
 * Share a survey: its shared link (always on public surveys; staff and service-user surveys turn it
 * on here, after seeing what it means), ready-to-send messages, a QR code and printable poster, a
 * button for the organisation's website, a new link when one has gone too far, and a link for each
 * branch. Managers only; every change is audited by the API.
 */
export function SurveySharePanel({
  survey,
  canManage,
  /** Public draft: copying the link publishes it first (returns the token). */
  prepareMainLink,
}: {
  survey: SurveyDetail
  canManage: boolean
  prepareMainLink?: () => Promise<string | null>
}) {
  const forPublic = survey.targetKind === 'PUBLIC'
  const isPeriod = Boolean(survey.clonedFromId)
  const { data } = useShareLinks(survey.id, canManage && !survey.isTemplate)
  const setShared = useSetSharedLink(survey.id)
  const renew = useRenewMainLink(survey.id)
  const settings = useSharedLinkSettings(survey.id)
  const organisation = useCompanyStore(s => s.branding?.displayName ?? null)
  const [confirm, setConfirm] = React.useState<'on' | 'off' | 'renew' | null>(null)
  const [section, setSection] = React.useState<Section | null>(null)
  const headingId = React.useId()

  if (survey.isTemplate || !canManage) return null
  // Staff / service-user period copies: the shared link is set on the repeating survey.
  if (!forPublic && isPeriod) return null

  const enabled = forPublic || Boolean(data?.enabled)
  const token = data?.main?.token ?? (forPublic ? survey.shareToken : null)
  const url = token ? buildSurveyShareUrl(token) : null
  const messages = url
    ? buildShareMessages({
        title: survey.title,
        url,
        targetKind: survey.targetKind,
        isAnonymous: survey.isAnonymous,
        organisation,
        closesAt: survey.closesAt,
        linkKind: 'shared',
      })
    : null
  const closed = survey.status === 'CLOSED'
  const notOpenYet = survey.status === 'DRAFT'

  const copyMain = async () => {
    let t = token
    if (prepareMainLink && notOpenYet) t = await prepareMainLink()
    if (t) await copyText(buildSurveyShareUrl(t), 'Link copied')
  }

  const toggle = async (on: boolean) => {
    try {
      await setShared.mutateAsync(on)
      toastSuccess(on ? 'Shared link turned on' : 'Shared link turned off: it no longer works')
    } catch (e) {
      toastApiError(e, 'Could not change the shared link')
    } finally {
      setConfirm(null)
    }
  }

  const renewMain = async () => {
    try {
      await renew.mutateAsync()
      toastSuccess('New link made: the old one no longer works')
    } catch (e) {
      toastApiError(e, 'Could not make a new link')
    } finally {
      setConfirm(null)
    }
  }

  const sectionButton = (key: Section, icon: React.ReactNode, label: string) => (
    <Button
      type="button"
      size="sm"
      variant={section === key ? 'default' : 'outline'}
      className="gap-1"
      aria-expanded={section === key}
      aria-controls={`${headingId}-${key}`}
      onClick={() => setSection(s => (s === key ? null : key))}
    >
      {icon} {label}
    </Button>
  )

  return (
    <section className="mb-5 rounded-xl border border-border bg-card px-4 py-3" aria-labelledby={headingId} data-testid="survey-share-panel">
      <h2 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Link2 className="h-4 w-4" aria-hidden />
        {forPublic ? 'Shareable link' : 'Shared link'}
      </h2>

      {!forPublic && !enabled ? (
        <div className="mt-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            Everyone the survey is sent to has their own link. You can also turn on one shared link, for a poster in the
            office or a QR code at a meeting. Answers through it are never linked to a name.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirm('on')} disabled={setShared.isPending}>
            Turn on the shared link…
          </Button>
        </div>
      ) : url ? (
        <div className="mt-1 space-y-3">
          <p className="text-xs text-muted-foreground">
            {forPublic
              ? 'One link for everyone. Send it, print it as a poster or put it on your website.'
              : 'One link anyone can use. Answers through it are not linked to anyone.'}
            {notOpenYet ? (forPublic ? ' Copying it publishes the survey so people can answer.' : ' People can answer once the survey is open.') : ''}
            {closed ? ' This survey has closed: the link now says it has ended.' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 break-all rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-xs text-foreground" data-testid="shared-link-url">
              {url}
            </p>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void copyMain()}>
              <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setConfirm('renew')} disabled={renew.isPending}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> New link
            </Button>
            {!forPublic ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm('off')} disabled={setShared.isPending}>
                Turn off
              </Button>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-xs text-foreground" data-testid="once-per-device">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(data?.oncePerDevice)}
              disabled={settings.isPending || !data}
              onChange={e =>
                void settings
                  .mutateAsync({ oncePerDevice: e.target.checked })
                  .then(() => toastSuccess('Saved'))
                  .catch((err: unknown) => toastApiError(err, 'Could not save'))
              }
            />
            <span>
              <span className="font-medium">One answer per device.</span>{' '}
              <span className="text-muted-foreground">
                After answering, the phone or computer remembers it and will not take a second answer. Nothing about the
                person is kept and the page tells them. Someone can still use another device, so watch Results for
                unusual bursts.
              </span>
            </span>
          </label>

          {data?.linkLimit ? <SharedLinkLimit surveyId={survey.id} limit={data.linkLimit} /> : null}

          <div className="flex flex-wrap gap-2">
            {sectionButton('messages', <MessageCircle className="h-3.5 w-3.5" aria-hidden />, 'Messages to send')}
            {sectionButton('qr', <QrCode className="h-3.5 w-3.5" aria-hidden />, 'QR code and poster')}
            {sectionButton('website', <Code2 className="h-3.5 w-3.5" aria-hidden />, 'Website button')}
          </div>

          {section === 'messages' && messages ? (
            <div id={`${headingId}-messages`} className="grid gap-4 md:grid-cols-3">
              <CopyBlock
                id={`${headingId}-wa`}
                label="WhatsApp message"
                value={messages.whatsapp}
                rows={7}
                actions={
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={whatsappHref(messages.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open WhatsApp
                    </a>
                  </Button>
                }
              />
              <CopyBlock
                id={`${headingId}-sms`}
                label="Text message"
                value={messages.text}
                rows={7}
                actions={
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Smartphone className="h-3.5 w-3.5" aria-hidden /> {messages.text.length} characters
                  </span>
                }
              />
              <CopyBlock
                id={`${headingId}-email`}
                label="Email"
                value={`Subject: ${messages.emailSubject}\n\n${messages.emailBody}`}
                rows={7}
                actions={
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={mailtoHref(messages.emailSubject, messages.emailBody)}>
                      <Mail className="h-3.5 w-3.5" aria-hidden /> Open email
                    </a>
                  </Button>
                }
              />
              <p className="text-xs text-muted-foreground md:col-span-3">
                CareFlow does not send these: copy one into your own WhatsApp, phone or email and choose who to send it to.
              </p>
            </div>
          ) : null}

          {section === 'qr' ? (
            <div id={`${headingId}-qr`} className="flex flex-wrap items-start gap-4">
              <SurveyQrCode url={url} label={`QR code for the survey ${survey.title}`} className="w-36 rounded-md border border-border p-1" />
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>People scan it with their phone camera to open the survey.</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => void downloadQrSvg(url, `survey-qr-code.svg`).catch((e: unknown) => toastApiError(e, 'Could not save the QR code'))}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden /> Save QR code
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/surveys/$surveyId/poster" params={{ surveyId: survey.id }} search={{ link: 'main' }} target="_blank">
                      <Printer className="h-3.5 w-3.5" aria-hidden /> Printable poster
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'website' ? (
            <div id={`${headingId}-website`} className="space-y-2">
              <CopyBlock id={`${headingId}-snippet`} label="Button code for your website" value={websiteButtonSnippet(url)} rows={3} />
              <p className="text-xs text-muted-foreground">
                Paste it into your website’s editor (as HTML). It opens the survey in a new tab. The survey cannot be shown
                inside another website’s page: CareFlow blocks that to keep people’s answers safe.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {enabled && token ? (
        <div className="mt-3">
          <SurveyBranchLinksPanel surveyId={survey.id} />
        </div>
      ) : null}

      <AlertDialog open={confirm !== null} onOpenChange={o => (!o ? setConfirm(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'on' ? 'Turn on the shared link?' : confirm === 'off' ? 'Turn off the shared link?' : 'Make a new link?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {confirm === 'on' ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground" data-testid="shared-link-trade-offs">
                  {sharedLinkTradeOffs(!survey.isAnonymous).map(t => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : confirm === 'off' ? (
                <p>The link stops working at once. People who open it will see that the link is not available.</p>
              ) : (
                <p>
                  The old link stops working at once: posters, messages and web pages with it will say the link is not
                  available. Branch links are not changed.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                if (confirm === 'on') void toggle(true)
                else if (confirm === 'off') void toggle(false)
                else void renewMain()
              }}
            >
              {confirm === 'on' ? 'Turn on' : confirm === 'off' ? 'Turn off' : 'Make a new link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
