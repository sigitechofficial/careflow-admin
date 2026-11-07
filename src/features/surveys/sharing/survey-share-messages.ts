/**
 * Ready-to-send messages with a survey's link: WhatsApp, text message and email. Plain, short and
 * honest about privacy: an anonymous survey says answers are not linked to anyone; a personal link
 * says it is personal. Nothing here is sent by CareFlow: staff copy the text (or open WhatsApp or
 * their email program with it filled in) and send it themselves.
 */
import type { SurveyTargetKind } from '@/features/surveys/types'

export type ShareMessageInput = {
  title: string
  url: string
  targetKind: SurveyTargetKind
  isAnonymous: boolean
  /** The organisation's name as people know it. */
  organisation?: string | null
  /** When the survey closes (ISO); said as a day. */
  closesAt?: string | null
  /** A person's own link (not to be passed on), or the shared link anyone may use. */
  linkKind: 'shared' | 'personal'
  /** A personal link: the person's first name, for the greeting. */
  firstName?: string | null
  /** Rough minutes it takes (ready-made surveys say). */
  minutes?: number | null
}

export type ShareMessages = {
  whatsapp: string
  text: string
  emailSubject: string
  emailBody: string
}

const UK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Friday 20 November" in the UK time zone (day only). */
export function closingDay(iso: string | null | undefined, timeZone = 'Europe/London'): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('weekday')} ${Number(get('day'))} ${UK_MONTHS[Number(get('month')) - 1]}`
}

function privacyLine(input: ShareMessageInput): string | null {
  if (input.isAnonymous) return 'Your answers are anonymous: they are not linked to your name.'
  if (input.linkKind === 'shared' && input.targetKind !== 'PUBLIC') {
    return 'Answers through this link are not linked to your name.'
  }
  return null
}

export function buildShareMessages(input: ShareMessageInput): ShareMessages {
  const from = input.organisation?.trim() ? input.organisation.trim() : 'us'
  const hello = input.firstName?.trim() ? `Hello ${input.firstName.trim()},` : 'Hello,'
  const ask =
    input.targetKind === 'EMPLOYEE'
      ? `Please tell ${from} what you think in our survey "${input.title}".`
      : `We would value your views in our survey "${input.title}".`
  const time = input.minutes && input.minutes > 0 ? `It takes about ${input.minutes} minute${input.minutes === 1 ? '' : 's'}.` : null
  const day = closingDay(input.closesAt)
  const by = day ? `Please answer by ${day}.` : null
  const privacy = privacyLine(input)
  const personal = input.linkKind === 'personal' ? 'This link is just for you, so please do not pass it on.' : null
  const sign = input.organisation?.trim() ? `Thank you, ${input.organisation.trim()}` : 'Thank you'

  const short = [hello, ask, time, by, input.url, privacy, personal, sign].filter(Boolean) as string[]
  return {
    whatsapp: short.join('\n'),
    // A text message: one block, as short as it can be while still saying the same.
    text: [ask, by, input.url, privacy, personal].filter(Boolean).join(' '),
    emailSubject: `Survey: ${input.title}`,
    emailBody: [hello, '', ask, [time, by].filter(Boolean).join(' '), '', input.url, '', privacy, personal, '', sign]
      .filter((l) => l !== null)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
  }
}

/** Opens WhatsApp (app or web) with the message filled in; the person chooses who to send it to. */
export const whatsappHref = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`

/** Opens the person's email program with the message filled in (no address: they choose). */
export const mailtoHref = (subject: string, body: string) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

/** A button for the organisation's website: plain HTML with inline styles, opening the survey in a new tab. */
export function websiteButtonSnippet(url: string, label = 'Tell us what you think'): string {
  const safeUrl = url.replace(/"/g, '&quot;')
  const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0d9488;color:#ffffff;font:600 16px/1.2 system-ui,sans-serif;text-decoration:none">${safeLabel}</a>`
}

/** One CSV cell (mail merge): quoted, quotes doubled, and a leading = + - @ made harmless for spreadsheets. */
export function csvCell(value: string): string {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${v.replace(/"/g, '""')}"`
}
