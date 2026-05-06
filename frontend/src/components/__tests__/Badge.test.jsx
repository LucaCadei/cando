import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge.jsx";

describe("Badge", () => {
  it("renders the correct italian label", () => {
    render(<Badge type="number" />);
    expect(screen.getByText("numero")).toBeInTheDocument();
  });

  it("renders for each known type", () => {
    const cases = [
      ["number", "numero"],
      ["date", "data"],
      ["idea", "idea"],
      ["filosofia", "filosofia"],
    ];
    for (const [type, label] of cases) {
      const { unmount } = render(<Badge type={type} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
