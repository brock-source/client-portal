import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HealthRatingField, DeleteClientButton } from "./AdminClientDetail";
import { api, HEALTH_RATING_OPTIONS } from "../api/client";

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: { admin: { setHealthRating: vi.fn(), deleteClient: vi.fn() } },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HealthRatingField", () => {
  it("renders the disabled placeholder plus all six approved options", () => {
    render(<HealthRatingField clientId="c1" current={null} onChange={vi.fn()} />);

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);

    expect(options).toEqual(["Select a rating…", ...HEALTH_RATING_OPTIONS]);
    expect(screen.getByText("Select a rating…").closest("option")).toBeDisabled();
  });

  it("saves the selected option and notifies the parent", async () => {
    (api.admin.setHealthRating as any).mockResolvedValue({ ok: true });
    const onChange = vi.fn();
    render(<HealthRatingField clientId="c1" current={null} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "Preferred Plus");

    expect(api.admin.setHealthRating).toHaveBeenCalledWith("c1", "Preferred Plus");
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it("does not re-save when the already-current value is reselected", async () => {
    render(<HealthRatingField clientId="c1" current="Standard" onChange={vi.fn()} />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "Standard");

    expect(api.admin.setHealthRating).not.toHaveBeenCalled();
  });

  it("shows an error message when saving fails", async () => {
    (api.admin.setHealthRating as any).mockRejectedValue(new Error("Could not save"));
    render(<HealthRatingField clientId="c1" current={null} onChange={vi.fn()} />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "Select");

    expect(await screen.findByText("Could not save")).toBeInTheDocument();
  });
});

function renderDeleteButton() {
  return render(
    <MemoryRouter>
      <DeleteClientButton clientId="c1" fullName="Order Test" />
    </MemoryRouter>
  );
}

describe("DeleteClientButton", () => {
  it("requires a second click before opening the confirmation modal", async () => {
    renderDeleteButton();
    const button = screen.getByRole("button", { name: "Delete Client" });

    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Click again to confirm" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText('Delete Order Test?')).toBeInTheDocument();
  });

  it("keeps the modal's delete button disabled until the full name is typed exactly", async () => {
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "Delete Client" });
    const input = within(dialog).getByRole("textbox");

    expect(confirmButton).toBeDisabled();

    await userEvent.type(input, "Order Tes");
    expect(confirmButton).toBeDisabled();

    await userEvent.type(input, "t");
    expect(confirmButton).toBeEnabled();
  });

  it("matches the full name case-insensitively", async () => {
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox"), "order test");

    expect(within(dialog).getByRole("button", { name: "Delete Client" })).toBeEnabled();
    expect(screen.queryByText(/Doesn't match/)).not.toBeInTheDocument();
  });

  it("shows a hint while the typed name doesn't match yet", async () => {
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox"), "Someone Else");

    expect(screen.getByText(/Doesn't match/)).toBeInTheDocument();
  });

  it("deletes and navigates away once the full name matches and delete is confirmed", async () => {
    (api.admin.deleteClient as any).mockResolvedValue({ ok: true });
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox"), "Order Test");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete Client" }));

    await waitFor(() => expect(api.admin.deleteClient).toHaveBeenCalledWith("c1", "Order Test"));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/clients"));
  });

  it("shows an error and leaves the modal open when deletion fails", async () => {
    (api.admin.deleteClient as any).mockRejectedValue(new Error("Could not delete client"));
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox"), "Order Test");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete Client" }));

    expect(await screen.findByText("Could not delete client")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("closes without deleting when Cancel is clicked", async () => {
    renderDeleteButton();
    await userEvent.click(screen.getByRole("button", { name: "Delete Client" }));
    await userEvent.click(screen.getByRole("button", { name: "Click again to confirm" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.admin.deleteClient).not.toHaveBeenCalled();
  });
});
