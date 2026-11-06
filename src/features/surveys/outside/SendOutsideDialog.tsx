import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { ServiceUserPicker } from '@/features/complaints/components/FeedbackPickers'
import type { FeedbackPersonRef } from '@/features/complaints/types'
import {
  OUTSIDE_KIND_LABEL,
  useFamiliesOf,
  useOutsideContacts,
  useOutsideLists,
  useSendOutside,
  useSendOutsideCheck,
  type SendOutsideInput,
} from './survey-outside'

/**
 * Send a named public survey to outside people, each with their own link (email, and text when the survey's
 * reminders use texts): people and lists from Outside people, and families of one person we support from
 * their People involved (only those who agreed to be contacted). The survey can be linked to that person, so
 * it is found from their record. Shows who cannot be sent it and why before sending.
 */
export function SendOutsideDialog({ surveyId, open, onOpenChange }: { surveyId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [search, setSearch] = React.useState('')
  const { data: contacts } = useOutsideContacts(search)
  const { data: lists } = useOutsideLists()
  const [contactIds, setContactIds] = React.useState<string[]>([])
  const [listIds, setListIds] = React.useState<string[]>([])
  const [person, setPerson] = React.useState<FeedbackPersonRef | null>(null)
  const { data: families } = useFamiliesOf(person ? [person.id] : [])
  const [familyIds, setFamilyIds] = React.useState<string[]>([])
  const [about, setAbout] = React.useState(true)
  const [anyway, setAnyway] = React.useState(false)
  const [reason, setReason] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setContactIds([])
      setListIds([])
      setPerson(null)
      setFamilyIds([])
      setAnyway(false)
      setReason('')
    }
  }, [open])
  React.useEffect(() => setFamilyIds([]), [person])

  const input: SendOutsideInput = {
    contactIds,
    listIds,
    familyContactIds: familyIds,
    ...(person && familyIds.length && about ? { aboutServiceUserId: person.id } : {}),
  }
  const chosen = contactIds.length + listIds.length + familyIds.length
  const { data: check } = useSendOutsideCheck(surveyId, input, open && chosen > 0)
  const send = useSendOutside(surveyId)
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string, on: boolean) => setter(v => (on ? [...v, id] : v.filter(x => x !== id)))

  const submit = async () => {
    try {
      const res = await send.mutateAsync({ ...input, ...(anyway ? { contactRuleOverride: { reason: reason.trim() } } : {}) })
      toastSuccess(res.message ?? 'Sent')
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'Could not send')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Send to people</DialogTitle>
          <DialogDescription>
            Each person gets their own link by email (and by text if this survey’s reminders use texts). Who has answered shows on the
            survey. Manage people and lists in <Link to="/surveys/outside-people" className="underline">Outside people</Link>.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Families of someone we support</legend>
            <ServiceUserPicker value={person} onChange={setPerson} placeholder="Choose the person we support…" testId="send-outside-person" />
            {person && families ? (
              families.length === 0 ? (
                <p className="text-xs text-muted-foreground">No People involved recorded for {person.name}.</p>
              ) : (
                <div className="space-y-1">
                  {families.map(f => (
                    <label key={f.sourceId} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        disabled={!f.consent || !f.reachable}
                        checked={familyIds.includes(f.sourceId)}
                        onChange={e => toggle(setFamilyIds, f.sourceId, e.target.checked)}
                      />
                      <span>
                        {f.name}
                        <span className="text-xs text-muted-foreground">
                          {f.relationship ? ` · ${f.relationship}` : ''}
                          {!f.consent ? ' · has not agreed to be contacted' : !f.reachable ? ' · no email or mobile' : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                  {familyIds.length ? (
                    <label className="flex items-center gap-2 pt-1 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded border-input" checked={about} onChange={e => setAbout(e.target.checked)} />
                      This survey is about {person.name}’s care (found from their record)
                    </label>
                  ) : null}
                </div>
              )
            ) : null}
          </fieldset>

          {lists?.length ? (
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Lists</legend>
              {lists.map(l => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" checked={listIds.includes(l.id)} onChange={e => toggle(setListIds, l.id, e.target.checked)} />
                  {l.name} <span className="text-xs text-muted-foreground">({l.members})</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">People</legend>
            <Input placeholder="Search outside people" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search outside people" />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {(contacts ?? []).map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={contactIds.includes(c.id)}
                    disabled={c.optedOut.includes('ALL')}
                    onChange={e => toggle(setContactIds, c.id, e.target.checked)}
                  />
                  <span>
                    {c.name}
                    <span className="text-xs text-muted-foreground">
                      {' · '}
                      {OUTSIDE_KIND_LABEL[c.kind]}
                      {c.organisation ? `, ${c.organisation}` : ''}
                      {c.optedOut.includes('ALL') ? ' · does not want surveys' : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {check ? (
            <div className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm" data-testid="send-outside-check" aria-live="polite">
              <p>
                {check.sendNow} {check.sendNow === 1 ? 'person' : 'people'} will be sent it now.
              </p>
              {check.already ? <p className="text-muted-foreground">{check.already} already have it.</p> : null}
              {check.optedOut ? <p className="text-muted-foreground">{check.optedOut} asked not to be contacted about surveys.</p> : null}
              {check.noDetails ? <p className="text-muted-foreground">{check.noDetails} have no email or mobile.</p> : null}
              {check.noConsent ? <p className="text-muted-foreground">{check.noConsent} family {check.noConsent === 1 ? 'member has' : 'members have'} not agreed to be contacted.</p> : null}
              {check.heldBack ? (
                <>
                  <p>
                    {check.heldBack} had another survey in the last 4 weeks and will not be sent it ({check.held.map(h => h.name).join(', ')}).
                  </p>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" checked={anyway} onChange={e => setAnyway(e.target.checked)} />
                    Send to them now anyway
                  </label>
                  {anyway ? (
                    <Input value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="Why (required, kept in the audit trail)" aria-label="Why send to them anyway" />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={send.isPending || !chosen || (anyway && reason.trim().length < 5) || Boolean(check && check.sendNow === 0 && !(anyway && check.heldBack))}
            onClick={() => void submit()}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
