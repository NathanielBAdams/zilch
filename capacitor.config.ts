import type { CapacitorConfig } from "@capacitor/cli";

// Points the native shell at the live deployment rather than bundling a static
// copy of the app — the web app (and its PWA install path) stays completely
// untouched, and the iOS app always serves whatever is live on Vercel.
const config: CapacitorConfig = {
  appId: "com.zilchscorekeeper.app",
  appName: "Zilch",
  webDir: "public",
  server: {
    url: "https://zilch-gold.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
