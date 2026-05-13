import { normalize, similarity, parseAbv, parseVolumeMl } from "../fuzzy";

describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("Stone's Throw!")).toBe("stone s throw");
  });

  it("collapses whitespace", () => {
    expect(normalize("  Foo    Bar  ")).toBe("foo bar");
  });

  it("strips diacritics", () => {
    expect(normalize("Café Olé")).toBe("cafe ole");
  });

  it("normalizes curly quotes to straight", () => {
    expect(normalize("STONE’S THROW")).toBe("stone s throw");
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings (after normalization)", () => {
    expect(similarity("STONE'S THROW", "Stone's Throw")).toBe(1);
  });

  it("returns 1 when both inputs are empty", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("returns 0 when one side is empty", () => {
    expect(similarity("anything", "")).toBe(0);
  });

  it("returns a high score for near matches", () => {
    expect(similarity("Old Tom Distillery", "OLD TOM DISTILLERY")).toBeCloseTo(1, 5);
  });

  it("returns a low score for unrelated strings", () => {
    expect(similarity("apple", "zebra")).toBeLessThan(0.5);
  });
});

describe("parseAbv", () => {
  it("parses a percent value", () => {
    expect(parseAbv("45% Alc./Vol.")).toBe(45);
  });

  it("parses proof and converts to abv", () => {
    expect(parseAbv("90 Proof")).toBe(45);
  });

  it("prefers percent over proof when both present", () => {
    expect(parseAbv("45% (90 Proof)")).toBe(45);
  });

  it("returns null when nothing parses", () => {
    expect(parseAbv("strong")).toBeNull();
    expect(parseAbv(null)).toBeNull();
    expect(parseAbv(undefined)).toBeNull();
  });

  it("handles decimals", () => {
    expect(parseAbv("13.5% ABV")).toBe(13.5);
  });
});

describe("parseVolumeMl", () => {
  it("parses millilitres", () => {
    expect(parseVolumeMl("750 mL")).toBe(750);
  });

  it("parses litres into millilitres", () => {
    expect(parseVolumeMl("1.5 L")).toBe(1500);
  });

  it("parses fluid ounces", () => {
    expect(parseVolumeMl("12 fl oz")).toBeCloseTo(354.88, 2);
  });

  it("returns null for unparseable input", () => {
    expect(parseVolumeMl("unknown")).toBeNull();
    expect(parseVolumeMl(null)).toBeNull();
    expect(parseVolumeMl("")).toBeNull();
  });
});
