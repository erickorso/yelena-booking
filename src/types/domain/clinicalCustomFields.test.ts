import { describe, expect, it } from "vitest";
import {
  isClinicalFieldLocale,
  missingCustomFieldLocales,
  resolveCustomFieldLabel,
  slugifyFieldKey,
  toClinicalFieldLocale,
} from "./clinicalCustomFields";

describe("clinicalCustomFields", () => {
  it("slugifies labels", () => {
    expect(slugifyFieldKey("Antecedentes obstétricos")).toBe(
      "antecedentes_obstetricos",
    );
    expect(slugifyFieldKey("!!!")).toBe("campo");
  });

  it("resolves label with fallback and fieldKey", () => {
    const field = {
      id: "1",
      fieldKey: "obstetric",
      labels: { es: "Obstétricos" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(resolveCustomFieldLabel(field, "en")).toBe("Obstétricos");
    expect(resolveCustomFieldLabel(field, "es")).toBe("Obstétricos");
    expect(missingCustomFieldLocales(field)).toEqual(["en"]);
    expect(
      resolveCustomFieldLabel(
        { ...field, labels: {} },
        "es",
      ),
    ).toBe("obstetric");
  });

  it("locale helpers", () => {
    expect(isClinicalFieldLocale("es")).toBe(true);
    expect(isClinicalFieldLocale("fr")).toBe(false);
    expect(toClinicalFieldLocale("en-US")).toBe("en");
    expect(toClinicalFieldLocale("es-ES")).toBe("es");
  });
});
