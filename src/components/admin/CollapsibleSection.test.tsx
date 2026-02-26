import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("renders title and children when open by default", () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Section content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("Test Section")).toBeDefined();
    expect(screen.getByText("Section content")).toBeDefined();
  });

  it("hides children when defaultOpen is false", () => {
    render(
      <CollapsibleSection title="Closed Section" defaultOpen={false}>
        <p>Hidden content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("Closed Section")).toBeDefined();
    expect(screen.queryByText("Hidden content")).toBeNull();
  });

  it("toggles open/closed on click", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Toggle Section" defaultOpen={false}>
        <p>Toggle content</p>
      </CollapsibleSection>
    );

    expect(screen.queryByText("Toggle content")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Toggle Section/i }));
    expect(screen.getByText("Toggle content")).toBeDefined();

    await user.click(screen.getByRole("button", { name: /Toggle Section/i }));
    expect(screen.queryByText("Toggle content")).toBeNull();
  });

  it("shows badge when provided", () => {
    render(
      <CollapsibleSection title="With Badge" badge={5}>
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText("5")).toBeDefined();
  });

  it("applies bordered class when bordered is true", () => {
    render(
      <CollapsibleSection title="Bordered" bordered>
        <p>Bordered content</p>
      </CollapsibleSection>
    );
    const content = screen.getByText("Bordered content").parentElement;
    expect(content?.className).toContain("border");
  });

  it("renders h3 heading when headingLevel is h3", () => {
    render(
      <CollapsibleSection title="H3 Section" headingLevel="h3">
        <p>Content</p>
      </CollapsibleSection>
    );
    const heading = screen.getByText("H3 Section");
    expect(heading.tagName).toBe("H3");
  });

  it("renders h2 heading by default", () => {
    render(
      <CollapsibleSection title="H2 Section">
        <p>Content</p>
      </CollapsibleSection>
    );
    const heading = screen.getByText("H2 Section");
    expect(heading.tagName).toBe("H2");
  });
});
