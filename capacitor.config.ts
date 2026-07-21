import type { CapacitorConfig } from "@capacitor/cli";

/*
 * Capacitor config for the native iOS/Android wrappers.
 *
 * IMPORTANT: This file does NOT affect the production web build at
 * homesbrain.com. It is only consumed by `npx cap sync` / Xcode / Android
 * Studio during the native build flow (run on a Mac).
 *
 * webDir points at the static SPA bundle that Capacitor packages inside the
 * native app. The current TanStack Start build emits an SSR client bundle
 * to `dist/client` (JS/CSS assets only, no standalone index.html), which is
 * NOT directly wrappable. A dedicated `build:mobile` script that produces a
 * static SPA index.html is still TODO — see the note in the ticket. Until
 * that script exists, running `npx cap sync` will fail with a missing
 * webDir, which is the intended safe default.
 */
const config: CapacitorConfig = {
  appId: "com.homesbrain.app",
  appName: "HomesBrain",
  webDir: "dist/mobile",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
