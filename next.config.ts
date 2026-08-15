import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Avoid bundling firebase-admin (jose/jwks-rsa ESM clash on Vercel).
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
};

export default withNextIntl(nextConfig);
