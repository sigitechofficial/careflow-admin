/** Plain-words explanations for the ⓘ tips on the CQC notification pages. */
export const HELP = {
  listPage: (
    <div className="space-y-1.5">
      <p>
        Registered providers must tell the CQC about certain events, such as a death, a serious injury, abuse or an
        allegation of abuse, police involvement, or anything that stops the service running safely.
      </p>
      <p>
        Prepare the notification here, then send it yourself on the CQC provider portal and record that you sent it.
        CareFlow does not send anything to the CQC.
      </p>
    </div>
  ),
  target: (
    <>
      The law says "without delay". CareFlow aims for 24 hours from when the service became aware, and shows a
      notification as overdue after that.
    </>
  ),
  status: (
    <>
      <b>Draft:</b> still being written. <b>Ready to submit:</b> checked and complete. <b>Submitted:</b> sent to the
      CQC; what was sent is kept as it was. <b>Acknowledged:</b> the CQC has confirmed it. <b>Not required:</b> you
      decided no notification was needed (the reason is kept). <b>Cancelled:</b> started by mistake.
    </>
  ),
  becameAware: (
    <>When someone at the service first knew about the event. The 24-hour target counts from here.</>
  ),
  eventOccurred: <>When the event happened, as far as you know.</>,
  serviceUser: (
    <>
      The person the notification is about. Their name is only shown in CareFlow; the print copy uses their service
      user number, because the CQC asks providers not to send names.
    </>
  ),
  summary: (
    <>
      What happened, in plain words: where, who was involved (by role, not name), and how the person is now.
    </>
  ),
  actionsTaken: (
    <>What the service has done so far to keep the person and others safe and to stop it happening again.</>
  ),
  othersInformed: <>Everyone else who has been told, such as the local authority, police, family or GP.</>,
  submit: (
    <>
      Send the notification on the CQC provider portal first (or the CQC Word form by email), then record it here. The
      portal shows a reference once it is sent.
    </>
  ),
}
