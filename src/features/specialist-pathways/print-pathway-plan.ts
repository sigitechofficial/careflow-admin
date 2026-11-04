import { PATHWAY_META } from '@/features/specialist-pathways/pathway-specs'
import {
  CASE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  REVIEW_OUTCOME_LABELS,
  RISK_LEVEL_LABELS,
  fmtDate,
} from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase, PathwayPlanContent } from '@/features/specialist-pathways/types/specialist-pathway.types'

function esc(v: string | null | undefined): string {
  return (v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Text with line breaks kept. */
const para = (v: string | null | undefined) => esc(v).replace(/\n/g, '<br>')

const table = (head: string[], rows: string[][]) =>
  `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`

const section = (title: string, body: string) => `<h2>${esc(title)}</h2>${body}`
const none = (text: string) => `<p class="muted">${esc(text)}</p>`

/**
 * Opens a printable A4 summary of the case: the approved care plan (or the latest version when none is
 * approved), open risks, professionals and the last review. The browser print dialog can save it as PDF.
 */
export function printPathwayCarePlan(c: PathwayCase): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false

  const meta = PATHWAY_META[c.pathwayType]
  const plan = c.plans.find(p => p.status === 'APPROVED') ?? c.plans[0]
  const content: PathwayPlanContent = plan?.content ?? {}
  const needs = content.needs ?? []
  const consent = content.consent
  const openRisks = c.risks.filter(r => r.status === 'OPEN')
  const lastReview = c.reviews[0]

  const planHtml = !plan
    ? none('No care plan has been written yet.')
    : [
        `<p class="muted">Version ${plan.version} · ${esc(PLAN_STATUS_LABELS[plan.status])}${
          plan.decidedByName && plan.status === 'APPROVED'
            ? ` · approved by ${esc(plan.decidedByName)} on ${esc(fmtDate(plan.decidedAt))}`
            : ''
        }${content.reviewDate ? ` · plan review ${esc(fmtDate(content.reviewDate))}` : ''}</p>`,
        content.summary ? `<p>${para(content.summary)}</p>` : '',
        needs.length
          ? table(
              ['Area', 'Need', 'Outcome wanted', 'Support', 'Who helps', 'How often'],
              needs.map(n => [esc(n.area), para(n.need), para(n.outcome), para(n.support), esc(n.whoHelps), esc(n.frequency)]),
            )
          : '',
        content.goals ? `<h3>Goals</h3><p>${para(content.goals)}</p>` : '',
        content.support ? `<h3>Support</h3><p>${para(content.support)}</p>` : '',
        consent
          ? `<h3>Consent</h3><p>${
              consent.agreed ? 'Plan agreed' : 'Not yet agreed'
            }${consent.agreedBy ? ` by ${esc(consent.agreedBy)}` : ''}${
              consent.relationship ? ` (${esc(consent.relationship)})` : ''
            }${consent.date ? ` on ${esc(fmtDate(consent.date))}` : ''}${consent.method ? ` · ${esc(consent.method)}` : ''}</p>`
          : '',
      ].join('')

  const risksHtml = openRisks.length
    ? table(
        ['Risk', 'Score', 'Controls in place', 'Review by'],
        openRisks.map(r => [
          `<strong>${esc(r.title)}</strong>${r.category ? `<br><span class="muted">${esc(r.category)}</span>` : ''}`,
          `${r.score} · ${esc(RISK_LEVEL_LABELS[r.level])}`,
          para(r.controls),
          esc(fmtDate(r.reviewDate)),
        ]),
      )
    : none('No open risks.')

  const teamHtml = c.professionals.length
    ? table(
        ['Name', 'Role', 'Organisation', 'Contact'],
        c.professionals.map(p => [
          esc(p.name),
          esc(p.role),
          esc(p.organisation),
          [p.phone, p.email].filter(Boolean).map(esc).join('<br>'),
        ]),
      )
    : none('No professionals recorded.')

  const reviewHtml = lastReview
    ? `<p>${esc(fmtDate(lastReview.reviewedAt))}${
        lastReview.reviewedByName ? ` by ${esc(lastReview.reviewedByName)}` : ''
      } · ${esc(REVIEW_OUTCOME_LABELS[lastReview.outcome])}</p>${lastReview.notes ? `<p>${para(lastReview.notes)}</p>` : ''}`
    : none('No reviews recorded yet.')

  const title = `${c.serviceUserName ?? 'Service user'} — ${meta.label} care plan`
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111;font-size:12px;line-height:1.45;margin:24px}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #222}
h3{font-size:12px;margin:12px 0 4px}p{margin:4px 0}.muted{color:#666}
.head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #ccc;padding-bottom:10px}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.facts div span{display:block;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.03em}
table{border-collapse:collapse;width:100%;margin-top:6px}th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top}
th{background:#f2f2f2;font-size:11px}tr{page-break-inside:avoid}
.foot{margin-top:28px;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:6px}
</style></head><body>
<div class="head"><div><h1>${esc(c.serviceUserName ?? 'Service user')}</h1>
<p class="muted">${esc(meta.label)} pathway · ${esc(c.ref)}</p></div>
<div style="text-align:right"><strong>Specialist care plan</strong></div></div>
<div class="facts">
<div><span>Status</span>${esc(CASE_STATUS_LABELS[c.status])}</div>
<div><span>Case opened</span>${esc(fmtDate(c.createdAt))}</div>
<div><span>Next review</span>${esc(fmtDate(c.reviewDueDate))}${c.reviewOverdue ? ' (overdue)' : ''}</div>
<div><span>Highest open risk</span>${c.highestRiskScore ?? '—'}</div>
</div>
${section('Care plan', planHtml)}
${section('Open risks', risksHtml)}
${section('Professionals involved', teamHtml)}
${section('Last review', reviewHtml)}
<p class="foot">Printed ${esc(new Date().toLocaleString())}. Confidential — contains personal and health information.</p>
<script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
  return true
}
