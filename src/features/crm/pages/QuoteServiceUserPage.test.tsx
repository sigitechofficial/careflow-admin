import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { navigate, mutate, preAdmit, state } = vi.hoisted(() => ({
  navigate: vi.fn(),
  mutate: vi.fn(),
  preAdmit: vi.fn(),
  state: {
    enquiry: {} as Record<string, unknown>,
    detail: {} as Record<string, unknown>,
    su: undefined as Record<string, unknown> | undefined,
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
  useCreateEnquiryPreAdmission: () => ({ mutate: preAdmit, isPending: false }),
}));
vi.mock("@/features/service-users/hooks/useServiceUser", () => ({
  useServiceUser: () => ({ data: state.su, isLoading: false }),
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
    state.su = undefined;
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
    // Details only the service user record holds are listed too.
    expect(screen.getByTestId("su-check-gp")).toHaveTextContent(
      "adding it makes a Pre-admission record",
    );
    expect(screen.getByTestId("su-check-contact")).not.toHaveTextContent(
      "Missing",
    );
    expect(screen.getByTestId("su-missing-summary")).toHaveTextContent(
      "11 things still missing",
    );

    // A gap on the enquiry opens the enquiry form on that field, and saving comes back here.
    await userEvent.click(
      within(screen.getByTestId("su-check-dob")).getByRole("button", {
        name: "Add on enquiry",
      }),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/crm/$enquiryId/edit",
      params: { enquiryId: "e1" },
      search: {
        focus: "Date of birth",
        returnTo: "/crm/e1/quotes/q1/v1/service-user",
      },
    });

    // A detail only the record holds makes a Pre-admission record, then opens its profile field.
    preAdmit.mockImplementation(
      (_: unknown, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({ serviceUserId: "su-new" }),
    );
    await userEvent.click(
      within(screen.getByTestId("su-check-gp")).getByRole("button", {
        name: "Add on profile",
      }),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/service-users/$serviceUserId/profile",
      params: { serviceUserId: "su-new" },
      search: { tab: "contacts", focus: "GP Details" },
    });

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

describe("QuoteServiceUserPage with a service user record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.enquiry = {
      ...enquiry,
      convertedServiceUserId: "su-1",
      stage: "WON",
    };
    state.detail = { ...detail };
    state.su = {
      id: "su-1",
      dateOfBirth: "1941-06-02",
      title: { id: "t", name: "Mrs", code: "MRS" },
      gender: null,
      nhsNumber: "485 777 3456",
      location: { id: "loc-1", name: "Leeds" },
      address: null,
      contacts: [
        {
          id: "c1",
          firstName: "Dr",
          lastName: "Shah",
          isEmergencyContact: false,
          relationshipType: { id: "r", name: "GP", code: "GP" },
        },
      ],
      fundingType: null,
      careType: null,
      keyWorker: null,
      serviceStartDate: null,
    };
  });

  it("checks the record itself and links each gap to the profile tab", async () => {
    render(<QuoteServiceUserPage />);
    expect(screen.getByTestId("su-check-title")).toHaveTextContent("Mrs");
    expect(screen.getByTestId("su-check-gp")).toHaveTextContent("Dr Shah");
    expect(screen.getByTestId("su-check-gender")).toHaveTextContent("Missing");
    // The enquiry's contact is not on the record, so family is still missing there.
    expect(screen.getByTestId("su-check-contact")).toHaveTextContent("Missing");
    await userEvent.click(
      within(screen.getByTestId("su-check-emergency")).getByRole("button", {
        name: "Add on profile",
      }),
    );
    // Opens the profile tab on the field where it is added.
    expect(navigate).toHaveBeenCalledWith({
      to: "/service-users/$serviceUserId/profile",
      params: { serviceUserId: "su-1" },
      search: { tab: "contacts", focus: "Personal Contacts" },
    });
  });
});
