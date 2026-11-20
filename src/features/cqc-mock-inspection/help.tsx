/** Plain-words explanations for the ⓘ tips on the mock inspection pages. */
export const HELP = {
  whatToCheck: (
    <>
      The checks for this statement: the records to look at and what to ask people and staff. Mark each one{' '}
      <b>Met</b>, <b>Partially met</b> or <b>Not met</b> (click again to clear), then press <b>Save</b>. A note is
      needed when a check is not met or partially met. Use <b>Create action</b> to fix what you found. The answers help
      you choose the score below. The focus line says what this inspection cares about most.
    </>
  ),
  overallFocused: (
    <>
      This is a focused inspection: it covers some key questions only. Like CQC, it rates those key questions but gives
      no overall rating for the service. Run a full mock inspection for an overall rating.
    </>
  ),
  template: <>The ready-made inspection this was started from. It decides which statements are included.</>,
  attached: (
    <>
      <b>Policies:</b> the policies an inspector would expect to see behind these statements. <b>Surveys:</b> ready-made
      surveys that ask people about them. &quot;Adopted&quot; means your organisation already has its own copy; open
      one to read it, or open a ready-made one to adopt it.
    </>
  ),
  relatedSurveys: (
    <>
      Ready-made surveys that ask people we support, families, staff or partners about these statements. Adopt one
      (or open your template if you already have), send it before the inspection, and its results arrive in CQC
      evidence when it closes. &quot;Adopted&quot; means your organisation already has it as a template.
    </>
  ),
  readyMade: (
    <>
      Ready-made inspections save you deciding what to check. A full inspection covers everything; a focused
      inspection or topic deep dive covers fewer statements so it is quicker, and it rates only the key questions it
      covers. Each one tells you what records to look at and what to ask people and staff.
    </>
  ),
  listPage: (
    <>
      A mock inspection is a practice CQC inspection that you run yourself. You score each quality statement from 1 to
      4 against the evidence you hold, and the page works out the rating CQC would probably give. It is only for your
      own use; CQC never sees it.
    </>
  ),
  page: (
    <div className="space-y-1.5">
      <p>
        A practice CQC inspection. Look at the evidence for each quality statement, give it a score from 1 to 4, and
        the page works out the rating CQC would probably give. CQC never sees it.
      </p>
      <p>
        <b>Download PDF</b> saves a report to share. <b>Evidence pack</b> downloads your evidence, policies and
        mock results for a real CQC inspector. <b>Refresh evidence</b> loads the latest CQC evidence (your scores
        stay). <b>Complete</b> locks the ratings once every statement is scored. <b>Cancel inspection</b> stops it.
      </p>
    </div>
  ),
  status: (
    <>
      <b>In progress:</b> you can still change scores. <b>Completed:</b> the ratings are locked, but you can still add
      and tick off actions. <b>Cancelled:</b> stopped and kept only as a record.
    </>
  ),
  overall: (
    <>
      The rating for the whole service, worked out from the five key question ratings. It only appears once every
      statement has a score.
    </>
  ),
  gaps: (
    <>
      These statements have no evidence saved in CQC evidence. A real inspector would ask for proof, so add evidence
      there and then press <b>Refresh evidence</b>.
    </>
  ),
  keyQuestions: (
    <>
      CQC asks five questions: is the service Safe, Effective, Caring, Responsive and Well-led? Each card shows the
      rating, how many statements you have scored, and the total score as a percentage of the highest possible. One
      very low score can pull a rating down, and the card then says &quot;Limited from&quot;. Click a card to see its
      statements.
    </>
  ),
  statements: (
    <>
      What CQC expects to see under this key question. Click one to score it. The number is the score you gave
      (&ndash; means not scored yet), and the warning sign means there is no evidence for it.
    </>
  ),
  evidence: (
    <>
      The proof you hold for this statement, such as survey results, audits, policies or training records, taken from
      CQC evidence on the date shown. &quot;Review overdue&quot; means the evidence is due to be checked again. Survey
      results you are not allowed to see are only counted.
    </>
  ),
  score: (
    <>
      How well the service meets this statement: <b>1</b> big problems, <b>2</b> some problems, <b>3</b> good,{' '}
      <b>4</b> excellent. When the statement has checks, the score is worked out from them once every check is
      answered: Met counts 1, Partially met &frac12; and Not met 0. All met gives <b>4</b>, 75% or more <b>3</b>, 50% or
      more <b>2</b>, less <b>1</b>. Without checks, click a box to choose it (click again to clear), then press{' '}
      <b>Save</b>.
    </>
  ),
  comparison: (
    <>
      How this inspection compares with the last completed one for the same service: which ratings went up or down,
      and which statements scored higher or lower. It shows whether the service is getting better.
    </>
  ),
  actions: (
    <>
      Jobs to fix the problems you found, especially anything scored 1 or 2. Give each one a due date and tick it when
      it is done. You can still add actions after the inspection is completed.
    </>
  ),
  actionTitle: <>Say in one short sentence what needs to be done.</>,
  actionStatement: <>The statement this action fixes. Choose &quot;Not about one statement&quot; for general jobs.</>,
  actionAssignee: <>The staff member who should do it. Type a name to search. Leave it empty if it is not decided yet.</>,
  actionDue: <>The date it should be finished by. Leave it empty if there is no deadline.</>,
  actionDetail: <>Any extra detail, for example the steps to take or who is helping.</>,
  startTitle: <>A name to find this inspection by later, for example the month it was done.</>,
  startService: (
    <>
      The branch you are inspecting. Its own evidence and evidence for the whole organisation are used. Choose
      &quot;Whole organisation&quot; to inspect everything together.
    </>
  ),
  startNotes: <>Anything to remember about this inspection, for example why it is being done.</>,
  evidencePack: (
    <>
      A download to give a CQC inspector. For each quality statement it shows your current evidence, the published
      policies behind it, and the latest mock inspection score with any improvement actions still open. Every download
      is recorded.
    </>
  ),
  packScope: (
    <>
      Every quality statement for a full inspection, one key question (for example Safe) for a focused one, or a single
      statement when an inspector asks about one thing.
    </>
  ),
  packService: (
    <>
      One branch shows that branch&apos;s evidence and mock inspections plus anything for the whole organisation.
      Leave it on every branch for the whole service.
    </>
  ),
  packFormat: (
    <>
      <b>PDF:</b> one document to read, print or email. <b>ZIP folder:</b> the same PDF plus the files attached to the
      evidence, each published policy as a PDF, and a spreadsheet (CSV) of the evidence. Open the PDF first: it says
      where everything is.
    </>
  ),
}
