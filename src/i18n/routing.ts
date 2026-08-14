import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "es",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
