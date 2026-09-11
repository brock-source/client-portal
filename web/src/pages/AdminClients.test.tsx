import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminClients from "./AdminClients";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { admin: { listClients: vi.fn(), addClient: vi.fn() } },
}));

vi.mock("../components/PortalShell", () => ({
  PortalShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const CLIENTS = [
  { id: "1", name: "Order Test", email: "order.test@example.com", healthRating: null, currentPhase: 1, currentStepLabel: "2 of 11 documents", phase1Progress: { uploaded: 2, total: 11 }, phase1MissingCount: 0, unreadMessageCount: 0, phaseStatuses: [] },
  { id: "2", name: "Skip Ahead", email: "skip.ahead@example.com", healthRating: "Preferred Plus", currentPhase: 3, currentStepLabel: "Health Approval", phase1Progress: { uploaded: 0, total: 11 }, phase1MissingCount: 0, unreadMessageCount: 0, phaseStatuses: [] },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminClients />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminClients", () => {
  it("shows 'No clients yet.' when there are no clients at all", async () => {
    (api.admin.listClients as any).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No clients yet.")).toBeInTheDocument();
  });

  it("lists every client with their health rating badge when set", async () => {
    (api.admin.listClients as any).mockResolvedValue(CLIENTS);
    renderPage();

    expect(await screen.findByText("Order Test")).toBeInTheDocument();
    expect(screen.getByText("Skip Ahead")).toBeInTheDocument();
    expect(screen.getByText("Preferred Plus")).toBeInTheDocument();
  });

  it("search filters by name or email, case-insensitively", async () => {
    (api.admin.listClients as any).mockResolvedValue(CLIENTS);
    renderPage();
    await screen.findByText("Order Test");

    await userEvent.type(screen.getByPlaceholderText(/Search by name or email/i), "SKIP");

    expect(screen.queryByText("Order Test")).not.toBeInTheDocument();
    expect(screen.getByText("Skip Ahead")).toBeInTheDocument();
  });

  it("shows 'No clients match your search' for a search with zero results", async () => {
    (api.admin.listClients as any).mockResolvedValue(CLIENTS);
    renderPage();
    await screen.findByText("Order Test");

    await userEvent.type(screen.getByPlaceholderText(/Search by name or email/i), "nobody-matches-this");

    expect(await screen.findByText("No clients match your search.")).toBeInTheDocument();
  });

  it("phase filter narrows the list to the selected phase", async () => {
    (api.admin.listClients as any).mockResolvedValue(CLIENTS);
    renderPage();
    await screen.findByText("Order Test");

    await userEvent.selectOptions(screen.getByRole("combobox"), "3");

    await waitFor(() => expect(screen.queryByText("Order Test")).not.toBeInTheDocument());
    expect(screen.getByText("Skip Ahead")).toBeInTheDocument();
  });
});
