import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  HeartHandshake,
  Home,
  Loader2,
  PoundSterling,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { LoadingSpinner } from "@/shared/ui/page-elements";
import { useAuthStore } from "@/features/auth/store";
import { toastApiError, toastSuccess, toastWarning } from "@/shared/lib/toast";
import { CrmSectionLayout } from "@/features/crm/components/CrmSectionLayout";
import { PendingFunding } from "@/features/crm/components/quote-editor/QuoteReviewPanels";
import { percentShares } from "@/features/crm/components/quote-editor/QuotePricingSections";
import {
  useCreateEnquiryPreAdmission,
  useEnquiry,
} from "@/features/crm/hooks/useCrm";
import {
  useCreateServiceUserFromQuote,
  useQuoteAction,
  useQuoteVersion,
} from "@/features/crm/hooks/useQuotations";
import { PAYER_TYPE_LABELS, money } from "@/features/crm/quote-labels";
import { useServiceUser } from "@/features/service-users/hooks/useServiceUser";

type ServiceUserDetailContact = NonNullable<
  ReturnType<typeof useServiceUser>["data"]
>["contacts"][number];

/** GP and professionals are contacts by relationship; the rest are family and friends (as on the Contacts tab). */
function splitContacts(contacts: ServiceUserDetailContact[]) {
  const code = (c: ServiceUserDetailContact) => c.relationshipType?.code ?? "";
  return {
    gp: contacts.filter((c) => code(c) === "GP"),
    personal: contacts.filter(
      (c) => !["GP", "SOCIAL_WORKER", "OTHER"].includes(code(c)),
    ),
  };
}

const contactName = (c: ServiceUserDetailContact) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

type Check = {
  key: string;
  label: string;
  done: boolean;
  detail: string;
  required?: boolean;
  /** Opens the page and field where the missing detail is filled in. */
  go?: { label: string; onClick: () => void };
  /** An inline action instead (e.g. recording the agreement here). */
  extra?: React.ReactNode;
};

function StatusIcon({ check }: { check: Check }) {
  if (check.done)
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </span>
    );
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        check.required
          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

function CheckRow({ check }: { check: Check }) {
  return (
    <li
      className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center"
      data-testid={`su-check-${check.key}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <StatusIcon check={check} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {check.label}
            {!check.done && (
              <span
                className={`rounded-full px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${
                  check.required
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {check.required ? "Needed" : "Missing"}
              </span>
            )}
          </p>
          <p
            className={`truncate text-xs ${check.done ? "text-foreground/80" : "text-muted-foreground"}`}
          >
            {check.detail}
          </p>
        </div>
      </div>
      {check.extra ??
        (!check.done && check.go && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-center"
            onClick={check.go.onClick}
          >
            {check.go.label}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Button>
        ))}
    </li>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  missingOnly,
  children,
}: {
  title: string;
  icon: LucideIcon;
  items: Check[];
  missingOnly: boolean;
  children?: React.ReactNode;
}) {
  const done = items.filter((c) => c.done).length;
  const shown = missingOnly ? items.filter((c) => !c.done) : items;
  if (!shown.length && !children) return null;
  return (
    <Card className="overflow-hidden" data-testid={`su-group-${title}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
            done === items.length
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-background text-muted-foreground ring-1 ring-border"
          }`}
        >
          {done}/{items.length}
        </span>
      </div>
      {shown.length > 0 && (
        <ul className="divide-y divide-border/70">
          {shown.map((c) => (
            <CheckRow key={c.key} check={c} />
          ))}
        </ul>
      )}
      {children}
    </Card>
  );
}

const PAYER_COLOURS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-pink-500",
];

