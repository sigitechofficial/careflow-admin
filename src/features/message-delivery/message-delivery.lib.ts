import type { DeliveryRules, MessageChannel, MessageDeliverySettings, MessageKind } from './message-delivery.api'

export const CHANNELS: Array<{ channel: MessageChannel; label: string; enabledKey: keyof DeliveryRules; audienceKey: keyof DeliveryRules | null }> = [
  { channel: 'EMAIL', label: 'Email', enabledKey: 'emailEnabled', audienceKey: 'emailAudience' },
  { channel: 'TEXT', label: 'Text messages (SMS)', enabledKey: 'textEnabled', audienceKey: 'textAudience' },
  // WhatsApp follows the text message audience and phone list.
  { channel: 'WHATSAPP', label: 'WhatsApp', enabledKey: 'whatsappEnabled', audienceKey: null },
  { channel: 'PUSH', label: 'Push notifications (carer app)', enabledKey: 'pushEnabled', audienceKey: 'pushAudience' },
]

export function rulesOf(s: MessageDeliverySettings): DeliveryRules {
  return {
    emailEnabled: s.emailEnabled,
    textEnabled: s.textEnabled,
    whatsappEnabled: s.whatsappEnabled,
    pushEnabled: s.pushEnabled,
    emailAudience: s.emailAudience,
    textAudience: s.textAudience,
    pushAudience: s.pushAudience,
    allowedEmails: s.allowedEmails,
    allowedPhones: s.allowedPhones,
    disabledKinds: s.disabledKinds,
    heldEmailsTo: s.heldEmailsTo,
  }
}

/** One entry per line or comma; blank lines dropped; duplicates removed (emails case-insensitively). */
export function parseList(text: string, lower = false): string[] {
  const items = text
    .split(/[\n,;]+/)
    .map(x => x.trim())
    .filter(Boolean)
    .map(x => (lower ? x.toLowerCase() : x))
  return [...new Set(items)]
}

const EMAIL_OR_DOMAIN = /^([^\s@]+@[^\s@]+\.[^\s@]+|@[^\s@]+\.[^\s@]+)$/
const PHONE = /^\+?[\d\s()-]{7,20}$/

/** Entries the API would refuse, so the page can say which before saving. */
export function invalidEntries(r: DeliveryRules): { emails: string[]; phones: string[]; heldInbox: boolean } {
  return {
    emails: r.allowedEmails.filter(e => !EMAIL_OR_DOMAIN.test(e)),
    phones: r.allowedPhones.filter(p => !PHONE.test(p)),
    heldInbox: Boolean(r.heldEmailsTo) && !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(r.heldEmailsTo ?? ''),
  }
}

/** Plain-English problems that would stop a save (also checked by the API). */
export function saveProblems(r: DeliveryRules): string[] {
  const bad = invalidEntries(r)
  const out: string[] = []
  if (bad.emails.length) out.push(`Not an email or @domain: ${bad.emails.join(', ')}`)
  if (bad.phones.length) out.push(`Not a phone number: ${bad.phones.join(', ')}`)
  if (bad.heldInbox) out.push('The held-emails inbox must be one email address.')
  if (r.emailAudience === 'ALLOWED_ONLY' && !r.allowedEmails.length) out.push('Emails are limited to the allowed list, but the list has no emails.')
  if (r.pushAudience === 'ALLOWED_ONLY' && !r.allowedEmails.length) out.push('Push is limited to the allowed list, but the list has no emails (carers are matched by email).')
  if (r.textAudience === 'ALLOWED_ONLY' && !r.allowedPhones.length) out.push('Texts are limited to the allowed list, but the list has no phone numbers.')
  return out
}

/** Only the fields that changed, so a save never overwrites someone else's change to another field. */
export function changedFields(before: DeliveryRules, after: DeliveryRules): Partial<DeliveryRules> {
  const out: Partial<DeliveryRules> = {}
  for (const k of Object.keys(after) as Array<keyof DeliveryRules>) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) (out as Record<string, unknown>)[k] = after[k]
  }
  return out
}

