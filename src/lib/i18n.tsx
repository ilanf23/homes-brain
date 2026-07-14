/* Portal internationalization. Lightweight, dependency-free: a locale
   context provided at the app root, string dictionaries, and a t() lookup.

   Persistence is a cookie (hb_lang), not localStorage, so the SSR pass can
   read the chosen language from the request and render it directly. The
   root loader seeds the provider with that value (see i18n-server.ts and
   __root.tsx), so the first client render matches the server and there is
   no hydration flash on translated copy.

   English is the source language. Add a
   locale by extending Locale, LOCALES, and the DICTS map. Keys missing from
   a non-English dictionary fall back to English, then to the key itself. */
import { ChevronDown } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Locale = "en" | "es" | "ru" | "uk";

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "uk", label: "Українська", short: "UK" },
];

export const LOCALE_COOKIE = "hb_lang";

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "es" || v === "ru" || v === "uk";
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
  "nav.homeownerNavigation": "Homeowner navigation",
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
  "login.signInAs": "Sign in as",
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

  // Pro workspace chrome
  "pro.navigation": "Pro navigation",
  "pro.nav.home": "Home",
  "pro.nav.customers": "Customers",
  "pro.nav.records": "Records",
  "pro.nav.invoices": "Invoices",
  "pro.nav.due": "Due for service",
  "pro.nav.reviews": "Reviews",
  "pro.nav.referral": "Referral",
  "pro.nav.office": "Office",
  "pro.nav.settings": "Settings",
  "pro.logJob": "Log a job",
  "pro.back": "Back",
  "pro.review": "Review",
  "pro.reviewAndSend": "Review and send",
  "pro.backDashboard": "Back to dashboard",
  "pro.yourBusiness": "Your business",
  "pro.chargeJob": "Charge for this job (optional)",
  "pro.chargeHelp": "Leave blank if you're not billing through the app.",
  "pro.askGoogleReview": "Ask customer for a Google review after sending",
  "pro.recordSent": "Record sent.",
  "pro.saved": "Saved.",
  "pro.showClaimQr": "Show claim QR",
  "pro.logAnother": "Log another",
  "pro.search.label": "Search customers and records",
  "pro.search.placeholder": "Search customers, records…",
  "pro.search.results": "Search results",
  "pro.search.noMatches": "No matches",
  "pro.notifications": "Notifications",
  "pro.notificationsUnread": "unread",
  "pro.notificationsEmpty":
    "Nothing yet. When homeowners view records, claim homes, or ask to connect, it lands here.",
  "pro.accountMenu": "Account menu",
  "pro.account": "Account",
  "pro.loading": "Loading",

  // Pro dashboard
  "dash.greet.morning": "Good morning",
  "dash.greet.afternoon": "Good afternoon",
  "dash.greet.evening": "Good evening",
  "dash.youreAt": "You're at",
  "dash.logJob.first": "Start with one you already did: 30 seconds.",
  "dash.logJob.hint": "30 seconds. Just talk and tap.",
  "dash.whoNeedsYou": "Who needs you",
  "dash.noneDue":
    "No one's due right now. When a job's next service date comes up, it'll show here.",
  "dash.customer": "Customer",
  "dash.overdueSince": "Overdue since ",
  "dash.due": "Due ",
  "dash.remind": "Remind",
  "dash.reminded": "Reminded",
  "dash.remindAria": "Send reminder to ",
  "dash.reminderSent": "Reminder sent to ",
  "dash.niceWeek": "Nice week",
  "dash.thisWeek": "This week",
  "dash.onGoogle": "★ on Google",
  "dash.asks.one": "review ask sent in the last 7 days",
  "dash.asks.few": "review asks sent in the last 7 days",
  "dash.asks.many": "review asks sent in the last 7 days",
  "dash.asks.other": "review asks sent in the last 7 days",
  "dash.office": "My numbers, map and customers",

  // Dashboard: What's Next
  "dash.whatsNext": "What's Next",
  "dash.allCaughtUp": "You're all caught up",
  "dash.toSet": "to set",
  "dash.overdue": "overdue",
  "dash.upcoming": "upcoming",
  "dash.toast.dateFailed": "Couldn't save that date. Try again.",
  "dash.toast.scheduled": "Follow-up scheduled",
  "dash.toast.updateFailed": "Couldn't update. Try again.",
  "dash.toast.noFollowUp": "Marked as no follow-up needed",
  "dash.toast.markedDone": "Marked done",
  "dash.toast.emailFailed": "Couldn't send email. Try again.",

  // Dashboard: follow-up sheet
  "sheet.whenCheckBack": "When should you check back?",
  "sheet.in3": "In 3 months",
  "sheet.in6": "In 6 months",
  "sheet.in12": "In 1 year",
  "sheet.noFollowUp": "No follow-up",
  "sheet.remindThem": "Remind them",
  "sheet.noEmail": "No email on file",
  "sheet.markDone": "Mark done",
  "sheet.cancel": "Cancel",

  // Pro setup checklist (dashboard card)
  "setup.finish": "Finish setting up",
  "setup.of": "of",
  "setup.expand": "Expand setup checklist",
  "setup.minimize": "Minimize setup checklist",
  "setup.item.business": "Business name",
  "setup.item.trade": "Choose your trades",
  "setup.item.service_area": "Service area",
  "setup.item.phone": "Contact phone",
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
  "nav.homeownerNavigation": "Navegación del propietario",
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
  "login.signInAs": "Iniciar sesión como",
  "login.continuePro": "Continuar como profesional",
  "login.continueHomeowner": "Continuar como propietario",
  "login.newHere": "¿Nuevo por aquí?",
  "login.startFreePro": "Reclama tu perfil",
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

  "pro.navigation": "Navegación profesional",
  "pro.nav.home": "Inicio",
  "pro.nav.customers": "Clientes",
  "pro.nav.records": "Registros",
  "pro.nav.invoices": "Facturas",
  "pro.nav.due": "Servicio pendiente",
  "pro.nav.reviews": "Reseñas",
  "pro.nav.referral": "Referidos",
  "pro.nav.office": "Oficina",
  "pro.nav.settings": "Configuración",
  "pro.logJob": "Registrar un trabajo",
  "pro.back": "Volver",
  "pro.review": "Revisar",
  "pro.reviewAndSend": "Revisar y enviar",
  "pro.backDashboard": "Volver al panel",
  "pro.yourBusiness": "Tu negocio",
  "pro.chargeJob": "Cobrar por este trabajo (opcional)",
  "pro.chargeHelp": "Déjalo en blanco si no vas a facturar desde la aplicación.",
  "pro.askGoogleReview": "Pedir al cliente una reseña en Google después del envío",
  "pro.recordSent": "Registro enviado.",
  "pro.saved": "Guardado.",
  "pro.showClaimQr": "Mostrar QR de reclamación",
  "pro.logAnother": "Registrar otro",
  "pro.search.label": "Buscar clientes y registros",
  "pro.search.placeholder": "Buscar clientes, registros…",
  "pro.search.results": "Resultados de búsqueda",
  "pro.search.noMatches": "Sin resultados",
  "pro.notifications": "Notificaciones",
  "pro.notificationsUnread": "sin leer",
  "pro.notificationsEmpty":
    "Aún no hay nada. Aquí aparecerá cuando los propietarios vean registros, reclamen hogares o pidan conectarse.",
  "pro.accountMenu": "Menú de cuenta",
  "pro.account": "Cuenta",
  "pro.loading": "Cargando",

  "dash.greet.morning": "Buenos días",
  "dash.greet.afternoon": "Buenas tardes",
  "dash.greet.evening": "Buenas noches",
  "dash.youreAt": "Estás en",
  "dash.logJob.first": "Empieza con uno que ya hiciste: 30 segundos.",
  "dash.logJob.hint": "30 segundos. Solo habla y toca.",
  "dash.whoNeedsYou": "Quién te necesita",
  "dash.noneDue":
    "Nadie tiene servicio pendiente ahora. Cuando llegue la próxima fecha de servicio de un trabajo, aparecerá aquí.",
  "dash.customer": "Cliente",
  "dash.overdueSince": "Vencido desde el ",
  "dash.due": "Para el ",
  "dash.remind": "Recordar",
  "dash.reminded": "Recordatorio enviado",
  "dash.remindAria": "Enviar recordatorio a ",
  "dash.reminderSent": "Recordatorio enviado a ",
  "dash.niceWeek": "Buena semana",
  "dash.thisWeek": "Esta semana",
  "dash.onGoogle": "★ en Google",
  "dash.asks.one": "solicitud de reseña enviada en los últimos 7 días",
  "dash.asks.few": "solicitudes de reseña enviadas en los últimos 7 días",
  "dash.asks.many": "solicitudes de reseña enviadas en los últimos 7 días",
  "dash.asks.other": "solicitudes de reseña enviadas en los últimos 7 días",
  "dash.office": "Mis números, mapa y clientes",

  "dash.whatsNext": "Qué sigue",
  "dash.allCaughtUp": "Estás al día",
  "dash.toSet": "por programar",
  "dash.overdue": "vencidos",
  "dash.upcoming": "próximos",
  "dash.toast.dateFailed": "No se pudo guardar esa fecha. Inténtalo de nuevo.",
  "dash.toast.scheduled": "Seguimiento programado",
  "dash.toast.updateFailed": "No se pudo actualizar. Inténtalo de nuevo.",
  "dash.toast.noFollowUp": "Marcado como sin seguimiento",
  "dash.toast.markedDone": "Marcado como hecho",
  "dash.toast.emailFailed": "No se pudo enviar el correo. Inténtalo de nuevo.",

  "sheet.whenCheckBack": "¿Cuándo deberías volver a revisar?",
  "sheet.in3": "En 3 meses",
  "sheet.in6": "En 6 meses",
  "sheet.in12": "En 1 año",
  "sheet.noFollowUp": "Sin seguimiento",
  "sheet.remindThem": "Enviar recordatorio",
  "sheet.noEmail": "No hay correo registrado",
  "sheet.markDone": "Marcar como hecho",
  "sheet.cancel": "Cancelar",

  "setup.finish": "Termina la configuración",
  "setup.of": "de",
  "setup.expand": "Mostrar la lista de configuración",
  "setup.minimize": "Minimizar la lista de configuración",
  "setup.item.business": "Nombre del negocio",
  "setup.item.trade": "Elige tus oficios",
  "setup.item.service_area": "Área de servicio",
  "setup.item.phone": "Teléfono de contacto",
};

