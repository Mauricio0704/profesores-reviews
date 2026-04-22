import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/serverless";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: vercel({}),

  security: {
    allowedDomains: [
      { hostname: "www.esbuenprofe.com", protocol: "https" },
      { hostname: "esbuenprofe.com", protocol: "https" },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },
});