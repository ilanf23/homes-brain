import type { CapacitorConfig } from "@capacitor/cli";

/*
 * Capacitor config for the native iOS/Android wrappers.
 *
 * Option A: Hosted webview. The native shell loads the live production site
 * (https://homesbrain.com) directly. `webDir` still has to exist for
 * `cap sync`, so we ship a minimal branded "Loading…" fallback under
 * `public/native-shell/`. It is only displayed if the remote URL cannot be
 * reached; normally the app renders the live site.
 *
 * This config does NOT affect the production web build at homesbrain.com.
 * It is only consumed by `npx cap sync` / Xcode / Android Studio during the
 * native build flow (run on a Mac).
 */
const config: CapacitorConfig = {
  appId: "com.homesbrain.app",
  appName: "HomesBrain",
  webDir: "public/native-shell",
  server: {
    url: "https://homesbrain.com",
    cleartext: false,
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