const ru: Record<TKey, string> = {
  "chrome.forHomeowners": "Для домовладельцев",
  "chrome.homeowner": "Домовладелец",
  "chrome.signOut": "Выйти",
  "nav.myHome": "Мой дом",
  "nav.appliances": "Техника",
  "nav.myPros": "Мои специалисты",
  "nav.reminders": "Напоминания",
  "nav.settings": "Настройки",
  "nav.homeownerNavigation": "Навигация домовладельца",
  "nav.addToHome": "Добавить в дом",
  "nav.add": "Добавить",

  "auth.continueGoogle": "Продолжить с Google",
  "auth.openingGoogle": "Открываем Google…",
  "auth.or": "или",
  "auth.email": "Электронная почта",
  "auth.emailPlaceholder": "you@email.com",
  "auth.password": "Пароль",
  "auth.passwordPlaceholder": "Ваш пароль",
  "auth.logIn": "Войти",
  "auth.signIn": "Войти",

  "signup.title": "Начните вести историю своего дома",
  "signup.subtitle": "Бесплатно. Навсегда ваша. Без карты.",
  "signup.finishing": "Завершаем создание аккаунта…",
  "signup.nameLabel": "Ваше имя (необязательно)",
  "signup.namePlaceholder": "Алекс",
  "signup.passwordPlaceholder": "Не менее 8 символов",
  "signup.addressLabel": "Адрес дома (необязательно)",
  "signup.addressPlaceholder": "Начните вводить адрес…",
  "signup.addressHelp":
    "Выберите адрес из списка, чтобы подтвердить его. Можно пропустить этот шаг и добавить адрес позже или подтвердить его автоматически, когда специалист отправит вам запись об обслуживании.",
  "signup.consent": "Я согласен(-на) получать записи об обслуживании и новости о моем доме.",
  "signup.create": "Создать аккаунт",
  "signup.creating": "Создаем аккаунт…",
  "signup.haveAccount": "Уже есть аккаунт?",

  "login.email.title": "С возвращением",
  "login.email.sub": "Введите электронную почту, а мы позаботимся об остальном.",
  "login.sent.title": "Проверьте почту",
  "login.sent.sub": "Мы отправили вам ссылку для входа одним нажатием.",
  "login.password.sub": "Введите пароль, чтобы войти.",
  "login.noAccount.title": "Аккаунта пока нет",
  "login.noAccount.sub": "Мы не нашли аккаунт с такой электронной почтой.",
  "login.chooseRole.title": "Два аккаунта, одна электронная почта",
  "login.chooseRole.sub": "Как вы хотите войти?",
  "login.forgot.title": "Сброс пароля",
  "login.forgot.sub": "Мы отправим вам ссылку для сброса пароля.",
  "login.forgotSent.title": "Проверьте почту",
  "login.forgotSent.sub": "Ссылка для сброса пароля уже в пути.",
  "login.role.homeowner": "Домовладелец",
  "login.role.pro": "Специалист",
  "login.signInAs": "Войти как",
  "login.continuePro": "Продолжить как специалист",
  "login.continueHomeowner": "Продолжить как домовладелец",
  "login.newHere": "Впервые здесь?",
  "login.startFreePro": "Создать профиль",
  "login.createHomeAccountLink": "создайте аккаунт своего дома",
  "login.createHomeAccountBtn": "Создать аккаунт дома",
  "login.forgotPassword": "Забыли пароль?",
  "login.usePasswordInstead": "Войти с паролем",
  "login.emailLinkInstead": "Отправить ссылку для входа по электронной почте",
  "login.emailLink": "Отправить ссылку для входа",
  "login.signInWithPassword": "Войти с паролем",
  "login.sendReset": "Отправить ссылку для сброса",
  "login.backToSignIn": "Вернуться ко входу",
  "login.useDifferentEmail": "Использовать другую электронную почту",
  "login.notYou": "Это не вы?",
  "login.proSent.pre": "Мы отправили ссылку для входа одним нажатием на адрес ",
  "login.proSent.post": ". Откройте ее — и вы войдете.",
  "login.hoSent.pre": "Мы отправили ссылку для входа на адрес ",
  "login.hoSent.post": ". Откройте ее — и вы войдете.",
  "login.expiredLink": "Срок действия ссылки истек. Мы только что отправили новую.",
  "login.noAccount.pre": "Для адреса ",
  "login.noAccount.post": " пока ничего нет. Выберите, с чего начать:",
  "login.forgotSent.pre": "Ссылка для сброса пароля отправлена на адрес ",
  "login.forgotSent.post": ". Откройте ее, чтобы создать новый пароль.",
  "login.footer": "Бесплатно для домовладельцев. Записи навсегда остаются вашими.",

  "aside.eyebrow": "История дома",
  "aside.headline1": "Дом, который",
  "aside.headline2": "помнит всё о себе.",
  "aside.sub":
    "Каждый визит специалиста становится подтвержденной записью, которую ваш дом хранит навсегда.",

  "lang.label": "Язык",

  "pro.navigation": "Навигация специалиста",
  "pro.nav.home": "Главная",
  "pro.nav.customers": "Клиенты",
  "pro.nav.records": "Записи",
  "pro.nav.invoices": "Счета",
  "pro.nav.due": "Пора обслужить",
  "pro.nav.reviews": "Отзывы",
  "pro.nav.referral": "Рекомендации",
  "pro.nav.office": "Офис",
  "pro.nav.settings": "Настройки",
  "pro.logJob": "Записать работу",
  "pro.back": "Назад",
  "pro.review": "Проверить",
  "pro.reviewAndSend": "Проверить и отправить",
  "pro.backDashboard": "Вернуться на главную",
  "pro.yourBusiness": "Ваша компания",
  "pro.chargeJob": "Сумма за эту работу (необязательно)",
  "pro.chargeHelp": "Оставьте поле пустым, если не выставляете счёт через приложение.",
  "pro.askGoogleReview": "Попросить клиента оставить отзыв в Google после отправки",
  "pro.recordSent": "Запись отправлена.",
  "pro.saved": "Сохранено.",
  "pro.showClaimQr": "Показать QR для подтверждения",
  "pro.logAnother": "Записать ещё одну работу",
  "pro.search.label": "Поиск клиентов и записей",
  "pro.search.placeholder": "Найти клиента или запись…",
  "pro.search.results": "Результаты поиска",
  "pro.search.noMatches": "Ничего не найдено",
  "pro.notifications": "Уведомления",
  "pro.notificationsUnread": "непрочитанных",
  "pro.notificationsEmpty":
    "Пока ничего нет. Здесь появятся просмотры записей, подтверждения домов и запросы на связь.",
  "pro.accountMenu": "Меню аккаунта",
  "pro.account": "Аккаунт",
  "pro.loading": "Загрузка",

  "dash.greet.morning": "Доброе утро",
  "dash.greet.afternoon": "Добрый день",
  "dash.greet.evening": "Добрый вечер",
  "dash.youreAt": "Вы находитесь по адресу",
  "dash.logJob.first": "Начните с того, что уже сделали: 30 секунд.",
  "dash.logJob.hint": "30 секунд. Просто говорите и нажимайте.",
  "dash.whoNeedsYou": "Кому вы нужны",
  "dash.noneDue":
    "Сейчас никого нет в очереди. Когда подойдёт дата следующего обслуживания, работа появится здесь.",
  "dash.customer": "Клиент",
  "dash.overdueSince": "Просрочено с ",
  "dash.due": "Срок: ",
  "dash.remind": "Напомнить",
  "dash.reminded": "Напоминание отправлено",
  "dash.remindAria": "Отправить напоминание: ",
  "dash.reminderSent": "Напоминание отправлено: ",
  "dash.niceWeek": "Хорошая неделя",
  "dash.thisWeek": "На этой неделе",
  "dash.onGoogle": "★ на Google",
  "dash.asks.one": "запрос отзыва отправлен за последние 7 дней",
  "dash.asks.few": "запроса отзыва отправлено за последние 7 дней",
  "dash.asks.many": "запросов отзыва отправлено за последние 7 дней",
  "dash.asks.other": "запросов отзыва отправлено за последние 7 дней",
  "dash.office": "Мои цифры, карта и клиенты",

  "dash.whatsNext": "Что дальше",
  "dash.allCaughtUp": "Все дела закрыты",
  "dash.toSet": "без даты",
  "dash.overdue": "просрочено",
  "dash.upcoming": "предстоящих",
  "dash.toast.dateFailed": "Не удалось сохранить дату. Попробуйте ещё раз.",
  "dash.toast.scheduled": "Повторный визит запланирован",
  "dash.toast.updateFailed": "Не удалось обновить. Попробуйте ещё раз.",
  "dash.toast.noFollowUp": "Отмечено: повторный визит не нужен",
  "dash.toast.markedDone": "Отмечено как выполнено",
  "dash.toast.emailFailed": "Не удалось отправить письмо. Попробуйте ещё раз.",

  "sheet.whenCheckBack": "Когда стоит проверить снова?",
  "sheet.in3": "Через 3 месяца",
  "sheet.in6": "Через 6 месяцев",
  "sheet.in12": "Через 1 год",
  "sheet.noFollowUp": "Без повторного визита",
  "sheet.remindThem": "Отправить напоминание",
  "sheet.noEmail": "Нет электронной почты",
  "sheet.markDone": "Отметить как выполнено",
  "sheet.cancel": "Отмена",

  "setup.finish": "Завершите настройку",
  "setup.of": "из",
  "setup.expand": "Развернуть список настройки",
  "setup.minimize": "Свернуть список настройки",
  "setup.item.business": "Название компании",
  "setup.item.trade": "Выберите свои специальности",
  "setup.item.service_area": "Зона обслуживания",
  "setup.item.phone": "Контактный телефон",
};

