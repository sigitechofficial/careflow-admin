/** Plain-words explanations for the ⓘ tips on the audit pages. */
export const HELP = {
  dashboard: (
    <>
      Every audit for your branches: those due soon, overdue, in progress, completed and missed. Scheduled audits appear
      here by themselves; you can also conduct one now.
    </>
  ),
  timeline: (
    <>
      Each circle is a month and shows how many audits fall in it. Red: something was missed. Amber: audits still due.
      Green: all done. Hover over a circle for the details.
    </>
  ),
  tabs: (
    <>
      <b>Overdue:</b> past the due date but still in time. <b>Due:</b> not started yet. <b>In progress:</b> started.{' '}
      <b>Completed</b> and <b>Missed:</b> not completed within the days allowed after the due date.
    </>
  ),
  previous: <>The result of the last completed audit of the same kind for the same branch.</>,
  auditedItem: (
    <>
      What this audit looked at, for example the person supported, the carer observed or the file checked. Fill it in
      before completing the audit.
    </>
  ),
  standards: (
    <>
      Mark each standard <b>Met</b> or <b>Not met</b>. Click the chosen answer again to clear it. Tick{' '}
      <b>Celebrate this standard</b> for something done really well. A note is needed for anything not met; use{' '}
      <b>Create action</b> to put it right.
    </>
  ),
  score: (
    <>
      The share of answered standards that are met. 90% or more is compliant, 75% or more partially compliant, below
      that not compliant.
    </>
  ),
  window: (
    <>
      A scheduled audit can be completed a few days before it is due. After its due date it is overdue, and once the
      days allowed after it have passed it becomes missed.
    </>
  ),
  conductBranch: <>The branch being audited, or the whole organisation.</>,
  scheduleFirst: <>The first due date. The next ones follow at the chosen frequency.</>,
  scheduleWindow: (
    <>How many days before the due date it may be completed, and how many days after before it is marked as missed.</>
  ),
  scheduleAccountable: <>The person responsible for making sure each audit is done. Their audits show under My audits.</>,
  templateArea: <>What the audit is about. Add an area of your own if none fits.</>,
  templateAuditedItem: (
    <>
      Tick this when each audit looks at one thing, such as a person&apos;s care file or one carer. Give it a label, for
      example &quot;Person supported&quot;.
    </>
  ),
  templateBranches: <>Leave all unticked to use it at every branch.</>,
  reports: (
    <>
      How compliant the audits completed in the chosen period were, what is coming due, and the average result by month.
    </>
  ),
  actionStaff: <>The staff member who should do it. Type a name to search.</>,
  actionUrgent: <>Tick if it needs doing straight away. Urgent actions are shown first.</>,
}
