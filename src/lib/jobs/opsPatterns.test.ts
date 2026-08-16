import { describe, expect, it } from "vitest";
import { outboxBackoffMs } from "@/types/domain/outbox";
import { resolveClinicId, DEFAULT_CLINIC_ID } from "@/lib/clinic/constants";
import { hashIdempotencyRequest } from "@/lib/http/idempotencyHash";

describe("outboxBackoffMs", () => {
  it("grows exponentially and caps", () => {
    expect(outboxBackoffMs(1)).toBe(30_000);
    expect(outboxBackoffMs(2)).toBe(120_000);
    expect(outboxBackoffMs(10)).toBe(6 * 60 * 60 * 1000);
  });
});

describe("resolveClinicId", () => {
  it("defaults to yelena", () => {
    expect(resolveClinicId(null)).toBe(DEFAULT_CLINIC_ID);
    expect(resolveClinicId(" acme ")).toBe("acme");
  });
});

describe("hashIdempotencyRequest", () => {
  it("is stable for same payload", () => {
    const a = hashIdempotencyRequest({ patientId: "p1", specialistId: "s1" });
    const b = hashIdempotencyRequest({ patientId: "p1", specialistId: "s1" });
    expect(a).toBe(b);
    expect(a).not.toBe(
      hashIdempotencyRequest({ patientId: "p2", specialistId: "s1" }),
    );
  });
});
