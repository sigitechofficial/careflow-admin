import * as React from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { LoadingSpinner } from "@/shared/ui/page-elements";
import { useAuthStore } from "@/features/auth/store";
import { toastApiError, toastSuccess, toastWarning } from "@/shared/lib/toast";
import { CrmSectionLayout } from "@/features/crm/components/CrmSectionLayout";
import { PendingFunding } from "@/features/crm/components/quote-editor/QuoteReviewPanels";
import { useEnquiry } from "@/features/crm/hooks/useCrm";
import {
  useCreateServiceUserFromQuote,
  useQuoteAction,
  useQuoteVersion,
} from "@/features/crm/hooks/useQuotations";
import { money } from "@/features/crm/quote-labels";

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
  action?: React.ReactNode;
};

function CheckList({ items }: { items: Check[] }) {
  return (
    <ul className="divide-y divide-border/70">
      {items.map((c) => (
        <li
          key={c.key}
          className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between"
          data-testid={`su-check-${c.key}`}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {c.done ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${c.required ? "text-red-600" : "text-amber-600"}`}
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {c.label}
                {!c.done && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.required ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}
                  >
                    {c.required ? "Needed" : "Missing"}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </div>
          </div>
          {c.action && <div className="shrink-0 sm:pl-4">{c.action}</div>}
        </li>
      ))}
    </ul>
  );
}

/**
 * After the client accepts a quote: what is still missing before care starts and on the service
 * user's record, and one button that makes the person an active service user (with the draft
 * care package from the quote).
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

  if (enquiryLoading || quoteLoading) return <LoadingSpinner />;
  if (!enquiry || !detail)
    return <p className="text-sm text-muted-foreground">Quote not found.</p>;

  const name = `${enquiry.firstName} ${enquiry.lastName}`;
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
  const preAdmission = Boolean(enquiry.convertedServiceUserId);
  const alreadyActive = preAdmission && enquiry.stage === "WON";
  const editEnquiry = (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigate({ to: "/crm/$enquiryId/edit", params: { enquiryId } })
      }
    >
      Add on the enquiry
    </Button>
  );

  const beforeCare: Check[] = [
    {
      key: "assessment",
      label: "Assessment",
      done: Boolean(prereq("assessment")?.done),
      detail: prereq("assessment")?.detail ?? "—",
      action: !prereq("assessment")?.done ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            enquiry.convertedServiceUserId
              ? navigate({
                  to: "/service-users/initial-assessment",
                  search: { serviceUserId: enquiry.convertedServiceUserId },
                })
              : navigate({ to: "/crm/$enquiryId", params: { enquiryId } })
          }
        >
          <ClipboardList className="mr-1.5 h-4 w-4" aria-hidden />
          {enquiry.convertedServiceUserId
            ? "Open initial assessment"
            : "Start on the enquiry"}
        </Button>
      ) : null,
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
      action: !detail.agreementReceivedAt ? (
        <div className="flex gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Where it is kept"
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
      ) : null,
    },
  ];

  const details: Check[] = [
    {
      key: "branch",
      label: "Branch",
      done: Boolean(enquiry.locationId),
      detail: enquiry.locationName ?? "Which branch will look after them",
      required: true,
      action: enquiry.locationId ? null : editEnquiry,
    },
    {
      key: "dob",
      label: "Date of birth",
      done: Boolean(enquiry.dateOfBirth),
      detail: fmtDate(enquiry.dateOfBirth) ?? "Not recorded",
      action: enquiry.dateOfBirth ? null : editEnquiry,
    },
    {
      key: "address",
      label: "Address and postcode",
      done: Boolean(enquiry.addressLine && enquiry.postcode),
      detail:
        [enquiry.addressLine, enquiry.postcode].filter(Boolean).join(", ") ||
        "Not recorded",
      action: enquiry.addressLine && enquiry.postcode ? null : editEnquiry,
    },
    {
      key: "funding-type",
      label: "Funding type",
      done: Boolean(enquiry.fundingTypeId),
      detail: enquiry.fundingTypeName ?? "Not recorded",
      action: enquiry.fundingTypeId ? null : editEnquiry,
    },
    {
      key: "contact",
      label: "Contact",
      done: Boolean(
        enquiry.contactName && (enquiry.contactPhone || enquiry.contactEmail),
      ),
      detail:
        [enquiry.contactName, enquiry.contactPhone, enquiry.contactEmail]
          .filter(Boolean)
          .join(" · ") || "Not recorded",
      action:
        enquiry.contactName && (enquiry.contactPhone || enquiry.contactEmail)
          ? null
          : editEnquiry,
    },
    {
      key: "start",
      label: "Service start",
      done: Boolean(detail.proposedStartDate),
      detail: fmtDate(detail.proposedStartDate)
        ? `${fmtDate(detail.proposedStartDate)} (the quote's proposed start)`
        : "Not set on the quote",
    },
  ];

  const missing = [...beforeCare, ...details].filter((c) => !c.done);
  const blocked =
    details.some((c) => c.required && !c.done) ||
    !accepted ||
    !can("service_users.create");

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
      <div className="flex flex-col gap-4">
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

        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Accepted quote</p>
              <p className="font-semibold">{detail.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekly total</p>
              <p className="font-semibold tabular-nums">
                {money(detail.totals.weekly)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Client pays</p>
              <p className="font-semibold tabular-nums">
                {money(detail.totals.clientWeeklyLiability)} / week
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proposed start</p>
              <p className="font-semibold">
                {fmtDate(detail.proposedStartDate) ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Before care starts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <CheckList items={beforeCare} />
              {pendingFundings.length > 0 && can("crm.manage") && (
                <ul className="flex flex-col gap-2">
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Service user details</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckList items={details} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/30">
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm" data-testid="su-missing-summary">
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
                      : details.some((c) => c.required && !c.done)
                        ? " — set the branch before creating the service user."
                        : " — you can still create the service user and complete them later."}
                  </span>
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {alreadyActive
                ? `${name} was made a service user from this enquiry, and the enquiry is Won.`
                : preAdmission
                  ? `${name} already has a Pre-admission record (made for the initial assessment). It will be made Active and the enquiry marked Won.`
                  : `A new service user is created for ${name} as Active, and the enquiry is marked Won.`}
            </p>
            {!detail.convertedVisitPlanId ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={withPackage}
                  onChange={(e) => setWithPackage(e.target.checked)}
                />
                Also create the draft care package from this quote (not active,
                no carers assigned)
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">
                The draft care package from this quote already exists.
              </p>
            )}
            {alreadyActive ? (
              <Button
                className="self-start"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/service-users/$serviceUserId/view",
                    params: { serviceUserId: enquiry.convertedServiceUserId! },
                  })
                }
              >
                {name} is already a service user — view
              </Button>
            ) : (
              <Button
                className="self-start"
                disabled={blocked || create.isPending}
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
          </CardContent>
        </Card>
      </div>
    </CrmSectionLayout>
  );
}
