import { citationsForVerdict } from "../rag";
import type { FieldResult, WarningResult } from "../types";

const okWarning: WarningResult = { ok: true, reasons: [], detected: "..." };
const badWarning: WarningResult = {
  ok: false,
  reasons: ["The warning text does not match the canonical statement required by 27 CFR §16.21."],
  detected: "bad text",
};

const matchField = (key: FieldResult["key"]): FieldResult => ({
  key,
  status: "match",
  application: "x",
  label: "x",
});

const mismatchField = (key: FieldResult["key"]): FieldResult => ({
  key,
  status: "mismatch",
  application: "x",
  label: "y",
});

describe("citationsForVerdict", () => {
  it("returns no citations when warning ok and all fields match", () => {
    expect(citationsForVerdict("spirits", [matchField("brand_name")], okWarning)).toEqual([]);
  });

  it("returns the warning citations on warning failure", () => {
    const citations = citationsForVerdict("spirits", [matchField("brand_name")], badWarning);
    expect(citations.some((c) => c.section === "27 CFR §16.21")).toBe(true);
  });

  it("returns spirits-specific citations for spirits beverages", () => {
    const citations = citationsForVerdict("spirits", [mismatchField("alcohol_content")], okWarning);
    expect(citations.some((c) => c.section === "27 CFR §5.32")).toBe(true);
    expect(citations.some((c) => c.section === "27 CFR §5.37")).toBe(true);
  });

  it("returns wine-specific citations for wine beverages", () => {
    const citations = citationsForVerdict("wine", [mismatchField("brand_name")], okWarning);
    expect(citations.some((c) => c.section === "27 CFR §4.32")).toBe(true);
    expect(citations.some((c) => c.section === "27 CFR §5.32")).toBe(false);
  });

  it("returns malt-beverage citations for beer", () => {
    const citations = citationsForVerdict("malt", [mismatchField("brand_name")], okWarning);
    expect(citations.some((c) => c.section === "27 CFR §7.22")).toBe(true);
  });

  it("includes the caps-specific warning citation when caps fail", () => {
    const capsWarning: WarningResult = {
      ok: false,
      reasons: ["The 'GOVERNMENT WARNING' header is not in ALL CAPS."],
      detected: "x",
    };
    const citations = citationsForVerdict("spirits", [], capsWarning);
    expect(citations.some((c) => c.section === "27 CFR §16.22")).toBe(true);
  });
});