const uk: Record<TKey, string> = {
  "chrome.forHomeowners": "Для домовласників",
  "chrome.homeowner": "Домовласник",
  "chrome.signOut": "Вийти",
  "nav.myHome": "Мій дім",
  "nav.appliances": "Техніка",
  "nav.myPros": "Мої фахівці",
  "nav.reminders": "Нагадування",
  "nav.settings": "Налаштування",
  "nav.homeownerNavigation": "Навігація домовласника",
  "nav.addToHome": "Додати до дому",
  "nav.add": "Додати",

  "auth.continueGoogle": "Продовжити з Google",
  "auth.openingGoogle": "Відкриваємо Google…",
  "auth.or": "або",
  "auth.email": "Електронна пошта",
  "auth.emailPlaceholder": "you@email.com",
  "auth.password": "Пароль",
  "auth.passwordPlaceholder": "Ваш пароль",
  "auth.logIn": "Увійти",
  "auth.signIn": "Увійти",

  "signup.title": "Почніть вести історію свого дому",
  "signup.subtitle": "Безкоштовно. Назавжди ваша. Без картки.",
  "signup.finishing": "Завершуємо створення облікового запису…",
  "signup.nameLabel": "Ваше ім’я (необов’язково)",
  "signup.namePlaceholder": "Олексій",
  "signup.passwordPlaceholder": "Щонайменше 8 символів",
  "signup.addressLabel": "Адреса дому (необов’язково)",
  "signup.addressPlaceholder": "Почніть вводити адресу…",
  "signup.addressHelp":
    "Виберіть адресу зі списку, щоб підтвердити її. Можна пропустити цей крок і додати адресу пізніше або підтвердити її автоматично, коли фахівець надішле вам запис про обслуговування.",
  "signup.consent": "Я погоджуюся отримувати записи про обслуговування та новини про мій дім.",
  "signup.create": "Створити обліковий запис",
  "signup.creating": "Створюємо обліковий запис…",
  "signup.haveAccount": "Уже маєте обліковий запис?",

  "login.email.title": "З поверненням",
  "login.email.sub": "Введіть електронну пошту, а ми подбаємо про решту.",
  "login.sent.title": "Перевірте пошту",
  "login.sent.sub": "Ми надіслали вам посилання для входу одним натисканням.",
  "login.password.sub": "Введіть пароль, щоб увійти.",
  "login.noAccount.title": "Облікового запису ще немає",
  "login.noAccount.sub": "Ми не знайшли обліковий запис із такою електронною поштою.",
  "login.chooseRole.title": "Два облікові записи, одна електронна пошта",
  "login.chooseRole.sub": "Як ви хочете увійти?",
  "login.forgot.title": "Скидання пароля",
  "login.forgot.sub": "Ми надішлемо вам посилання для скидання пароля.",
  "login.forgotSent.title": "Перевірте пошту",
  "login.forgotSent.sub": "Посилання для скидання пароля вже в дорозі.",
  "login.role.homeowner": "Домовласник",
  "login.role.pro": "Фахівець",
  "login.signInAs": "Увійти як",
  "login.continuePro": "Продовжити як фахівець",
  "login.continueHomeowner": "Продовжити як домовласник",
  "login.newHere": "Ви тут уперше?",
  "login.startFreePro": "Створити профіль",
  "login.createHomeAccountLink": "створіть обліковий запис свого дому",
  "login.createHomeAccountBtn": "Створити обліковий запис дому",
  "login.forgotPassword": "Забули пароль?",
  "login.usePasswordInstead": "Увійти з паролем",
  "login.emailLinkInstead": "Надіслати посилання для входу електронною поштою",
  "login.emailLink": "Надіслати посилання для входу",
  "login.signInWithPassword": "Увійти з паролем",
  "login.sendReset": "Надіслати посилання для скидання",
  "login.backToSignIn": "Повернутися до входу",
  "login.useDifferentEmail": "Використати іншу електронну пошту",
  "login.notYou": "Це не ви?",
  "login.proSent.pre": "Ми надіслали посилання для входу одним натисканням на адресу ",
  "login.proSent.post": ". Відкрийте його — і ви ввійдете.",
  "login.hoSent.pre": "Ми надіслали посилання для входу на адресу ",
  "login.hoSent.post": ". Відкрийте його — і ви ввійдете.",
  "login.expiredLink": "Термін дії посилання минув. Ми щойно надіслали нове.",
  "login.noAccount.pre": "Для адреси ",
  "login.noAccount.post": " ще нічого немає. Виберіть, з чого почати:",
  "login.forgotSent.pre": "Посилання для скидання пароля надіслано на адресу ",
  "login.forgotSent.post": ". Відкрийте його, щоб створити новий пароль.",
  "login.footer": "Безкоштовно для домовласників. Записи назавжди залишаються вашими.",

  "aside.eyebrow": "Історія дому",
  "aside.headline1": "Дім, який",
  "aside.headline2": "пам’ятає все про себе.",
  "aside.sub": "Кожен візит фахівця стає підтвердженим записом, який ваш дім зберігає назавжди.",

  "lang.label": "Мова",

  "pro.navigation": "Навігація фахівця",
  "pro.nav.home": "Головна",
  "pro.nav.customers": "Клієнти",
  "pro.nav.records": "Записи",
  "pro.nav.invoices": "Рахунки",
  "pro.nav.due": "Час обслуговування",
  "pro.nav.reviews": "Відгуки",
  "pro.nav.referral": "Рекомендації",
  "pro.nav.office": "Офіс",
  "pro.nav.settings": "Налаштування",
  "pro.logJob": "Записати роботу",
  "pro.back": "Назад",
  "pro.review": "Перевірити",
  "pro.reviewAndSend": "Перевірити й надіслати",
  "pro.backDashboard": "Повернутися на головну",
  "pro.yourBusiness": "Ваша компанія",
  "pro.chargeJob": "Сума за цю роботу (необов’язково)",
  "pro.chargeHelp": "Залиште поле порожнім, якщо не виставляєте рахунок через застосунок.",
  "pro.askGoogleReview": "Попросити клієнта залишити відгук у Google після надсилання",
  "pro.recordSent": "Запис надіслано.",
  "pro.saved": "Збережено.",
  "pro.showClaimQr": "Показати QR для підтвердження",
  "pro.logAnother": "Записати ще одну роботу",
  "pro.search.label": "Пошук клієнтів і записів",
  "pro.search.placeholder": "Знайти клієнта або запис…",
  "pro.search.results": "Результати пошуку",
  "pro.search.noMatches": "Нічого не знайдено",
  "pro.notifications": "Сповіщення",
  "pro.notificationsUnread": "непрочитаних",
  "pro.notificationsEmpty":
    "Поки що нічого немає. Тут з’являться перегляди записів, підтвердження будинків і запити на зв’язок.",
  "pro.accountMenu": "Меню облікового запису",
  "pro.account": "Обліковий запис",
  "pro.loading": "Завантаження",

  "dash.greet.morning": "Доброго ранку",
  "dash.greet.afternoon": "Доброго дня",
  "dash.greet.evening": "Доброго вечора",
  "dash.youreAt": "Ви за адресою",
  "dash.logJob.first": "Почніть з того, що вже зробили: 30 секунд.",
  "dash.logJob.hint": "30 секунд. Просто говоріть і торкайтеся.",
  "dash.whoNeedsYou": "Кому ви потрібні",
  "dash.noneDue":
    "Зараз ніхто не очікує. Коли настане дата наступного обслуговування, робота з’явиться тут.",
  "dash.customer": "Клієнт",
  "dash.overdueSince": "Прострочено з ",
  "dash.due": "Термін: ",
  "dash.remind": "Нагадати",
  "dash.reminded": "Нагадування надіслано",
  "dash.remindAria": "Надіслати нагадування: ",
  "dash.reminderSent": "Нагадування надіслано: ",
  "dash.niceWeek": "Гарний тиждень",
  "dash.thisWeek": "Цього тижня",
  "dash.onGoogle": "★ на Google",
  "dash.asks.one": "запит відгуку надіслано за останні 7 днів",
  "dash.asks.few": "запити відгуку надіслано за останні 7 днів",
  "dash.asks.many": "запитів відгуку надіслано за останні 7 днів",
  "dash.asks.other": "запитів відгуку надіслано за останні 7 днів",
  "dash.office": "Мої цифри, карта та клієнти",

  "dash.whatsNext": "Що далі",
  "dash.allCaughtUp": "Усі справи закриті",
  "dash.toSet": "без дати",
  "dash.overdue": "прострочено",
  "dash.upcoming": "майбутніх",
  "dash.toast.dateFailed": "Не вдалося зберегти дату. Спробуйте ще раз.",
  "dash.toast.scheduled": "Повторний візит заплановано",
  "dash.toast.updateFailed": "Не вдалося оновити. Спробуйте ще раз.",
  "dash.toast.noFollowUp": "Позначено: повторний візит не потрібен",
  "dash.toast.markedDone": "Позначено як виконано",
  "dash.toast.emailFailed": "Не вдалося надіслати лист. Спробуйте ще раз.",

  "sheet.whenCheckBack": "Коли варто перевірити знову?",
  "sheet.in3": "Через 3 місяці",
  "sheet.in6": "Через 6 місяців",
  "sheet.in12": "Через 1 рік",
  "sheet.noFollowUp": "Без повторного візиту",
  "sheet.remindThem": "Надіслати нагадування",
  "sheet.noEmail": "Немає електронної пошти",
  "sheet.markDone": "Позначити як виконано",
  "sheet.cancel": "Скасувати",

  "setup.finish": "Завершіть налаштування",
  "setup.of": "з",
  "setup.expand": "Розгорнути список налаштування",
  "setup.minimize": "Згорнути список налаштування",
  "setup.item.business": "Назва компанії",
  "setup.item.trade": "Оберіть свої спеціальності",
  "setup.item.service_area": "Зона обслуговування",
  "setup.item.phone": "Контактний телефон",
};

