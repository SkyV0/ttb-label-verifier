/** @jest-environment node */

// API route handler tests — runs in node env so Fetch/Request/FormData are
// native (Node 22). The Anthropic SDK is mocked at the lib boundary so we
// don't ship test traffic to the real API.

const mockExtract = jest.fn();

jest.mock("@/lib/extract", () => ({
  extractLabelFields: (...args: unknown[]) => mockExtract(...args),
}));

import { POST } from "../route";
import { CANONICAL_WARNING } from "@/lib/warning";

const VALID_APPLICATION = {
  brand_name: "OLD TOM DISTILLERY",
  class_type: "Kentucky Straight Bourbon Whiskey",
  alcohol_content: "45% Alc./Vol. (90 Proof)",
  net_contents: "750 mL",
  producer_name: "Old Tom Distillery, LLC",
  producer_address: "123 Bourbon Road, Lexington, KY",
  country_of_origin: "",
  beverage_type: "spirits",
};

function makeRequest(body: BodyInit | null, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/verify", {
    method: "POST",
    body,
    headers,
  });
}

function makeForm(opts: { withImage?: boolean; application?: unknown }): FormData {
  const form = new FormData();
  if (opts.withImage !== false) {
    form.append("image", new File([new Uint8Array([0xff, 0xd8, 0xff])], "label.jpg", { type: "image/jpeg" }));
  }
  if ("application" in opts) {
    form.append("application", typeof opts.application === "string" ? opts.application : JSON.stringify(opts.application));
  } else {
    form.append("application", JSON.stringify(VALID_APPLICATION));
  }
  return form;
}

beforeEach(() => {
  mockExtract.mockReset();
});

describe("POST /api/verify", () => {
  it("returns 400 when image is missing", async () => {
    const form = new FormData();
    form.append("application", JSON.stringify(VALID_APPLICATION));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_image");
  });

  it("returns 400 when application is missing", async () => {
    const form = makeForm({});
    form.delete("application");
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_application");
  });

  it("returns 200 with verdict=verified for a fully matching label", async () => {
    mockExtract.mockResolvedValueOnce({
      fields: {
        brand_name: "OLD TOM DISTILLERY",
        class_type: "Kentucky Straight Bourbon Whiskey",
        alcohol_content_text: "45% Alc./Vol.",
        net_contents_text: "750 mL",
        producer_name: "Old Tom Distillery, LLC",
        producer_address: "123 Bourbon Road, Lexington, KY",
        country_of_origin: null,
        government_warning_text: CANONICAL_WARNING,
        government_warning_header_appears_uppercase: true,
        government_warning_header_appears_bold: true,
        notes: null,
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost_usd: 0.001,
      },
      model: "claude-sonnet-4-6",
    });

    const res = await POST(makeRequest(makeForm({})));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe("verified");
    expect(body.fields).toHaveLength(6);
    expect(body.usage.input_tokens).toBe(100);
  });

  it("returns 200 with verdict=rejected when warning is non-compliant", async () => {
    mockExtract.mockResolvedValueOnce({
      fields: {
        brand_name: "OLD TOM DISTILLERY",
        class_type: "Kentucky Straight Bourbon Whiskey",
        alcohol_content_text: "45% Alc./Vol.",
        net_contents_text: "750 mL",
        producer_name: "Old Tom Distillery, LLC",
        producer_address: "123 Bourbon Road, Lexington, KY",
        country_of_origin: null,
        government_warning_text: "Some other warning",
        government_warning_header_appears_uppercase: false,
        government_warning_header_appears_bold: null,
        notes: null,
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost_usd: 0.001,
      },
      model: "claude-sonnet-4-6",
    });

    const res = await POST(makeRequest(makeForm({})));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe("rejected");
    expect(body.citations.length).toBeGreaterThan(0);
  });

  it("classifies Anthropic overloaded errors as 503 upstream_error", async () => {
    mockExtract.mockRejectedValueOnce(new Error("Anthropic 529 overloaded"));
    const res = await POST(makeRequest(makeForm({})));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("upstream_error");
  });

  it("returns 500 verification_failed for generic upstream errors", async () => {
    mockExtract.mockRejectedValueOnce(new Error("kaboom"));
    const res = await POST(makeRequest(makeForm({})));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("verification_failed");
    expect(body.message).toContain("kaboom");
  });

  it("returns 415 when file type is unsupported", async () => {
    const form = new FormData();
    form.append(
      "image",
      new File([new Uint8Array([0])], "label.txt", { type: "text/plain" }),
    );
    form.append("application", JSON.stringify(VALID_APPLICATION));
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe("invalid_file_type");
  });

  it("returns 400 invalid_application when zod validation fails", async () => {
    const form = makeForm({ application: { brand_name: "", class_type: "", alcohol_content: "", net_contents: "", producer_name: "", beverage_type: "spirits" } });
    const res = await POST(makeRequest(form));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_application");
    expect(body.details).toBeTruthy();
  });
});
