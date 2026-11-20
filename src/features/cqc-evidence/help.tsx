/** Plain-words explanations for the ⓘ tips on the CQC evidence page. */
export const HELP = {
  page: (
    <div className="space-y-1.5">
      <p>
        Everything you keep to show the CQC how good your care is: audits, training, complaints and compliments, survey
        results and more. Each piece of evidence is linked to the CQC quality statements it proves.
      </p>
      <p>
        An inspector looks at each quality statement and asks for proof. A statement with no evidence is a gap: fill it
        before an inspection.
      </p>
    </div>
  ),
  branch: (
    <>
      One branch shows that branch&apos;s evidence plus anything for the whole organisation. &quot;Every branch&quot;
      shows all of it.
    </>
  ),
  totals: (
    <>
      <b>With evidence:</b> quality statements that have at least one current piece of evidence. <b>Gaps:</b> statements
      with none. <b>Review overdue:</b> evidence whose review date has passed, so it may be out of date.
    </>
  ),
  keyQuestions: (
    <>
      The CQC&apos;s five key questions and their quality statements. The number beside a statement is how much
      current evidence it has. Click a statement to see its evidence below.
    </>
  ),
  list: (
    <>
      Current evidence, newest first. Survey results arrive here by themselves when a survey closes. Use the filters to
      find evidence by key question, type or category, or choose &quot;All statuses&quot; to include old evidence.
    </>
  ),
  formTitle: <>A short name an inspector will understand, with the date if it repeats, e.g. &quot;Medication audit, Q3 2026&quot;.</>,
  formSummary: <>In one or two sentences: what it found or shows. Numbers help, e.g. &quot;96% of records complete&quot;.</>,
  formType: <>Where the evidence comes from. Survey results are not added here: they arrive by themselves when a survey closes.</>,
  formCategory: (
    <>
      The CQC&apos;s kinds of evidence: what people we support say, what staff and partners say, what you saw
      (observation), how you work (processes) and the results for people (outcomes).
    </>
  ),
  formStatements: <>The CQC quality statements this evidence proves. Choose every one it fits; one piece can prove several.</>,
  formPeriod: <>The time the evidence is about, e.g. the months an audit covered. Leave empty if it has none.</>,
  formReview: <>When to check it is still true. After this date it shows as overdue, so an inspector does not see old evidence.</>,
  formCovers: <>The whole organisation, or only some branches. A branch&apos;s evidence shows for that branch.</>,
  formPairs: (
    <>
      What people told you and what you changed because of it. CQC looks for this: it shows you listen and act.
    </>
  ),
  formNotes: <>Only for your team: not shown in evidence packs.</>,
  files: (
    <>
      The documents that prove it: the audit, certificates, meeting minutes or a photo. They go into the ZIP evidence
      pack. A removed file is kept for the audit record but no longer shows here.
    </>
  ),
}
