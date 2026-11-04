import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to: _to,
    params: _params,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params: unknown;
  }) => <a {...rest}>{children}</a>,
}));
vi.mock("@/features/auth/store", () => ({
  useAuthStore: (pick: (s: { can: () => boolean }) => unknown) =>
    pick({ can: () => true }),
}));
vi.mock("@/features/crm/components/CrmSectionLayout", () => ({
  CrmSectionLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/features/locations/hooks/useGlobalLocationScope", () => ({
  useGlobalLocationScope: () => ({ locationId: null }),
}));
vi.mock("@/features/crm/hooks/useCrm", () => ({
  useEnquiries: () => ({ data: [enquiry], isLoading: false }),
  useEnquiryOwners: () => ({ data: [] }),
  useMoveAnyEnquiry: () => ({ mutate, isPending: false }),
}));

import EnquiryBoardPage from "@/features/crm/pages/EnquiryBoardPage";

const enquiry = {
  id: "e1",
  kind: "ENQUIRY",
  referenceNumber: "ENQ-2026-0001",
  firstName: "Jo",
  lastName: "Bloggs",
  stage: "NEW",
  source: "SELF",
  urgency: "ROUTINE",
  ownerId: null,
  ownerName: null,
  locationName: null,
  nextFollowUpAt: null,
  stageChangedAt: "2026-11-01T00:00:00.000Z",
};

const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

function dragTo(stage: string) {
  fireEvent.dragStart(screen.getByTestId("crm-card-e1"), { dataTransfer });
  const column = screen.getByTestId(`crm-column-${stage}`);
  fireEvent.dragOver(column, { dataTransfer });
  fireEvent.drop(column, { dataTransfer });
}

describe("EnquiryBoardPage drag and drop", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a card dropped on another column", () => {
    render(<EnquiryBoardPage />);
    dragTo("CONTACTED");
    expect(mutate).toHaveBeenCalledWith(
      { id: "e1", stage: "CONTACTED" },
      expect.anything(),
    );
  });

  it("asks for a reason before moving a card to Lost", () => {
    render(<EnquiryBoardPage />);
    dragTo("LOST");
    expect(mutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Mark as lost — Jo Bloggs" }),
    ).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirm lost" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Why was it lost? (required)"), {
      target: { value: "PRICE" },
    });
    fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledWith(
      { id: "e1", stage: "LOST", lostReasonCode: "PRICE", lostReason: undefined },
      expect.anything(),
    );
  });
});
