import { describe, expect, it } from "vitest";
import {
  isClinicalCustomFieldType,
  isClinicalFieldLocale,
  missingCustomFieldLocales,
  resolveCustomFieldLabel,
  slugifyFieldKey,
  toClinicalFieldLocale,
  validateCustomFieldValue,
  validateCustomValuesMap,
  type ClinicalCustomFieldDef,
} from "./clinicalCustomFields";

function field(
  overrides: Partial<ClinicalCustomFieldDef> = {},
): ClinicalCustomFieldDef {
  return {
    id: "1",
    fieldKey: "obstetric",
    labels: { es: "Obstétricos" },
    type: "textarea",
    required: false,
    options: [],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "s1",
    updatedById: "s1",
    ...overrides,
  };
}

describe("clinicalCustomFields", () => {
  it("slugifies labels", () => {
    expect(slugifyFieldKey("Antecedentes obstétricos")).toBe(
      "antecedentes_obstetricos",
    );
    expect(slugifyFieldKey("!!!")).toBe("campo");
  });

  it("resolves label with fallback and fieldKey", () => {
    const f = field();
    expect(resolveCustomFieldLabel(f, "en")).toBe("Obstétricos");
    expect(resolveCustomFieldLabel(f, "es")).toBe("Obstétricos");
    expect(missingCustomFieldLocales(f)).toEqual(["en"]);
    expect(resolveCustomFieldLabel(field({ labels: {} }), "es")).toBe(
      "obstetric",
    );
  });

  it("locale and type helpers", () => {
    expect(isClinicalFieldLocale("es")).toBe(true);
    expect(isClinicalFieldLocale("fr")).toBe(false);
    expect(toClinicalFieldLocale("en-US")).toBe("en");
    expect(isClinicalCustomFieldType("number")).toBe(true);
    expect(isClinicalCustomFieldType("file")).toBe(false);
  });

  it("validates typed values", () => {
    expect(validateCustomFieldValue(field({ type: "number" }), "12.5")).toBe(
      "12.5",
    );
    expect(() =>
      validateCustomFieldValue(field({ type: "number" }), "x"),
    ).toThrow(/number/);
    expect(
      validateCustomFieldValue(field({ type: "boolean" }), "sí"),
    ).toBe("true");
    expect(
      validateCustomFieldValue(field({ type: "date" }), "2020-01-02"),
    ).toBe("2020-01-02");
    expect(
      validateCustomFieldValue(
        field({ type: "select", options: ["A", "B"] }),
        "A",
      ),
    ).toBe("A");
    expect(() =>
      validateCustomFieldValue(field({ required: true }), ""),
    ).toThrow(/required/);
  });

  it("validates maps and keeps foreign keys", () => {
    const mine = field({ id: "a", required: true, type: "text" });
    const out = validateCustomValuesMap([mine], {
      a: "ok",
      foreign: "kept",
    });
    expect(out.a).toBe("ok");
    expect(out.foreign).toBe("kept");
  });
});
