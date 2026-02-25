import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionActions } from "./VersionActions";

describe("VersionActions", () => {
  it("renders both buttons", () => {
    render(
      <VersionActions
        versionLabel="1.0.0"
        onRevert={vi.fn()}
        onCompare={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Compare with Current" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revert to this version" })
    ).toBeInTheDocument();
  });

  it("shows confirmation dialog on revert click", async () => {
    const user = userEvent.setup();
    render(
      <VersionActions
        versionLabel="1.0.0"
        onRevert={vi.fn()}
        onCompare={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Revert to this version" })
    );

    expect(screen.getByText("Revert to v1.0.0?")).toBeInTheDocument();
    expect(screen.getByText(/Distributions, datastore tables/)).toBeInTheDocument();
  });

  it("calls onRevert when confirmed", async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn().mockResolvedValue(undefined);
    render(
      <VersionActions
        versionLabel="1.0.0"
        onRevert={onRevert}
        onCompare={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Revert to this version" })
    );
    await user.click(screen.getByRole("button", { name: "Revert" }));

    expect(onRevert).toHaveBeenCalled();
  });

  it("calls onCompare when compare clicked", async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn().mockResolvedValue(undefined);
    render(
      <VersionActions
        versionLabel="1.0.0"
        onRevert={vi.fn()}
        onCompare={onCompare}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Compare with Current" })
    );

    expect(onCompare).toHaveBeenCalled();
  });
});
