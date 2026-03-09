import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Suppress lockfile workspace root warning on Vercel
  outputFileTracingRoot: process.cwd(),
};

export default withNextIntl(nextConfig);
