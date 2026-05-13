import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ResultView } from "@/components/ResultView";
import { CANONICAL_WARNING } from "@/lib/warning";
import type { VerificationResult } from "@/lib/types";

function wrap(ui: React.ReactNode) {
  return (
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>
  );
}

const baseResult: VerificationResult = {
  verdict: "verified",
  fields: [
    { key: "brand_name", status: "match", application: "OLD TOM DISTILLERY", label: "OLD TOM DISTILLERY" },
    { key: "class_type", status: "match", application: "Bourbon", label: "Bourbon" },
    { key: "alcohol_content", status: "match", application: "45%", label: "45%" },
    { key: "net_contents", status: "match", application: "750 mL", label: "750 mL" },
    { key: "producer_name", status: "match", application: "Old Tom", label: "Old Tom" },
    { key: "producer_address", status: "match", application: "123 Bourbon Rd", label: "123 Bourbon Rd" },
  ],
  warning: { ok: true, reasons: [], detected: CANONICAL_WARNING },
  extracted: {
    brand_name: "OLD TOM DISTILLERY",
    class_type: "Bourbon",
    alcohol_content_text: "45%",
    net_contents_text: "750 mL",
    producer_name: "Old Tom",
    producer_address: "123 Bourbon Rd",
    country_of_origin: null,
    government_warning_text: CANONICAL_WARNING,
    government_warning_header_appears_uppercase: true,
    government_warning_header_appears_bold: true,
    notes: null,
  },
  citations: [],
  elapsed_ms: 2400,
  usage: {
    input_tokens: 1200,
    output_tokens: 280,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 900,
    cost_usd: 0.0048,
  },
};

describe("<ResultView />", () => {
  it("renders the VERIFIED verdict", () => {
    render(wrap(<ResultView result={baseResult} onReset={() => {}} />));
    expect(screen.getByRole("status")).toHaveTextContent("VERIFIED");
  });

  it("renders REJECTED for a failed warning", () => {
    const rejected: VerificationResult = {
      ...baseResult,
      verdict: "rejected",
      warning: { ok: false, reasons: ["caps fail"], detected: "bad" },
      citations: [{ section: "27 CFR §16.22", title: "Legibility", text: "Header must be ALL CAPS." }],
    };
    render(wrap(<ResultView result={rejected} onReset={() => {}} />));
    expect(screen.getByRole("status")).toHaveTextContent("REJECTED");
    expect(screen.getByText(/27 CFR §16.22/)).toBeInTheDocument();
  });

  it("displays token usage in the footer", () => {
    render(wrap(<ResultView result={baseResult} onReset={() => {}} />));
    expect(screen.getByLabelText(/Token usage/i)).toHaveTextContent("1200");
    expect(screen.getByLabelText(/Token usage/i)).toHaveTextContent("900");
  });

  it("displays a field row for every result entry", () => {
    render(wrap(<ResultView result={baseResult} onReset={() => {}} />));
    const labelCells = screen.getAllByRole("rowheader");
    expect(labelCells).toHaveLength(baseResult.fields.length);
  });
});
