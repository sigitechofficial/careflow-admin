import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { navigate, mutate, state } = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutate: vi.fn(),
  state: {
    enquiry: {} as Record<string, unknown>,
    detail: {} as Record<string, unknown>,
  },
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ enquiryId: "e1", quotationId: "q1", versionId: "v1" }),
}));
vi.mock("@/features/auth/store", () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) =>
    pick({ can: () => true }),
}));
vi.mock("@/features/crm/components/CrmSectionLayout", () => ({
  CrmSectionLayout: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));
vi.mock("@/features/crm/components/quote-editor/QuoteReviewPanels", () => ({
  PendingFunding: () => null,
}));
vi.mock("@/features/crm/hooks/useCrm", () => ({
  useEnquiry: () => ({ data: state.enquiry, isLoading: false }),
}));
vi.mock("@/features/crm/hooks/useQuotations", () => ({
  useQuoteVersion: () => ({ data: state.detail, isLoading: false }),
  useQuoteAction: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateServiceUserFromQuote: () => ({ mutate, isPending: false }),
}));

import QuoteServiceUserPage from "@/features/crm/pages/QuoteServiceUserPage";

const enquiry = {
  id: "e1",
  referenceNumber: "ENQ-2026-0001",
  firstName: "Jo",
  lastName: "Bloggs",
  stage: "QUOTED",
  locationId: "loc-1",
  locationName: "Leeds",
  dateOfBirth: null,
  addressLine: "1 High St",
  postcode: "LS1 1AA",
  fundingTypeId: "f1",
  fundingTypeName: "Private",
  contactName: "Ann Bloggs",
  contactPhone: "0700",
  contactEmail: null,
  convertedServiceUserId: null,
};
const detail = {
  id: "v1",
  quotationId: "q1",
  status: "ACCEPTED",
  label: "EQ-2026-0001 V1",
  totals: { weekly: 350, clientWeeklyLiability: 350 },
  proposedStartDate: "2026-11-09",
  agreementReceivedAt: null,
  convertedVisitPlanId: null,
  fundings: [],
  prerequisites: [
    { key: "assessment", label: "Assessment", done: true, detail: "Completed" },
    { key: "funding", label: "Funding", done: true, detail: "Private client" },
    {
      key: "agreement",
      label: "Signed agreement",
      done: false,
      detail: "Not received",
    },
  ],
};

describe("QuoteServiceUserPage (accepted quote → active service user)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enquiry = { ...enquiry };
    state.detail = { ...detail };
  });

  it("lists what is missing and creates the active service user with the care package", async () => {
    mutate.mockImplementation(
      (_: unknown, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({
          serviceUserId: "su-1",
          created: true,
          carePackage: { created: true, error: null },
        }),
    );
    render(<QuoteServiceUserPage />);
    expect(
      screen.getByRole("heading", { name: "Create service user — Jo Bloggs" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("su-check-dob")).toHaveTextContent("Missing");
    expect(screen.getByTestId("su-check-agreement")).toHaveTextContent(
      "Missing",
    );
    expect(screen.getByTestId("su-check-branch")).not.toHaveTextContent(
      "Needed",
    );
    expect(screen.getByTestId("su-missing-summary")).toHaveTextContent(
      "2 things still missing",
    );

    await userEvent.click(screen.getByTestId("su-create-button"));
    expect(mutate).toHaveBeenCalledWith(
      { createCarePackage: true },
      expect.anything(),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/service-users/$serviceUserId/view",
      params: { serviceUserId: "su-1" },
    });
  });

  it("needs a branch first, and makes a Pre-admission record active", () => {
    state.enquiry = {
      ...enquiry,
      locationId: null,
      locationName: null,
      convertedServiceUserId: "su-pre",
    };
    render(<QuoteServiceUserPage />);
    expect(screen.getByTestId("su-check-branch")).toHaveTextContent("Needed");
    expect(screen.getByTestId("su-create-button")).toHaveTextContent(
      "Make service user active",
    );
    expect(screen.getByTestId("su-create-button")).toBeDisabled();
  });
});
