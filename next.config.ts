import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Permite acessar o dev server pelo IP da rede local (ex: celular no mesmo Wi-Fi)
  allowedDevOrigins: ["192.168.0.11"],
};

export default nextConfig;
