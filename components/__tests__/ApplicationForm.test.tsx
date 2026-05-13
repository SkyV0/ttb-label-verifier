import { render, screen, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
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

function Harness({
  disabled,
  formRef,
}: {
  disabled?: boolean;
  formRef?: (f: UseFormReturn<ApplicationData>) => void;
}) {
  const form = useForm<ApplicationData>({ defaultValues: EMPTY });
  formRef?.(form);
  return (
    <FormProvider {...form}>
      <ApplicationForm disabled={disabled} />
    </FormProvider>
  );
}

function renderHarness(props: { disabled?: boolean } = {}, opts?: RenderOptions) {
  let captured: UseFormReturn<ApplicationData> | undefined;
  const result = render(
    <ThemeProvider>
      <I18nProvider>
        <Harness {...props} formRef={(f) => (captured = f)} />
      </I18nProvider>
    </ThemeProvider>,
    opts,
  );
  return { ...result, getForm: () => captured! };
}

describe("<ApplicationForm />", () => {
  it("renders all eight application fields", () => {
    renderHarness();
    expect(screen.getByLabelText(/Brand name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Class \/ type designation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alcohol content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Net contents/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producer address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country of origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Beverage type/i)).toBeInTheDocument();
  });

  it("updates form state when the user types into a field", async () => {
    const user = userEvent.setup();
    const { getForm } = renderHarness();
    await user.type(screen.getByLabelText(/Brand name/i), "ABC");
    expect(getForm().getValues("brand_name")).toBe("ABC");
  });

  it("disables every input when disabled prop is true", () => {
    renderHarness({ disabled: true });
    expect(screen.getByLabelText(/Brand name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Beverage type/i)).toBeDisabled();
  });
});