const DICTS: Record<Locale, Partial<Record<TKey, string>>> = { en, es, ru, uk };

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
  // Writing here also persists a locale supplied by an emailed `?lang=` URL
  // after the first hydration, even when it already matched the SSR locale.
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      writeLocaleCookie(locale);
    } catch {
      /* cookies blocked: choice still applies for this page life */
    }
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

/* Plural category for count-driven copy. Russian and Ukrainian need distinct
   few/many forms, so the caller keys off this instead of a bare n === 1 test.
   Categories we do not author (zero, two) collapse to "other". */
export type PluralForm = "one" | "few" | "many" | "other";

export function pluralForm(locale: Locale, n: number): PluralForm {
  const c = new Intl.PluralRules(locale).select(n);
  return c === "one" || c === "few" || c === "many" ? c : "other";
}

/* ---- Language switcher ------------------------------------------------- */

/* Compact language menu. The trigger stays narrow enough for mobile headers,
   while the menu exposes each language's full native name. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALES.find(({ code }) => code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("lang.label")}: ${current.label}`}
          title={current.label}
          className={`pressable inline-flex h-8 items-center gap-1 rounded-full border border-line bg-soft px-2.5 text-xs font-bold tracking-wide text-ink transition-colors hover:bg-paper ${className}`}
        >
          {current.short}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 rounded-xl border-line bg-paper p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-xs text-muted">
          {t("lang.label")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (isLocale(value)) setLocale(value);
          }}
        >
          {LOCALES.map(({ code, short, label }) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              className="cursor-pointer rounded-lg py-2 pl-8 pr-2 font-semibold focus:bg-soft focus:text-ink"
            >
              <span className="w-6 text-xs font-bold tracking-wide text-muted">{short}</span>
              <span>{label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
