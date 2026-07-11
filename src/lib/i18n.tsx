/* Portal internationalization. Lightweight, dependency-free: a locale
   context provided at the app root, string dictionaries, and a t() lookup.

   Persistence is a cookie (hb_lang), not localStorage, so the SSR pass can
   read the chosen language from the request and render it directly. The
   root loader seeds the provider with that value (see i18n-server.ts and
   __root.tsx), so the first client render matches the server and there is
   no hydration flash on translated copy.

   English is the source language; Spanish is the first translation. Add a
   locale by extending Locale, LOCALES, and the DICTS map. Keys missing from
   a non-English dictionary fall back to English, then to the key itself. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "es";

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
];

export const LOCALE_COOKIE = "hb_lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "es";
}

/* ---- Dictionaries ------------------------------------------------------ */

const en = {
  // Shared chrome
  "chrome.forHomeowners": "For homeowners",
  "chrome.homeowner": "Homeowner",
  "chrome.signOut": "Sign out",
  "nav.myHome": "My home",
  "nav.appliances": "Appliances",
  "nav.myPros": "My pros",
  "nav.reminders": "Reminders",
  "nav.settings": "Settings",
  "nav.addToHome": "Add to your home",
  "nav.add": "Add",

  // Shared auth bits
  "auth.continueGoogle": "Continue with Google",
  "auth.openingGoogle": "Opening Google…",
  "auth.or": "or",
  "auth.email": "Email",
  "auth.emailPlaceholder": "you@email.com",
  "auth.password": "Password",
  "auth.passwordPlaceholder": "Your password",
  "auth.logIn": "Log in",
  "auth.signIn": "Sign in",

  // Homeowner signup
  "signup.title": "Start your home's record",
  "signup.subtitle": "Free. Yours for life. No card.",
  "signup.finishing": "Finishing your account…",
  "signup.nameLabel": "Your name (optional)",
  "signup.namePlaceholder": "Alex",
  "signup.passwordPlaceholder": "At least 8 characters",
  "signup.addressLabel": "Home address (optional)",
  "signup.addressPlaceholder": "Start typing your address…",
  "signup.addressHelp":
    "Pick your address from the list to confirm it. You can skip this and add it later, or claim it automatically when a pro sends you a service record.",
  "signup.consent": "I agree to receive service records and updates about my home.",
  "signup.create": "Create my account",
  "signup.creating": "Creating account…",
  "signup.haveAccount": "Already have an account?",

  // Login
  "login.email.title": "Welcome back",
  "login.email.sub": "Enter your email and we'll take it from there.",
  "login.sent.title": "Check your email",
  "login.sent.sub": "We sent you a one-tap sign-in link.",
  "login.password.sub": "Enter your password to sign in.",
  "login.noAccount.title": "No account yet",
  "login.noAccount.sub": "We couldn't find an account for that email.",
  "login.chooseRole.title": "Two accounts, one email",
  "login.chooseRole.sub": "How do you want to sign in?",
  "login.forgot.title": "Reset your password",
  "login.forgot.sub": "We'll email you a reset link.",
  "login.forgotSent.title": "Check your email",
  "login.forgotSent.sub": "Your reset link is on the way.",
  "login.role.homeowner": "Homeowner",
  "login.role.pro": "Pro",
  "login.continuePro": "Continue as pro",
  "login.continueHomeowner": "Continue as homeowner",
  "login.newHere": "New here?",
  "login.startFreePro": "Claim your profile",
  "login.createHomeAccountLink": "create your home account",
  "login.createHomeAccountBtn": "Create your home account",
  "login.forgotPassword": "Forgot password?",
  "login.usePasswordInstead": "Use my password instead",
  "login.emailLinkInstead": "Email me a sign-in link instead",
  "login.emailLink": "Email me a sign-in link",
  "login.signInWithPassword": "Sign in with password",
  "login.sendReset": "Send reset link",
  "login.backToSignIn": "Back to sign in",
  "login.useDifferentEmail": "Use a different email",
  "login.notYou": "Not you?",
  "login.proSent.pre": "We emailed a one-tap sign-in link to ",
  "login.proSent.post": ". Tap it and you're in.",
  "login.hoSent.pre": "We emailed a sign-in link to ",
  "login.hoSent.post": ". Click it and you're in.",
  "login.expiredLink": "That link expired. We just sent a fresh one.",
  "login.noAccount.pre": "Nothing yet for ",
  "login.noAccount.post": ". Pick where to start:",
  "login.forgotSent.pre": "Reset link sent to ",
  "login.forgotSent.post": ". Open it to set a new password.",
  "login.footer": "Free for homeowners. Records stay yours for life.",

  // Auth aside (decorative panel)
  "aside.eyebrow": "The home ledger",
  "aside.headline1": "A home that",
  "aside.headline2": "remembers itself.",
  "aside.sub": "Every visit from your pros becomes a verified record your home keeps for good.",

  // Language switcher
  "lang.label": "Language",
} as const;

export type TKey = keyof typeof en;

