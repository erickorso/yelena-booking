import { describe, expect, it } from "vitest";
import {
  missingCustomFieldLocales,
  resolveCustomFieldLabel,
  slugifyFieldKey,
} from "./clinicalCustomFields";

describe("clinicalCustomFields", () => {
  it("slugifies labels", () => {
    expect(slugifyFieldKey("Antecedentes obstétricos")).toBe(
      "antecedentes_obstetricos",
    );
  });

  it("resolves label with fallback", () => {
    const field = {
      id: "1",
      fieldKey: "obstetric",
      labels: { es: "Obstétricos" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(resolveCustomFieldLabel(field, "en")).toBe("Obstétricos");
    expect(missingCustomFieldLocales(field)).toEqual(["en"]);
  });
});
