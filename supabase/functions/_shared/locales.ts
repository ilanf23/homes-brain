export const SUPPORTED_LOCALES = ["en", "es", "ru", "uk"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  es: "Spanish",
  ru: "Russian",
  uk: "Ukrainian",
};

export const LOCALE_TAGS: Record<SupportedLocale, string> = {
  en: "en-US",
  es: "es-US",
  ru: "ru-RU",
  uk: "uk-UA",
};
