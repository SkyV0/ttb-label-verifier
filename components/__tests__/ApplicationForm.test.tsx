import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ApplicationForm } from "@/components/ApplicationForm";
import type { ApplicationData } from "@/lib/types";

const EMPTY: ApplicationData = {
  brand_name: "",
  class_type: "",
  alcohol_content: "",
  net_contents: "",
  producer_name: "",
  producer_address: "",
  country_of_origin: "",
  beverage_type: "spirits",
};

function wrap(ui: React.ReactNode) {
  return (
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>
  );
}

describe("<ApplicationForm />", () => {
  it("renders all eight application fields", () => {
    render(wrap(<ApplicationForm value={EMPTY} onChange={() => {}} />));
    expect(screen.getByLabelText(/Brand name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Class \/ type designation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alcohol content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Net contents/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producer address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country of origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Beverage type/i)).toBeInTheDocument();
  });

  it("calls onChange when the user types into a field", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(wrap(<ApplicationForm value={EMPTY} onChange={onChange} />));
    await user.type(screen.getByLabelText(/Brand name/i), "X");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ brand_name: "X" }));
  });

  it("disables every input when disabled prop is true", () => {
    render(wrap(<ApplicationForm value={EMPTY} onChange={() => {}} disabled />));
    expect(screen.getByLabelText(/Brand name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Beverage type/i)).toBeDisabled();
  });
});
