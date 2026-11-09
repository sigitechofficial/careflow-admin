import type * as React from 'react'
import type { ReferralExtraction } from '@/features/crm/api/referral-inbox.api'

const has = (v: string | null | undefined) => Boolean(v?.trim())

/** Section order, as Claude groups them. */
const SECTION_ORDER = [
  'About the person',
  'Home and household',
  'Health',
  'Medication',
  'Mobility',
  'Daily living',
  'Communication and behaviour',
  'Capacity and consent',
  'Safeguarding',
  'Package and current care',
  'Preferences and routines',
  'Child',
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line break-words text-sm">{children}</dd>
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  )
}

function Block({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`space-y-2 rounded-lg border border-border p-4 ${wide ? '2xl:col-span-2' : ''}`}>
      <h4 className="text-sm font-semibold">{title}</h4>
      <dl className="space-y-2">{children}</dl>
    </section>
  )
}

/**
 * Everything else a detailed referral form gave: key facts, allergies, medicines, equipment,
 * the people involved, outcomes, and every other fact grouped by section. Only filled-in parts show.
 */
export function ReferralFullDetails({ e }: { e: ReferralExtraction }) {
  const d = e.details
  if (!d) {
    return <p className="text-sm text-muted-foreground">This email was read before full details were recorded. Use “Read again” to get them.</p>
  }
  const k = d.keyFacts
  const keyRows: Array<[string, string]> = (
    [
      ['Package', k.packageType],
      ['Reply needed by', k.respondBy],
      ['Currently at', k.currentLocation],
      ['Access', k.access],
      ['Resuscitation', k.resuscitation],
      ['Medication support', k.medicationSupport],
      ['Transfers', k.transfers],
    ] as Array<[string, string]>
  ).filter(([, v]) => has(v))
  const allergies = d.allergies.filter(has)
  const medicines = d.medicines.filter(has)
  const outcomes = d.outcomes.filter(has)
  const groups = SECTION_ORDER.map(s => ({ section: s, items: d.sections.filter(x => x.section === s && has(x.value)) }))
    .concat([{ section: 'Other', items: d.sections.filter(x => !SECTION_ORDER.includes(x.section) && has(x.value)) }])
    .filter(g => g.items.length)

  if (!keyRows.length && !allergies.length && !medicines.length && !d.equipment.length && !d.people.length && !outcomes.length && !groups.length) {
    return <p className="text-sm text-muted-foreground">The referral gave no further details.</p>
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-2" data-testid="referral-full-details">
      {keyRows.length || allergies.length ? (
        <Block title="Key facts">
          {keyRows.map(([label, v]) => (
            <Row key={label} label={label}>
              {v}
            </Row>
          ))}
          {allergies.length ? (
            <Row label="Allergies">
              <span className="font-medium text-destructive">{allergies.join('; ')}</span>
            </Row>
          ) : null}
        </Block>
      ) : null}

      {medicines.length || d.equipment.length ? (
        <Block title="Medicines and equipment">
          {medicines.length ? (
            <Row label="Medicines">
              <Bullets items={medicines} />
            </Row>
          ) : null}
          {d.equipment.length ? (
            <Row label="Equipment">
              <Bullets items={d.equipment.map(x => (has(x.status) ? `${x.item} — ${x.status}` : x.item))} />
            </Row>
          ) : null}
        </Block>
      ) : null}

      {groups.map(g => (
        <Block key={g.section} title={g.section}>
          {g.items.map((x, i) => (
            <Row key={i} label={x.label || '—'}>
              {x.value}
            </Row>
          ))}
        </Block>
      ))}

      {outcomes.length ? (
        <Block title="Outcomes">
          <Bullets items={outcomes} />
        </Block>
      ) : null}

      {d.people.length ? (
        <section className="space-y-2 rounded-lg border border-border p-4 2xl:col-span-2">
          <h4 className="text-sm font-semibold">People involved</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Role</th>
                  <th className="py-1.5 pr-3 font-medium">Name</th>
                  <th className="py-1.5 pr-3 font-medium">Phone</th>
                  <th className="py-1.5 pr-3 font-medium">Email</th>
                  <th className="py-1.5 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {d.people.map((x, i) => (
                  <tr key={i} className="border-b border-border align-top last:border-0">
                    <td className="py-1.5 pr-3 font-medium">{x.role || '—'}</td>
                    <td className="py-1.5 pr-3">{x.name || '—'}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3">{x.phone || '—'}</td>
                    <td className="py-1.5 pr-3">{x.email || '—'}</td>
                    <td className="py-1.5">{x.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
