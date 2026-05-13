import { verifyWarning, CANONICAL_WARNING } from "../warning";
import type { ExtractedLabel } from "../types";

const baseExtracted: ExtractedLabel = {
  brand_name: null,
  class_type: null,
  alcohol_content_text: null,
  net_contents_text: null,
  producer_name: null,
  producer_address: null,
  country_of_origin: null,
  government_warning_text: null,
  government_warning_header_appears_uppercase: false,
  government_warning_header_appears_bold: null,
  notes: null,
};

describe("verifyWarning", () => {
  it("passes when text is exact and header is all caps", () => {
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text: CANONICAL_WARNING,
      government_warning_header_appears_uppercase: true,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("fails when warning is missing entirely", () => {
    const result = verifyWarning(baseExtracted);
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toMatch(/not present/i);
    expect(result.detected).toBeNull();
  });

  it("fails when header is not all caps even if text matches", () => {
    const titleCase = CANONICAL_WARNING.replace(
      "GOVERNMENT WARNING:",
      "Government Warning:",
    );
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text: titleCase,
      government_warning_header_appears_uppercase: false,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => /ALL CAPS|caps/i.test(r))).toBe(true);
  });

  it("fails when text does not match the canonical statement", () => {
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text:
        "GOVERNMENT WARNING: Drink responsibly. Wear a seatbelt. Floss daily.",
      government_warning_header_appears_uppercase: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toMatch(/canonical|does not match/i);
  });

  it("preserves the detected text in the result", () => {
    const detected = "GOVERNMENT WARNING: tampered text";
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text: detected,
      government_warning_header_appears_uppercase: true,
    });
    expect(result.detected).toBe(detected);
  });

  it("fails when header is confirmed NOT bold even if caps + text are correct", () => {
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text: CANONICAL_WARNING,
      government_warning_header_appears_uppercase: true,
      government_warning_header_appears_bold: false,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => /bold/i.test(r))).toBe(true);
  });

  it("passes when bold is null (uncertain) and caps + text are correct", () => {
    const result = verifyWarning({
      ...baseExtracted,
      government_warning_text: CANONICAL_WARNING,
      government_warning_header_appears_uppercase: true,
      government_warning_header_appears_bold: null,
    });
    expect(result.ok).toBe(true);
  });
});
