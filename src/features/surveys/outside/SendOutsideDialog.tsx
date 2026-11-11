import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
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
 * reminders use texts): people and lists from Outside people, and families of one or more people we support
 * from their People involved (only those who agreed to surveys: "Surveys" ticked on their sharing in Privacy). With one person chosen, the survey can
 * be linked to them, so it is found from their record. Shows who cannot be sent it and why before sending.
 */
export function SendOutsideDialog({ surveyId, open, onOpenChange }: { surveyId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [search, setSearch] = React.useState('')
  const { data: contacts } = useOutsideContacts(search)
  const { data: lists } = useOutsideLists()
  const [contactIds, setContactIds] = React.useState<string[]>([])
  const [listIds, setListIds] = React.useState<string[]>([])
  // Several people we support; their families are listed under each of them.
  const [people, setPeople] = React.useState<FeedbackPersonRef[]>([])
  const { data: families } = useFamiliesOf(people.map(p => p.id))
  const [familyIds, setFamilyIds] = React.useState<string[]>([])
  // A survey can be linked to one person's record, so "about" is offered only when one person is chosen.
  const person = people.length === 1 ? people[0]! : null
  const [about, setAbout] = React.useState(true)
  const [anyway, setAnyway] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [afterDeath, setAfterDeath] = React.useState(false)
  const [deathReason, setDeathReason] = React.useState('')
  React.useEffect(() => {
    if (open) {
      setContactIds([])
      setListIds([])
      setPeople([])
      setFamilyIds([])
      setAnyway(false)
      setReason('')
      setAfterDeath(false)
      setDeathReason('')
    }
  }, [open])
  const addPerson = (p: FeedbackPersonRef | null) => {
    if (p && !people.some(x => x.id === p.id)) setPeople(v => [...v, p])
  }
  // Removing a person also unticks their family.
  const removePerson = (id: string) => {
    setPeople(v => v.filter(x => x.id !== id))
    const theirs = new Set((families ?? []).filter(f => f.serviceUserId === id).map(f => f.sourceId))
    setFamilyIds(v => v.filter(x => !theirs.has(x)))
  }
  const canContact = (f: { consent: boolean; reachable: boolean }) => f.consent && f.reachable

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
      const res = await send.mutateAsync({
        ...input,
        ...(anyway ? { contactRuleOverride: { reason: reason.trim() } } : {}),
        ...(afterDeath ? { afterDeathReason: deathReason.trim() } : {}),
      })
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
            <legend className="text-sm font-medium">Families of people we support</legend>
            <ServiceUserPicker
              value={null}
              onChange={addPerson}
              placeholder={people.length ? 'Add another person we support…' : 'Choose the people we support…'}
              testId="send-outside-person"
            />
            {people.map(p => {
              const theirs = (families ?? []).filter(f => f.serviceUserId === p.id)
              const contactable = theirs.filter(canContact).map(f => f.sourceId)
              const allTicked = contactable.length > 0 && contactable.every(id => familyIds.includes(id))
              return (
                <div key={p.id} className="space-y-1 rounded-md border border-border px-3 py-2" data-testid={`send-outside-family-${p.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <div className="flex items-center gap-1">
                      {contactable.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setFamilyIds(v => (allTicked ? v.filter(id => !contactable.includes(id)) : [...new Set([...v, ...contactable])]))
                          }
                        >
                          {allTicked ? 'Untick all' : 'Tick all who can be contacted'}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => removePerson(p.id)}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {!families ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : theirs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No People involved recorded for {p.name}.</p>
                  ) : (
                    theirs.map(f => (
                      <label key={f.sourceId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          disabled={!canContact(f)}
                          checked={familyIds.includes(f.sourceId)}
                          onChange={e => toggle(setFamilyIds, f.sourceId, e.target.checked)}
                        />
                        <span>
                          {f.name}
                          <span className="text-xs text-muted-foreground">
                            {f.relationship ? ` · ${f.relationship}` : ''}
                            {!f.consent ? ' · has not agreed to surveys' : !f.reachable ? ' · no email or mobile' : ''}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                  {theirs.some(f => !f.consent) ? (
                    <p className="pt-1 text-xs text-muted-foreground">
                      To send them surveys,{' '}
                      <Link
                        to="/service-users/$serviceUserId/profile"
                        params={{ serviceUserId: p.id }}
                        search={{ tab: 'privacy' }}
                        className="font-medium text-primary underline underline-offset-2"
                        onClick={() => onOpenChange(false)}
                      >
                        tick “Surveys about our care” in {p.name}’s Privacy
                      </Link>
                      .
                    </p>
                  ) : null}
                </div>
              )
            })}
            {person && familyIds.length ? (
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input" checked={about} onChange={e => setAbout(e.target.checked)} />
                This survey is about {person.name}’s care (found from their record)
              </label>
            ) : people.length > 1 && familyIds.length ? (
              <p className="text-xs text-muted-foreground">
                Several people are chosen, so the survey is not linked to one person’s record. Each family member still gets their own link.
              </p>
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
              {check.noConsent ? <p className="text-muted-foreground">{check.noConsent} family {check.noConsent === 1 ? 'member has' : 'members have'} not agreed to surveys.</p> : null}
              {check.died ? <p className="text-muted-foreground">{check.died} family {check.died === 1 ? 'member' : 'members'} will not be sent it because the person we supported has died.</p> : null}
              {check.afterDeath ? (
                <>
                  <p>
                    The person this survey is about has died, so {check.afterDeath} {check.afterDeath === 1 ? 'person' : 'people'} will not be sent it unless you give a reason.
                  </p>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" checked={afterDeath} onChange={e => setAfterDeath(e.target.checked)} />
                    Send to them, with a reason
                  </label>
                  {afterDeath ? (
                    <Input
                      value={deathReason}
                      maxLength={300}
                      onChange={e => setDeathReason(e.target.value)}
                      placeholder="For example, an end-of-life care review (required, kept in the audit trail)"
                      aria-label="Why ask them now that the person has died"
                    />
                  ) : null}
                </>
              ) : null}
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
            disabled={
              send.isPending ||
              !chosen ||
              (anyway && reason.trim().length < 5) ||
              (afterDeath && deathReason.trim().length < 5) ||
              Boolean(check && check.sendNow === 0 && !(anyway && check.heldBack) && !(afterDeath && check.afterDeath))
            }
            onClick={() => void submit()}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
