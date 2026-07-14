/* Server-only: read the persisted locale from the request cookie so the SSR
   pass renders in the right language. Isolated from i18n.tsx (which is
   client-safe) so the @tanstack/react-start/server import never reaches the
   browser bundle. Called from the root route loader. */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { LOCALE_COOKIE, isLocale, type Locale } from "./i18n";

export const getLocaleServerFn = createServerFn({ method: "GET" }).handler((): Locale => {
  const request = getRequest();
  if (request) {
    const queryLocale = new URL(request.url).searchParams.get("lang");
    if (isLocale(queryLocale)) return queryLocale;
  }
  const cookie = request?.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return isLocale(value) ? value : "en";
});