/** Each funder's weekly share of the accepted quote, and what is left for the client. */
function WhoPays({
  detail,
}: {
  detail: NonNullable<ReturnType<typeof useQuoteVersion>["data"]>;
}) {
  const weekly = detail.totals.weekly;
  if (weekly <= 0) return null;
  const rows = [
    ...detail.fundings.map((f, i) => ({
      key: f.id,
      name: f.payerName?.trim() || PAYER_TYPE_LABELS[f.payerType],
      type: PAYER_TYPE_LABELS[f.payerType],
      amount: f.weeklyAmount,
      pending:
        f.payerType !== "PRIVATE_CLIENT" &&
        (f.status ?? "PENDING_APPROVAL") === "PENDING_APPROVAL",
      colour: PAYER_COLOURS[i % PAYER_COLOURS.length],
    })),
    {
      key: "client",
      name: "Client pays",
      type: "Whatever the funders don’t cover",
      amount: detail.totals.clientWeeklyLiability,
      pending: false,
      colour: "bg-emerald-500",
    },
  ];
  const shares = percentShares(rows.map((r) => r.amount));
  return (
    <Card className="overflow-hidden" data-testid="su-who-pays">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <PoundSterling
            className="h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <div>
            <h3 className="text-sm font-semibold">Who pays each week</h3>
            <p className="text-xs text-muted-foreground">
              {detail.fundings.length
                ? `${detail.fundings.length} funder${detail.fundings.length === 1 ? "" : "s"} on this quote`
                : "No funders — the client pays it all"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Weekly total
          </p>
          <p className="text-lg font-semibold tabular-nums">{money(weekly)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        <div
          className="flex h-6 gap-0.5 overflow-hidden rounded-md bg-muted"
          aria-hidden
        >
          {rows.map((r, i) =>
            r.amount > 0 ? (
              <div
                key={r.key}
                className={`flex items-center justify-center text-[11px] font-semibold text-white ${r.colour}`}
                style={{
                  width: `${Math.min(100, (r.amount / weekly) * 100)}%`,
                }}
              >
                {(shares[i] ?? 0) >= 8 ? `${shares[i]}%` : ""}
              </div>
            ) : null,
          )}
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 ${
                r.key === "client"
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                  : ""
              }`}
              data-testid={`su-payer-${r.key}`}
            >
              <span className={`h-3 w-3 rounded-sm ${r.colour}`} aria-hidden />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="break-words text-sm font-medium">
                    {r.name}
                  </span>
                  {r.pending && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending approval
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.type}
                </span>
              </span>
              <span className="text-right text-sm tabular-nums">
                <span className="font-semibold">{money(r.amount)}</span>
                <span className="text-muted-foreground"> / week</span>
              </span>
              <span className="min-w-[3.5rem] rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold tabular-nums">
                {shares[i] ?? 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * After the client accepts a quote: what is still missing before care starts and on the service
 * user's record (each gap opens the field where it is filled in), and one button that makes the
 * person an active service user (with the draft care package from the quote).
 */
export default function QuoteServiceUserPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as {
    enquiryId: string;
    quotationId: string;
    versionId: string;
  };
  const { enquiryId, quotationId, versionId } = params;
  const can = useAuthStore((s) => s.can);
  const { data: enquiry, isLoading: enquiryLoading } = useEnquiry(enquiryId);
  const { data: detail, isLoading: quoteLoading } = useQuoteVersion(
    enquiryId,
    quotationId,
    versionId,
  );
  const create = useCreateServiceUserFromQuote(
    enquiryId,
    quotationId,
    versionId,
  );
  const agreement = useQuoteAction(enquiryId, quotationId, versionId);
  const [agreementNote, setAgreementNote] = React.useState("");
  const [withPackage, setWithPackage] = React.useState(true);
  const [missingOnly, setMissingOnly] = React.useState(false);
  const suId = enquiry?.convertedServiceUserId ?? null;
  const preAdmit = useCreateEnquiryPreAdmission(enquiryId);
  const { data: su, isLoading: suLoading } = useServiceUser(
    suId ?? "",
    Boolean(suId) && can("service_users.read"),
  );

  if (enquiryLoading || quoteLoading || (suId && suLoading))
    return <LoadingSpinner />;
  if (!enquiry || !detail)
    return <p className="text-sm text-muted-foreground">Quote not found.</p>;

  const name = `${enquiry.firstName} ${enquiry.lastName}`;
  const initials =
    `${enquiry.firstName?.[0] ?? ""}${enquiry.lastName?.[0] ?? ""}`.toUpperCase();
  const quoteUrl = {
    to: "/crm/$enquiryId/quotes/$quotationId/$versionId" as const,
    params: { enquiryId, quotationId, versionId },
  };
  const accepted = detail.status === "ACCEPTED";
  const prereq = (key: string) =>
    detail.prerequisites?.find((p) => p.key === key);
  const pendingFundings = detail.fundings.filter(
    (f) => f.payerType !== "PRIVATE_CLIENT" && f.status !== "CONFIRMED",
  );
  const preAdmission = Boolean(suId);
  const alreadyActive = preAdmission && enquiry.stage === "WON";

  // Each gap opens the form on its field: the enquiry before there is a service user record,
  // then the record's own profile tab. Saving the enquiry comes back here.
  const thisPage = `/crm/${enquiryId}/quotes/${quotationId}/${versionId}/service-user`;
  const onEnquiry = (field: string): Check["go"] => ({
    label: "Add on enquiry",
    onClick: () =>
      navigate({
        to: "/crm/$enquiryId/edit",
        params: { enquiryId },
        search: { focus: field, returnTo: thisPage },
      }),
  });
  const openProfile = (serviceUserId: string, tab: string, field: string) =>
    navigate({
      to: "/service-users/$serviceUserId/profile",
      params: { serviceUserId },
      search: { tab, focus: field },
    });
  // Before there is a record, a Pre-admission one is made from the enquiry (no assessment) and
  // opened on the field; creating the service user later makes that same record active.
  const canPreAdmit = can("crm.manage") && can("service_users.create");
  const onProfile = (tab: string, field: string): Check["go"] =>
    suId
      ? {
          label: "Add on profile",
          onClick: () => void openProfile(suId, tab, field),
        }
      : canPreAdmit
        ? {
            label: "Add on profile",
            onClick: () => {
              if (preAdmit.isPending) return;
              preAdmit.mutate(undefined, {
                onSuccess: (r) => void openProfile(r.serviceUserId, tab, field),
                onError: (e) =>
                  toastApiError(e, "Could not make the Pre-admission record"),
              });
            },
          }
        : undefined;
  /** A detail the enquiry also holds: filled on the enquiry until the record exists. */
  const shared = (
    key: string,
    label: string,
    value: string | null | undefined,
    enquiryField: string,
    profile: [tab: string, field: string],
    extra?: Partial<Check>,
  ): Check => ({
    key,
    label,
    done: Boolean(value),
    detail: value || "Not recorded",
    go: suId ? onProfile(...profile) : onEnquiry(enquiryField),
    ...extra,
  });
  /** A detail only the service user record holds. */
  const recordOnly = (
    key: string,
    label: string,
    value: string | null | undefined,
    profile: [tab: string, field: string],
  ): Check => ({
    key,
    label,
    done: Boolean(value),
    detail:
      value ||
      (suId
        ? "Not recorded"
        : "Not recorded · adding it makes a Pre-admission record"),
    go: onProfile(...profile),
  });

  const beforeCare: Check[] = [
    {
      key: "assessment",
      label: "Assessment",
      done: Boolean(prereq("assessment")?.done),
      detail: prereq("assessment")?.detail ?? "—",
      go: suId
        ? {
            label: "Open assessment",
            onClick: () =>
              navigate({
                to: "/service-users/initial-assessment",
                search: { serviceUserId: suId },
              }),
          }
        : {
            label: "Start on enquiry",
            onClick: () =>
              navigate({ to: "/crm/$enquiryId", params: { enquiryId } }),
          },
    },
    {
      key: "funding",
      label: "Funding",
      done: Boolean(prereq("funding")?.done),
      detail: prereq("funding")?.detail ?? "—",
    },
    {
      key: "agreement",
      label: "Signed agreement",
      done: Boolean(prereq("agreement")?.done),
      detail: prereq("agreement")?.detail ?? "—",
      extra: !detail.agreementReceivedAt ? (
        <div className="flex shrink-0 gap-2">
          <Input
            className="h-9 w-48"
            placeholder="Where it is kept"
            aria-label="Where the signed agreement is kept"
            value={agreementNote}
            onChange={(e) => setAgreementNote(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={agreement.isPending}
            onClick={() =>
              agreement.mutate(
                {
                  action: "agreement",
                  note: agreementNote.trim() || undefined,
                },
                {
                  onSuccess: () => toastSuccess("Agreement recorded"),
                  onError: (e) =>
                    toastApiError(e, "Could not record the agreement"),
                },
              )
            }
          >
            Record
          </Button>
        </div>
      ) : undefined,
    },
  ];

  const { gp, personal } = splitContacts(su?.contacts ?? []);
  const emergency = (su?.contacts ?? []).filter((c) => c.isEmergencyContact);
  const enquiryContact = [
    enquiry.contactName,
    enquiry.contactPhone,
    enquiry.contactEmail,
  ]
    .filter(Boolean)
    .join(" · ");
  const address = su?.address
    ? [
        su.address.addressLine1,
        su.address.secondaryPostcode || su.address.postcode,
      ]
    : [enquiry.addressLine, enquiry.postcode];
  const homeAccess = su?.address
    ? [
        su.address.accessMethod,
        su.address.keySafeLocation,
        su.address.accessInstructions,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  const branch =
    su?.location?.displayLabel ?? su?.location?.name ?? enquiry.locationName;
  const serviceStart = su?.serviceStartDate ?? detail.proposedStartDate;

  const groups: { title: string; icon: LucideIcon; items: Check[] }[] = [
    {
      title: "Personal",
      icon: UserRound,
      items: [
        shared(
          "branch",
          "Branch",
          branch,
          "Receiving branch",
          ["dom", "Branch"],
          {
            required: true,
            detail: branch ?? "Which branch will look after them",
          },
        ),
        recordOnly("title", "Title", su?.title?.name, ["personal", "Title"]),
        recordOnly("gender", "Gender", su?.gender?.name, [
          "personal",
          "Gender",
        ]),
        shared(
          "dob",
          "Date of birth",
          fmtDate(su?.dateOfBirth ?? enquiry.dateOfBirth),
          "Date of birth",
          ["personal", "Date of Birth"],
        ),
        recordOnly("nhs", "NHS number", su?.nhsNumber, [
          "personal",
          "NHS Number",
        ]),
      ],
    },
    {
      title: "Home and contact",
      icon: Home,
      items: [
        shared(
          "address",
          "Address and postcode",
          address[0] && address[1] ? address.join(", ") : null,
          "Address",
          ["dom", "Address"],
          { detail: address.filter(Boolean).join(", ") || "Not recorded" },
        ),
        recordOnly("access", "How to get into the home", homeAccess, [
          "dom",
          "How to enter the home",
        ]),
        recordOnly(
          "phone",
          "Their phone or email",
          [su?.phone || su?.mobile, su?.email].filter(Boolean).join(" · "),
          ["personal", "Phone Number"],
        ),
      ],
    },
    {
      title: "People",
      icon: Users,
      items: [
        su
          ? recordOnly(
              "contact",
              "Family or next of kin",
              personal.map(contactName).join(", "),
              ["contacts", "Personal Contacts"],
            )
          : shared("contact", "Family or next of kin", enquiryContact, "Name", [
              "contacts",
              "Personal Contacts",
            ]),
        recordOnly(
          "emergency",
          "Emergency contact",
          emergency.map(contactName).join(", "),
          ["contacts", "Personal Contacts"],
        ),
        recordOnly("gp", "GP", gp.map(contactName).join(", "), [
          "contacts",
          "GP Details",
        ]),
      ],
    },
    {
      title: "Care",
      icon: HeartHandshake,
      items: [
        shared(
          "funding-type",
          "Funding type",
          su?.fundingType?.name ?? enquiry.fundingTypeName,
          "Funding type",
          ["personal", "Funding Route"],
        ),
        recordOnly("care-type", "Category of care", su?.careType?.name, [
          "personal",
          "Category of Care",
        ]),
        recordOnly(
          "key-worker",
          "Key worker",
          su?.keyWorker
            ? `${su.keyWorker.firstName ?? ""} ${su.keyWorker.lastName ?? ""}`.trim()
            : null,
          ["personal", "Key Worker (search employees)"],
        ),
        {
          key: "start",
          label: "Service start",
          done: Boolean(serviceStart),
          detail: su?.serviceStartDate
            ? (fmtDate(su.serviceStartDate) ?? "")
            : fmtDate(detail.proposedStartDate)
              ? `${fmtDate(detail.proposedStartDate)} (the quote's proposed start)`
              : "Not set on the quote",
          go: onProfile("personal", "Service Start Date/Time"),
        },
      ],
    },
  ];
  const details = groups.flatMap((g) => g.items);
  const all = [...beforeCare, ...details];
  const missing = all.filter((c) => !c.done);
  const donePct = Math.round(
    ((all.length - missing.length) / all.length) * 100,
  );

  const needsBranch = details.some((c) => c.required && !c.done);
  const canCreate = can("service_users.create");
  const blockers = [
    !accepted && "The quote is not accepted yet",
    needsBranch && "Set the branch",
    !canCreate && "You do not have permission to create service users",
  ].filter(Boolean) as string[];

  const submit = () =>
    create.mutate(
      { createCarePackage: withPackage && !detail.convertedVisitPlanId },
      {
        onSuccess: (r) => {
          toastSuccess(
            r.created ? "Service user created" : "Service user made active",
            `${name} is now an active service user.`,
          );
          if (r.carePackage.error)
            toastWarning(
              "The draft care package was not made",
              r.carePackage.error,
            );
          navigate({
            to: "/service-users/$serviceUserId/view",
            params: { serviceUserId: r.serviceUserId },
          });
        },
        onError: (e) => toastApiError(e, "Could not create the service user"),
      },
    );

  return (
    <CrmSectionLayout
      title={`Create service user — ${name}`}
      description={`${detail.label} was accepted. Check what is missing, then create the service user.`}
      testId="crm-quote-service-user-page"
      breadcrumbTail={[
        { label: "Enquiries & Referrals", href: "/crm" },
        { label: enquiry.referenceNumber, href: `/crm/${enquiryId}` },
        { label: "Create service user" },
      ]}
    >
      <div className="flex flex-col gap-5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 self-start"
          onClick={() =>
            navigate({ ...quoteUrl, search: { section: "responses" } })
          }
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back to the quote
        </Button>

        {!accepted && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This version is not accepted. Record the client&apos;s acceptance on
            the quote first.
          </p>
        )}

        {/* Who, which quote, and how complete the record is. */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                {initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{name}</p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>{enquiry.referenceNumber}</span>
                  <span aria-hidden>·</span>
                  <span>{detail.label}</span>
                  <span
                    className={`rounded-full px-2 py-px text-xs font-semibold ${
                      accepted
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {accepted ? "Accepted" : "Not accepted"}
                  </span>
                  {preAdmission && (
                    <span className="rounded-full bg-sky-100 px-2 py-px text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      {alreadyActive ? "Service user" : "Pre-admission record"}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Ready</span>
                <span className="tabular-nums text-muted-foreground">
                  {all.length - missing.length} of {all.length}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={donePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Details in place"
              >
                <div
                  className={`h-full rounded-full transition-all ${donePct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${donePct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
            <Stat label="Weekly total" value={money(detail.totals.weekly)} />
            <Stat
              label="Client pays"
              value={`${money(detail.totals.clientWeeklyLiability)} / week`}
            />
            <Stat
              label="Proposed start"
              value={fmtDate(detail.proposedStartDate) ?? "—"}
            />
            <Stat label="Branch" value={branch ?? "Not set"} />
          </div>
        </Card>

        <WhoPays detail={detail} />

        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {su
                  ? `Checked against ${name}'s service user record.`
                  : "Checked against the enquiry. The rest is added on the service user's profile."}
              </p>
              <div
                role="tablist"
                aria-label="Show"
                className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
              >
                {(
                  [
                    [false, `All (${all.length})`],
                    [true, `Missing (${missing.length})`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={missingOnly === value}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      missingOnly === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setMissingOnly(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Section
              title="Before care starts"
              icon={ClipboardCheck}
              items={beforeCare}
              missingOnly={missingOnly}
            >
              {pendingFundings.length > 0 && can("crm.manage") && (
                <ul className="flex flex-col gap-2 border-t border-border px-5 py-3">
                  {pendingFundings.map((f) => (
                    <PendingFunding
                      key={f.id}
                      enquiryId={enquiryId}
                      detail={detail}
                      funding={f}
                    />
                  ))}
                </ul>
              )}
            </Section>
            {groups.map((g) => (
              <Section
                key={g.title}
                title={g.title}
                icon={g.icon}
                items={g.items}
                missingOnly={missingOnly}
              />
            ))}
            {missingOnly && missing.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nothing is missing.
              </p>
            )}
          </div>

          {/* The one action, kept in view while the list is worked through. */}
          <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-20">
            <div>
              <h3 className="text-base font-semibold">
                {alreadyActive
                  ? "Service user is active"
                  : preAdmission
                    ? "Make service user active"
                    : "Create service user"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {alreadyActive
                  ? `${name} was made a service user from this enquiry, and the enquiry is Won.`
                  : preAdmission
                    ? `${name} already has a Pre-admission record (made for the initial assessment). It will be made Active and the enquiry marked Won.`
                    : `A new service user is created for ${name} as Active, and the enquiry is marked Won.`}
              </p>
            </div>

            <p
              className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm"
              data-testid="su-missing-summary"
            >
              {missing.length === 0 ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  Everything is in place.
                </span>
              ) : (
                <>
                  <span className="font-medium">
                    {missing.length} thing{missing.length === 1 ? "" : "s"}{" "}
                    still missing
                  </span>
                  <span className="text-muted-foreground">
                    {alreadyActive
                      ? " — complete them on the enquiry or the service user's profile."
                      : needsBranch
                        ? " — set the branch before creating the service user."
                        : " — you can still create the service user and complete them later."}
                  </span>
                </>
              )}
            </p>

            {!alreadyActive && blockers.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-sm text-red-700 dark:text-red-300">
                {blockers.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {!detail.convertedVisitPlanId ? (
              !alreadyActive && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={withPackage}
                    onChange={(e) => setWithPackage(e.target.checked)}
                  />
                  Also create the draft care package from this quote (not
                  active, no carers assigned)
                </label>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                The draft care package from this quote already exists.
              </p>
            )}

            {alreadyActive ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  navigate({
                    to: "/service-users/$serviceUserId/view",
                    params: { serviceUserId: suId! },
                  })
                }
              >
                View {name}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={blockers.length > 0 || create.isPending}
                onClick={submit}
                data-testid="su-create-button"
              >
                {create.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                )}
                {preAdmission
                  ? "Make service user active"
                  : "Create service user"}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </CrmSectionLayout>
  );
}
