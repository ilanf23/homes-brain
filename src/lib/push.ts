/*
 * Push notification helper. NO-OP on web.
 *
 * Only runs inside the Capacitor native shell (iOS/Android). On the regular
 * web app (homesbrain.com and the Lovable preview) this file does nothing —
 * every entry point is gated by `Capacitor.isNativePlatform()` and the
 * Capacitor modules are loaded via dynamic `import()` so they never end up
 * in the web bundle's critical path.
 */
import { supabase } from "@/integrations/supabase/client";

let registered = false;

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function storeToken(token: string, platform: string) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase
      .from("device_tokens" as never)
      .upsert(
        { user_id: userId, token, platform } as never,
        { onConflict: "token" } as never,
      );
  } catch (err) {
    console.warn("[push] storeToken failed", err);
  }
}

export async function registerPushNotifications(): Promise<void> {
  if (registered) return;
  if (!(await isNative())) return;
  registered = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const { Capacitor } = await import("@capacitor/core");

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      void storeToken(token.value, Capacitor.getPlatform());
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });
  } catch (err) {
    console.warn("[push] register failed", err);
  }
}
