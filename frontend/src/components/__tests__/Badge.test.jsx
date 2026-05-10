import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge.jsx";

describe("Badge", () => {
  it("renders the correct label for a known category", () => {
    render(<Badge type="persona" />);
    expect(screen.getByText("persona")).toBeInTheDocument();
  });

  it("renders for each known wiki category", () => {
    const cases = [
      ["persona",  "persona"],
      ["luogo",    "luogo"],
      ["scienza",  "scienza"],
      ["arte",     "arte"],
      ["evento",   "evento"],
    ];
    for (const [type, label] of cases) {
      const { unmount } = render(<Badge type={type} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders fallback for unknown type", () => {
    render(<Badge type="sconosciuto" />);
    expect(screen.getByText("sconosciuto")).toBeInTheDocument();
  });
});
