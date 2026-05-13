import { runVerificationEngine } from "../verify";
import { CANONICAL_WARNING } from "../warning";
import type { ApplicationData, ExtractedLabel, UsageInfo } from "../types";

const application: ApplicationData = {
  brand_name: "OLD TOM DISTILLERY",
  class_type: "Kentucky Straight Bourbon Whiskey",
  alcohol_content: "45% Alc./Vol. (90 Proof)",
  net_contents: "750 mL",
  producer_name: "Old Tom Distillery, LLC",
  producer_address: "123 Bourbon Road, Lexington, KY",
  country_of_origin: "",
  beverage_type: "spirits",
};

const usage: UsageInfo = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  cost_usd: 0,
};

const compliantWarning = {
  government_warning_text: CANONICAL_WARNING,
  government_warning_header_appears_uppercase: true,
  government_warning_header_appears_bold: true,
};

const baseExtracted: ExtractedLabel = {
  brand_name: "OLD TOM DISTILLERY",
  class_type: "Kentucky Straight Bourbon Whiskey",
  alcohol_content_text: "45% Alc./Vol. (90 Proof)",
  net_contents_text: "750 mL",
  producer_name: "Old Tom Distillery, LLC",
  producer_address: "123 Bourbon Road, Lexington, KY",
  country_of_origin: null,
  ...compliantWarning,
  notes: null,
};

describe("runVerificationEngine", () => {
  it("returns verified when every field matches and warning is compliant", () => {
    const result = runVerificationEngine(application, baseExtracted, 100, usage);
    expect(result.verdict).toBe("verified");
    expect(result.citations).toHaveLength(0);
    expect(result.fields.every((f) => f.status === "match")).toBe(true);
  });

  it("treats case-only brand differences as a clean match (Dave's STONE'S THROW)", () => {
    const result = runVerificationEngine(
      { ...application, brand_name: "STONE'S THROW" },
      { ...baseExtracted, brand_name: "Stone's Throw" },
      100,
      usage,
    );
    const brand = result.fields.find((f) => f.key === "brand_name")!;
    expect(brand.status).toBe("match");
    expect(result.verdict).toBe("verified");
  });

  it("rejects when the warning is non-compliant", () => {
    const result = runVerificationEngine(
      application,
      { ...baseExtracted, government_warning_header_appears_uppercase: false },
      100,
      usage,
    );
    expect(result.verdict).toBe("rejected");
    expect(result.warning.ok).toBe(false);
    expect(result.citations.some((c) => c.section.includes("16.22"))).toBe(true);
  });

  it("rejects when a field is a hard mismatch", () => {
    const result = runVerificationEngine(
      application,
      { ...baseExtracted, brand_name: "Completely Different Brand" },
      100,
      usage,
    );
    expect(result.verdict).toBe("rejected");
  });

  it("downgrades to needs_review when ABV is within fuzzy tolerance", () => {
    const result = runVerificationEngine(
      application,
      { ...baseExtracted, alcohol_content_text: "45.7% Alc./Vol." }, // 0.7% off
      100,
      usage,
    );
    expect(result.verdict).toBe("needs_review");
    const abv = result.fields.find((f) => f.key === "alcohol_content")!;
    expect(abv.status).toBe("fuzzy");
  });

  it("flags missing label fields as 'missing' (not mismatch)", () => {
    const result = runVerificationEngine(
      application,
      { ...baseExtracted, producer_address: null },
      100,
      usage,
    );
    expect(result.verdict).toBe("needs_review");
    const addr = result.fields.find((f) => f.key === "producer_address")!;
    expect(addr.status).toBe("missing");
  });

  it("does NOT silently pass when application ABV is unparseable (regression: false-positive guard)", () => {
    const result = runVerificationEngine(
      { ...application, alcohol_content: "not-a-number" },
      baseExtracted,
      100,
      usage,
    );
    const abv = result.fields.find((f) => f.key === "alcohol_content")!;
    expect(abv.status).toBe("missing");
    expect(abv.note).toMatch(/could not be parsed/i);
    expect(result.verdict).not.toBe("verified");
  });

  it("does NOT silently pass when application net_contents is unparseable", () => {
    const result = runVerificationEngine(
      { ...application, net_contents: "garbage" },
      baseExtracted,
      100,
      usage,
    );
    const net = result.fields.find((f) => f.key === "net_contents")!;
    expect(net.status).toBe("missing");
    expect(result.verdict).not.toBe("verified");
  });

  it("includes producer_address only when the application supplies it", () => {
    const without = runVerificationEngine(
      { ...application, producer_address: "" },
      baseExtracted,
      100,
      usage,
    );
    expect(without.fields.find((f) => f.key === "producer_address")).toBeUndefined();
    expect(without.verdict).toBe("verified");
  });

  it("includes country_of_origin in fields only when the application has it", () => {
    const without = runVerificationEngine(application, baseExtracted, 100, usage);
    expect(without.fields.find((f) => f.key === "country_of_origin")).toBeUndefined();

    const withCountry = runVerificationEngine(
      { ...application, country_of_origin: "Scotland" },
      { ...baseExtracted, country_of_origin: "Product of Scotland" },
      100,
      usage,
    );
    expect(withCountry.fields.find((f) => f.key === "country_of_origin")).toBeDefined();
  });
});
