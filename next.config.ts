import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Trust the OS certificate store so HTTPS works behind antivirus
    // HTTPS scanning (e.g. AVG), which re-signs traffic with its own root cert.
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