const es: Partial<Record<TKey, string>> = {
  "chrome.forHomeowners": "Para propietarios",
  "chrome.homeowner": "Propietario",
  "chrome.signOut": "Cerrar sesión",
  "nav.myHome": "Mi hogar",
  "nav.appliances": "Electrodomésticos",
  "nav.myPros": "Mis profesionales",
  "nav.reminders": "Recordatorios",
  "nav.settings": "Configuración",
  "nav.addToHome": "Agregar a tu hogar",
  "nav.add": "Agregar",

  "auth.continueGoogle": "Continuar con Google",
  "auth.openingGoogle": "Abriendo Google…",
  "auth.or": "o",
  "auth.email": "Correo electrónico",
  "auth.emailPlaceholder": "tu@correo.com",
  "auth.password": "Contraseña",
  "auth.passwordPlaceholder": "Tu contraseña",
  "auth.logIn": "Iniciar sesión",
  "auth.signIn": "Iniciar sesión",

  "signup.title": "Comienza el historial de tu hogar",
  "signup.subtitle": "Gratis. Tuyo de por vida. Sin tarjeta.",
  "signup.finishing": "Terminando tu cuenta…",
  "signup.nameLabel": "Tu nombre (opcional)",
  "signup.namePlaceholder": "Alex",
  "signup.passwordPlaceholder": "Al menos 8 caracteres",
  "signup.addressLabel": "Dirección del hogar (opcional)",
  "signup.addressPlaceholder": "Empieza a escribir tu dirección…",
  "signup.addressHelp":
    "Elige tu dirección de la lista para confirmarla. Puedes omitir esto y agregarla después, o reclamarla automáticamente cuando un profesional te envíe un registro de servicio.",
  "signup.consent": "Acepto recibir registros de servicio y novedades sobre mi hogar.",
  "signup.create": "Crear mi cuenta",
  "signup.creating": "Creando cuenta…",
  "signup.haveAccount": "¿Ya tienes una cuenta?",

  "login.email.title": "Bienvenido de nuevo",
  "login.email.sub": "Ingresa tu correo y nosotros nos encargamos del resto.",
  "login.sent.title": "Revisa tu correo",
  "login.sent.sub": "Te enviamos un enlace de acceso con un solo toque.",
  "login.password.sub": "Ingresa tu contraseña para acceder.",
  "login.noAccount.title": "Aún no tienes cuenta",
  "login.noAccount.sub": "No encontramos una cuenta para ese correo.",
  "login.chooseRole.title": "Dos cuentas, un correo",
  "login.chooseRole.sub": "¿Cómo quieres iniciar sesión?",
  "login.forgot.title": "Restablece tu contraseña",
  "login.forgot.sub": "Te enviaremos un enlace para restablecerla.",
  "login.forgotSent.title": "Revisa tu correo",
  "login.forgotSent.sub": "Tu enlace de restablecimiento está en camino.",
  "login.role.homeowner": "Propietario",
  "login.role.pro": "Profesional",
  "login.continuePro": "Continuar como profesional",
  "login.continueHomeowner": "Continuar como propietario",
  "login.newHere": "¿Nuevo por aquí?",
  "login.startFreePro": "Empieza gratis como profesional",
  "login.createHomeAccountLink": "crea tu cuenta de hogar",
  "login.createHomeAccountBtn": "Crea tu cuenta de hogar",
  "login.forgotPassword": "¿Olvidaste tu contraseña?",
  "login.usePasswordInstead": "Usar mi contraseña en su lugar",
  "login.emailLinkInstead": "Envíame un enlace de acceso por correo",
  "login.emailLink": "Envíame un enlace de acceso",
  "login.signInWithPassword": "Iniciar sesión con contraseña",
  "login.sendReset": "Enviar enlace de restablecimiento",
  "login.backToSignIn": "Volver a iniciar sesión",
  "login.useDifferentEmail": "Usar otro correo",
  "login.notYou": "¿No eres tú?",
  "login.proSent.pre": "Enviamos un enlace de acceso con un solo toque a ",
  "login.proSent.post": ". Tócalo y listo.",
  "login.hoSent.pre": "Enviamos un enlace de acceso a ",
  "login.hoSent.post": ". Haz clic y listo.",
  "login.expiredLink": "Ese enlace expiró. Acabamos de enviar uno nuevo.",
  "login.noAccount.pre": "Aún no hay nada para ",
  "login.noAccount.post": ". Elige por dónde empezar:",
  "login.forgotSent.pre": "Enlace de restablecimiento enviado a ",
  "login.forgotSent.post": ". Ábrelo para crear una nueva contraseña.",
  "login.footer": "Gratis para propietarios. Los registros son tuyos de por vida.",

  "aside.eyebrow": "El libro del hogar",
  "aside.headline1": "Un hogar que",
  "aside.headline2": "se recuerda a sí mismo.",
  "aside.sub":
    "Cada visita de tus profesionales se convierte en un registro verificado que tu hogar conserva para siempre.",

  "lang.label": "Idioma",
};

const DICTS: Record<Locale, Partial<Record<TKey, string>>> = { en, es };

/* ---- Context ----------------------------------------------------------- */

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function writeLocaleCookie(l: Locale) {
  // One year, root path, lax so it rides top-level navigations.
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: (l: Locale) => {
        setLocaleState(l);
        try {
          writeLocaleCookie(l);
        } catch {
          /* cookies blocked: choice still applies for this page life */
        }
      },
      t: (key: TKey) => DICTS[locale][key] ?? en[key] ?? key,
    }),
    [locale],
  );

  // Keep the document language attribute in sync for a11y and browser tools.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback keeps components usable outside the provider (e.g. isolated
    // tests): English, no persistence.
    return {
      locale: "en",
      setLocale: () => {},
      t: (key: TKey) => en[key] ?? key,
    };
  }
  return ctx;
}

/* Convenience hook for the common case of only needing t(). */
export function useT(): (key: TKey) => string {
  return useI18n().t;
}

/* ---- Language switcher ------------------------------------------------- */

/* Compact segmented EN | ES control. Matches the pill chrome used across
   the shells. Sits next to the theme/bell icon buttons. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`flex items-center gap-0.5 rounded-full border border-line bg-soft p-0.5 ${className}`}
    >
      {LOCALES.map(({ code, short, label }) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            title={label}
            onClick={() => setLocale(code)}
            className={`pressable rounded-full px-2.5 py-1 text-xs font-bold tracking-wide transition-colors ${
              active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}