/** A one-line summary of where sending stands, for the top of the page. */
export function deliverySummary(r: DeliveryRules): { tone: 'success' | 'warning' | 'destructive'; text: string } {
  const off = CHANNELS.filter(c => !r[c.enabledKey]).map(c => c.label)
  const limited = CHANNELS.filter(c => c.audienceKey && r[c.audienceKey] === 'ALLOWED_ONLY' && r[c.enabledKey]).map(c => c.label)
  if (off.length === CHANNELS.length) return { tone: 'destructive', text: 'All sending is paused. Nothing is sent to anyone.' }
  const parts: string[] = []
  if (off.length) parts.push(`Switched off: ${off.join(', ')}.`)
  if (limited.length) parts.push(`Only to the allowed list: ${limited.join(', ')}.`)
  if (r.disabledKinds.length) parts.push(`${r.disabledKinds.length} message type${r.disabledKinds.length === 1 ? '' : 's'} switched off.`)
  if (!parts.length) return { tone: 'success', text: 'Everything is sent to everyone as normal.' }
  return { tone: 'warning', text: parts.join(' ') }
}

export const OUTCOME_LABEL = { SENT: 'Sent', HELD: 'Held back', REDIRECTED: 'Sent to held inbox', SKIPPED: 'Not delivered', FAILED: 'Failed' } as const
export const CHANNEL_LABEL: Record<MessageChannel, string> = { EMAIL: 'Email', TEXT: 'Text', WHATSAPP: 'WhatsApp', PUSH: 'Push' }

const AUDIENCE_TEXT = { EVERYONE: 'everyone', ALLOWED_ONLY: 'only the allowed list' } as const

/**
 * The unsaved changes in plain English ("Quotes emails: switched off"), shown in the save bar and in the
 * confirmation before saving on the live system.
 */
export function describeChanges(before: DeliveryRules, after: DeliveryRules, kinds: MessageKind[]): string[] {
  const out: string[] = []
  for (const c of CHANNELS) {
    if (before[c.enabledKey] !== after[c.enabledKey]) out.push(`${c.label}: ${after[c.enabledKey] ? 'switched back on' : 'switched OFF for everyone'}`)
    if (c.audienceKey && before[c.audienceKey] !== after[c.audienceKey]) {
      out.push(`${c.label}: sent to ${AUDIENCE_TEXT[after[c.audienceKey] as keyof typeof AUDIENCE_TEXT]}`)
    }
  }
  const added = after.allowedEmails.filter(x => !before.allowedEmails.includes(x)).length + after.allowedPhones.filter(x => !before.allowedPhones.includes(x)).length
  const removed = before.allowedEmails.filter(x => !after.allowedEmails.includes(x)).length + before.allowedPhones.filter(x => !after.allowedPhones.includes(x)).length
  if (added || removed) out.push(`Allowed list: ${[added ? `${added} added` : '', removed ? `${removed} removed` : ''].filter(Boolean).join(', ')}`)
  if ((before.heldEmailsTo ?? '') !== (after.heldEmailsTo ?? '')) out.push(after.heldEmailsTo ? `Held emails go to ${after.heldEmailsTo}` : 'Held emails are dropped (no held-emails inbox)')
  const label = (id: string) => {
    const k = kinds.find(x => x.id === id)
    return k ? `${k.label} (${CHANNEL_LABEL[k.channel]})` : id
  }
  const off = after.disabledKinds.filter(x => !before.disabledKinds.includes(x))
  const on = before.disabledKinds.filter(x => !after.disabledKinds.includes(x))
  // A handful are named; a whole group switched at once reads as one line.
  if (off.length > 4) out.push(`${off.length} message types switched off`)
  else for (const id of off) out.push(`${label(id)}: switched off`)
  if (on.length > 4) out.push(`${on.length} message types switched back on`)
  else for (const id of on) out.push(`${label(id)}: switched back on`)
  return out
}

export type KindFilter = { q: string; channel: MessageChannel | ''; status: 'all' | 'LIVE' | 'TO_BUILD' | 'OFF' }

/** The message types matching the search box and filters. */
export function filterKinds(kinds: MessageKind[], disabled: string[], f: KindFilter): MessageKind[] {
  const q = f.q.trim().toLowerCase()
  return kinds.filter(
    k =>
      (!f.channel || k.channel === f.channel) &&
      (f.status === 'all' || (f.status === 'OFF' ? disabled.includes(k.id) : k.status === f.status)) &&
      (!q || `${k.label} ${k.why} ${k.when}`.toLowerCase().includes(q)),
  )
}
