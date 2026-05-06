import { render } from "@testing-library/react";
import { CoinAmount, CandoCoinDefs } from "../CoinIcon.jsx";

const Wrapper = ({ children }) => (
  <>
    <CandoCoinDefs />
    {children}
  </>
);

describe("CoinAmount", () => {
  it("renders the numeric value", () => {
    const { container } = render(<CoinAmount amount={1000} />, { wrapper: Wrapper });
    // strip locale separators to compare the raw number
    const text = container.textContent.replace(/[\s.,]/g, "");
    expect(text).toContain("1000");
  });

  it("renders zero", () => {
    const { container } = render(<CoinAmount amount={0} />, { wrapper: Wrapper });
    expect(container.textContent).toContain("0");
  });

  it("renders large numbers", () => {
    const { container } = render(<CoinAmount amount={9999} />, { wrapper: Wrapper });
    const text = container.textContent.replace(/[\s.,]/g, "");
    expect(text).toContain("9999");
  });
});
