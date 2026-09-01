import { LegalDocumentLayout, LegalList, LegalSection } from '@/features/legal/components/LegalDocumentLayout'

const LAST_UPDATED = '1 September 2026'

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy explains how we collect, use, store, and protect personal information
          when you use our care management platform. We are committed to handling personal data
          responsibly and in line with applicable data protection law, including the UK General Data
          Protection Regulation (UK GDPR) and the Data Protection Act 2018.
        </p>
        <p>
          By using the platform, you acknowledge that you have read this policy. If you do not agree
          with it, you should not use the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Who we are">
        <p>
          The platform is operated by your registered care provider or organisation (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). We act as a data controller for information processed
          through staff accounts, and as a data processor where we handle service user records on
          behalf of the care provider.
        </p>
        <p>
          For questions about this policy or how your data is handled, contact your organisation&apos;s
          Data Protection Officer or privacy contact using the details provided in your contract or
          internal handbook.
        </p>
      </LegalSection>

      <LegalSection title="3. Information we collect">
        <p>We may process the following categories of personal information:</p>
        <LegalList
          items={[
            'Staff and user account details (name, email, role, login activity, and access permissions).',
            'Service user records (identity, contact details, care plans, visits, medications, observations, and related clinical or social care notes).',
            'Employee and workforce information (employment details, training, scheduling, payroll-related data where enabled).',
            'Operational data (visit times, mileage, task completion, incidents, and audit logs).',
            'Technical data (IP address, browser type, device information, and system usage logs).',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. How we use your information">
        <p>We use personal information to:</p>
        <LegalList
          items={[
            'Provide, operate, and maintain the care management platform.',
            'Schedule visits, record care delivery, and support safe, person-centred care.',
            'Manage billing, payroll, and finance workflows where these modules are enabled.',
            'Maintain audit trails, security monitoring, and regulatory compliance.',
            'Communicate with authorised users about account access, alerts, and service updates.',
            'Improve reliability, troubleshoot issues, and protect against misuse or fraud.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Legal basis for processing">
        <p>Depending on the data and context, we rely on one or more of the following legal bases:</p>
        <LegalList
          items={[
            'Performance of a contract — to deliver the platform and related services.',
            'Legal obligation — to meet regulatory, safeguarding, or employment law requirements.',
            'Legitimate interests — to operate securely, prevent fraud, and improve the service (balanced against your rights).',
            'Consent — where required for optional features or communications (you may withdraw consent at any time).',
            'Vital interests or substantial public interest — in rare cases relating to health, safety, or safeguarding.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Sharing your information">
        <p>
          We do not sell personal data. We may share information only where necessary and lawful,
          including with:
        </p>
        <LegalList
          items={[
            'Authorised staff and carers within your organisation, according to role-based access controls.',
            'Funders, commissioners, or regulators when required for contracted care or statutory reporting.',
            'IT and hosting providers who support the platform under strict confidentiality and security terms.',
            'Professional advisers or authorities where required by law, court order, or safeguarding duty.',
          ]}
        />
        <p>
          Where data is transferred outside the UK, appropriate safeguards (such as standard contractual
          clauses or adequacy decisions) will be applied.
        </p>
      </LegalSection>

      <LegalSection title="7. Data retention">
        <p>
          We retain personal information only for as long as necessary for the purposes described in
          this policy, including legal, regulatory, and clinical record-keeping requirements. Retention
          periods may vary by record type and are configured by your organisation in line with its
          policies.
        </p>
        <p>
          When data is no longer required, it is securely deleted or anonymised in accordance with our
          retention and disposal procedures.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We implement appropriate technical and organisational measures to protect personal data,
          including access controls, encryption in transit, audit logging, and regular review of
          permissions. No system is completely secure; users must keep login credentials confidential
          and report suspected breaches promptly.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>Under UK data protection law, you may have the right to:</p>
        <LegalList
          items={[
            'Request access to personal data we hold about you.',
            'Request correction of inaccurate or incomplete data.',
            'Request erasure in certain circumstances.',
            'Restrict or object to processing in certain circumstances.',
            'Request data portability where applicable.',
            'Withdraw consent where processing is based on consent.',
            'Lodge a complaint with the Information Commissioner\'s Office (ICO) at ico.org.uk.',
          ]}
        />
        <p>
          To exercise these rights, contact your organisation&apos;s privacy or data protection contact.
          We may need to verify your identity before responding.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies and similar technologies">
        <p>
          The platform uses essential cookies and local storage to maintain secure sessions, remember
          preferences, and support core functionality. We do not use non-essential tracking cookies
          without appropriate notice and consent where required.
        </p>
      </LegalSection>

      <LegalSection title="11. Children and vulnerable adults">
        <p>
          The platform may process information about vulnerable adults and, in limited circumstances,
          children receiving care. Such data is handled with additional care, restricted access, and
          in accordance with safeguarding policies and applicable law.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated
          through the platform or by your organisation. The &quot;Last updated&quot; date at the top of
          this page indicates when this version was published.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          If you have questions about this Privacy Policy or how your personal data is processed, please
          contact your care provider or organisation administrator. They can direct enquiries to the
          appropriate privacy or data protection contact.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  )
}
