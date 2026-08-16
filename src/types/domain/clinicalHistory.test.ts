import { describe, expect, it } from "vitest";
import {
  emptyClinicalHistory,
  isClinicalHistoryIncomplete,
} from "@/types/domain/clinicalHistory";

describe("isClinicalHistoryIncomplete", () => {
  it("is incomplete when empty", () => {
    expect(isClinicalHistoryIncomplete(emptyClinicalHistory("p1"))).toBe(true);
  });

  it("is incomplete with only phone", () => {
    const h = emptyClinicalHistory("p1");
    h.phone = "+34600000000";
    expect(isClinicalHistoryIncomplete(h)).toBe(true);
  });

  it("is complete with phone, birthDate and some clinical text", () => {
    const h = emptyClinicalHistory("p1");
    h.phone = "+34600000000";
    h.birthDate = "1990-01-01";
    h.allergies = "Penicilina";
    expect(isClinicalHistoryIncomplete(h)).toBe(false);
  });
});
