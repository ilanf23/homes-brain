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
  "login.startFreePro": "Create account",
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
  "pro.nav.dashboard": "Dashboard",

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

  // Pro dashboard (pro.index)
  "pi.greeting.morning": "Good morning",
  "pi.greeting.afternoon": "Good afternoon",
  "pi.greeting.evening": "Good evening",
  "pi.youreAt": "You're at",
  "pi.logJob": "Log a job",
  "pi.logJob.subFirst": "Start with one you already did: 30 seconds.",
  "pi.logJob.sub": "30 seconds. Just talk and tap.",
  "pi.whatsNext": "What's Next",
  "pi.allCaughtUp": "You're all caught up",
  "pi.toSet": "to set",
  "pi.upcoming": "upcoming",
  "pi.niceWeek": "Nice week",
  "pi.thisWeek": "This week",
  "pi.onGoogle": "on Google",
  "pi.reviewAsk.one": "review ask sent in the last 7 days",
  "pi.reviewAsk.other": "review asks sent in the last 7 days",
  "pi.reviewsCta": "Reviews",
  "pi.officeLink": "My numbers, map and customers",

  // Homeowner dashboard (home.index)
  "hi.myHome": "My home",
  "hi.myHomeSub": "Your pros write the record. You own it.",
  "hi.amountDue": "Amount due",
  "hi.item.one": "item",
  "hi.item.other": "items",
  "hi.pro.one": "pro",
  "hi.pro.other": "pros",
  "hi.visit.one": "visit",
  "hi.visit.other": "visits",
  "hi.allVerified": "all verified",
  "hi.recentActivity": "Recent activity",
  "hi.seeAll": "See all",
  "hi.recentEmpty": "Nothing yet. When your pros log a job, it'll show up here.",
  "hi.new": "New",
  "hi.serviceRecord": "New service record",
  "hi.serviceVisit": "Service visit",
  "hi.yourPro": "Your pro",
  "hi.onFile": "On file",
  "hi.addSomething": "+ Add something",
  "hi.equipment": "Equipment",
  "hi.noDetails": "No details yet",
  "hi.verified": "Verified",
  "hi.selfAdded": "Self-added",
  "hi.onFileEmpty": "Nothing yet. Records from your pros will show up here.",
  "hi.comingUp": "Coming up",
  "hi.due": "due",
  "hi.remindMe": "Remind me",
  "hi.allReminders": "All reminders",
  "hi.myPros": "My pros",
  "hi.noProsYet": "No pros yet.",
  "hi.rebook": "Rebook",
  "hi.paid": "Paid ✓",
  "hi.paymentComplete": "Payment complete",
  "hi.dueLabel": "Due",
  "hi.overdue": "overdue",
  "hi.noCards": "hasn't turned on card payments yet.",
  "hi.pay": "Pay",
  "hi.makeComplete": "Make your record complete",
  "hi.addAppliancesTitle": "Add your appliances",
  "hi.addAppliancesSub": "Warranty and recall checks start with a model number.",
  "hi.inviteProsTitle": "Invite your other pros",
  "hi.inviteProsSub": "Every trade you add deepens your home's record.",
  "hi.welcome": "Welcome",
  "hi.setUp": "Let's set up your home",
  "hi.setUpSub":
    "Add your address to start your home's living record. You can invite your pros anytime.",
  "hi.addYourHome": "Add your home",
  "hi.homeAddress": "Home address",
  "hi.homeAddressPh": "123 Main St, Austin, TX",
  "hi.yourPhone": "Your phone",
  "hi.phoneHintExisting": "From the number you signed in with. Change it here if it's wrong.",
  "hi.phoneHintNew": "So your pros can reach you. Optional.",
  "hi.phonePh": "555-555-1234",
  "hi.saving": "Saving…",
  "hi.addMyHome": "Add my home",
  "hi.orClaim": "Or claim from a pro",
  "hi.orClaimSub":
    "If your pro sent you a service record link, open it to claim your home in one tap. The record and any equipment they logged come with it.",
  "hi.loadingHome": "Loading your home",
  // Pro setup checklist (dashboard card)
  "setup.finish": "Finish setting up",
  "setup.of": "of",
  "setup.expand": "Expand setup checklist",
  "setup.minimize": "Minimize setup checklist",
  "setup.item.business": "Business name",
  "setup.item.trade": "Choose your trades",
  "setup.item.service_area": "Service area",
  "setup.item.phone": "Contact phone",

  // Log-a-job voice capture (AI card + "Building the record" modal)
  "voice.justTalk": "Just talk, I'll fill it in",
  "voice.tapToTalk": "Tap to talk",
  "voice.building": "Building the record",
  "voice.reading": "Reading what you said…",
  "voice.notMentioned": "Not mentioned",
  "voice.cancel": "Cancel",
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
  "pro.nav.dashboard": "Panel",

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

  "pi.greeting.morning": "Buenos días",
  "pi.greeting.afternoon": "Buenas tardes",
  "pi.greeting.evening": "Buenas noches",
  "pi.youreAt": "Estás en",
  "pi.logJob": "Registrar un trabajo",
  "pi.logJob.subFirst": "Empieza con uno que ya hiciste: 30 segundos.",
  "pi.logJob.sub": "30 segundos. Solo habla y toca.",
  "pi.whatsNext": "Qué sigue",
  "pi.allCaughtUp": "Estás al día",
  "pi.toSet": "por definir",
  "pi.upcoming": "próximos",
  "pi.niceWeek": "Buena semana",
  "pi.thisWeek": "Esta semana",
  "pi.onGoogle": "en Google",
  "pi.reviewAsk.one": "solicitud de reseña enviada en los últimos 7 días",
  "pi.reviewAsk.other": "solicitudes de reseña enviadas en los últimos 7 días",
  "pi.reviewsCta": "Reseñas",
  "pi.officeLink": "Mis números, mapa y clientes",

  "hi.myHome": "Mi hogar",
  "hi.myHomeSub": "Tus profesionales escriben el registro. Es tuyo.",
  "hi.amountDue": "Monto a pagar",
  "hi.item.one": "elemento",
  "hi.item.other": "elementos",
  "hi.pro.one": "profesional",
  "hi.pro.other": "profesionales",
  "hi.visit.one": "visita",
  "hi.visit.other": "visitas",
  "hi.allVerified": "todo verificado",
  "hi.recentActivity": "Actividad reciente",
  "hi.seeAll": "Ver todo",
  "hi.recentEmpty": "Nada aún. Cuando tus profesionales registren un trabajo, aparecerá aquí.",
  "hi.new": "Nuevo",
  "hi.serviceRecord": "Nuevo registro de servicio",
  "hi.serviceVisit": "Visita de servicio",
  "hi.yourPro": "Tu profesional",
  "hi.onFile": "En tu archivo",
  "hi.addSomething": "+ Agregar algo",
  "hi.equipment": "Equipo",
  "hi.noDetails": "Aún sin detalles",
  "hi.verified": "Verificado",
  "hi.selfAdded": "Agregado por ti",
  "hi.onFileEmpty": "Nada aún. Los registros de tus profesionales aparecerán aquí.",
  "hi.comingUp": "Próximamente",
  "hi.due": "para",
  "hi.remindMe": "Recuérdame",
  "hi.allReminders": "Todos los recordatorios",
  "hi.myPros": "Mis profesionales",
  "hi.noProsYet": "Aún no hay profesionales.",
  "hi.rebook": "Reservar",
  "hi.paid": "Pagado ✓",
  "hi.paymentComplete": "Pago completado",
  "hi.dueLabel": "Vence",
  "hi.overdue": "vencido",
  "hi.noCards": "aún no activó los pagos con tarjeta.",
  "hi.pay": "Pagar",
  "hi.makeComplete": "Completa tu registro",
  "hi.addAppliancesTitle": "Agrega tus electrodomésticos",
  "hi.addAppliancesSub":
    "Las garantías y las revisiones de retiro empiezan con un número de modelo.",
  "hi.inviteProsTitle": "Invita a tus otros profesionales",
  "hi.inviteProsSub": "Cada oficio que agregas hace más completo el registro de tu hogar.",
  "hi.welcome": "Bienvenido",
  "hi.setUp": "Vamos a configurar tu hogar",
  "hi.setUpSub":
    "Agrega tu dirección para iniciar el registro vivo de tu hogar. Puedes invitar a tus profesionales cuando quieras.",
  "hi.addYourHome": "Agrega tu hogar",
  "hi.homeAddress": "Dirección del hogar",
  "hi.homeAddressPh": "Calle 123, Ciudad, Estado",
  "hi.yourPhone": "Tu teléfono",
  "hi.phoneHintExisting": "Del número con el que iniciaste sesión. Cámbialo aquí si está mal.",
  "hi.phoneHintNew": "Para que tus profesionales puedan contactarte. Opcional.",
  "hi.phonePh": "555-555-1234",
  "hi.saving": "Guardando…",
  "hi.addMyHome": "Agregar mi hogar",
  "hi.orClaim": "O reclama desde un profesional",
  "hi.orClaimSub":
    "Si tu profesional te envió un enlace de registro de servicio, ábrelo para reclamar tu hogar con un toque. El registro y los equipos que registró llegan contigo.",
  "hi.loadingHome": "Cargando tu hogar",
  // Pro setup checklist (dashboard card)
  "setup.finish": "Termina la configuración",
  "setup.of": "de",
  "setup.expand": "Mostrar la lista de configuración",
  "setup.minimize": "Minimizar la lista de configuración",
  "setup.item.business": "Nombre del negocio",
  "setup.item.trade": "Elige tus oficios",
  "setup.item.service_area": "Área de servicio",
  "setup.item.phone": "Teléfono de contacto",

  "voice.justTalk": "Solo habla, yo lo completo",
  "voice.tapToTalk": "Toca para hablar",
  "voice.building": "Creando el registro",
  "voice.reading": "Leyendo lo que dijiste…",
  "voice.notMentioned": "No mencionado",
  "voice.cancel": "Cancelar",
};

const ru: Partial<Record<TKey, string>> = {
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
  "login.proSent.post": ". Откройте ее, и вы войдете.",
  "login.hoSent.pre": "Мы отправили ссылку для входа на адрес ",
  "login.hoSent.post": ". Откройте ее, и вы войдете.",
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
  "pro.nav.dashboard": "Панель",

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

  "pi.greeting.morning": "Доброе утро",
  "pi.greeting.afternoon": "Добрый день",
  "pi.greeting.evening": "Добрый вечер",
  "pi.youreAt": "Вы находитесь по адресу",
  "pi.logJob": "Записать работу",
  "pi.logJob.subFirst": "Начните с той, что уже сделали: 30 секунд.",
  "pi.logJob.sub": "30 секунд. Говорите и нажимайте.",
  "pi.whatsNext": "Что дальше",
  "pi.allCaughtUp": "Всё сделано",
  "pi.toSet": "к назначению",
  "pi.upcoming": "предстоящих",
  "pi.niceWeek": "Хорошая неделя",
  "pi.thisWeek": "На этой неделе",
  "pi.onGoogle": "в Google",
  "pi.reviewAsk.one": "запрос отзыва отправлен за последние 7 дней",
  "pi.reviewAsk.other": "запросов отзывов отправлено за последние 7 дней",
  "pi.reviewsCta": "Отзывы",
  "pi.officeLink": "Мои цифры, карта и клиенты",

  "hi.myHome": "Мой дом",
  "hi.myHomeSub": "Ваши специалисты ведут запись. Она принадлежит вам.",
  "hi.amountDue": "К оплате",
  "hi.item.one": "элемент",
  "hi.item.other": "элементов",
  "hi.pro.one": "специалист",
  "hi.pro.other": "специалистов",
  "hi.visit.one": "визит",
  "hi.visit.other": "визитов",
  "hi.allVerified": "всё подтверждено",
  "hi.recentActivity": "Недавняя активность",
  "hi.seeAll": "Смотреть все",
  "hi.recentEmpty": "Пока пусто. Когда специалист запишет работу, она появится здесь.",
  "hi.new": "Новое",
  "hi.serviceRecord": "Новая запись об обслуживании",
  "hi.serviceVisit": "Визит специалиста",
  "hi.yourPro": "Ваш специалист",
  "hi.onFile": "В картотеке",
  "hi.addSomething": "+ Добавить",
  "hi.equipment": "Оборудование",
  "hi.noDetails": "Пока без деталей",
  "hi.verified": "Подтверждено",
  "hi.selfAdded": "Добавлено вами",
  "hi.onFileEmpty": "Пока пусто. Записи от ваших специалистов появятся здесь.",
  "hi.comingUp": "Скоро",
  "hi.due": "к",
  "hi.remindMe": "Напомнить",
  "hi.allReminders": "Все напоминания",
  "hi.myPros": "Мои специалисты",
  "hi.noProsYet": "Пока специалистов нет.",
  "hi.rebook": "Записаться снова",
  "hi.paid": "Оплачено ✓",
  "hi.paymentComplete": "Оплата прошла",
  "hi.dueLabel": "Срок",
  "hi.overdue": "просрочено",
  "hi.noCards": "ещё не подключил приём карт.",
  "hi.pay": "Оплатить",
  "hi.makeComplete": "Дополните запись о доме",
  "hi.addAppliancesTitle": "Добавьте вашу технику",
  "hi.addAppliancesSub": "Гарантия и проверка отзывов начинаются с номера модели.",
  "hi.inviteProsTitle": "Пригласите других специалистов",
  "hi.inviteProsSub": "Каждый новый мастер делает историю дома полнее.",
  "hi.welcome": "Добро пожаловать",
  "hi.setUp": "Настроим ваш дом",
  "hi.setUpSub":
    "Укажите адрес, чтобы начать живую историю дома. Специалистов можно пригласить в любой момент.",
  "hi.addYourHome": "Добавьте ваш дом",
  "hi.homeAddress": "Адрес дома",
  "hi.homeAddressPh": "ул. Ленина 1, кв. 5, Москва",
  "hi.yourPhone": "Ваш телефон",
  "hi.phoneHintExisting": "Номер, с которым вы вошли. Измените, если он неверный.",
  "hi.phoneHintNew": "Чтобы ваши специалисты могли связаться. Необязательно.",
  "hi.phonePh": "+7 999 000-00-00",
  "hi.saving": "Сохранение…",
  "hi.addMyHome": "Добавить мой дом",
  "hi.orClaim": "Или подтвердите от специалиста",
  "hi.orClaimSub":
    "Если специалист прислал вам ссылку на запись, откройте её, чтобы подтвердить дом одним нажатием. Запись и техника перейдут вам.",
  "hi.loadingHome": "Загружаем ваш дом",
  // Pro setup checklist (dashboard card)
  "setup.finish": "Завершите настройку",
  "setup.of": "из",
  "setup.expand": "Развернуть список настройки",
  "setup.minimize": "Свернуть список настройки",
  "setup.item.business": "Название компании",
  "setup.item.trade": "Выберите свои специальности",
  "setup.item.service_area": "Зона обслуживания",
  "setup.item.phone": "Контактный телефон",

  "voice.justTalk": "Просто говорите, я всё заполню",
  "voice.tapToTalk": "Нажмите и говорите",
  "voice.building": "Составляем запись",
  "voice.reading": "Читаем, что вы сказали…",
  "voice.notMentioned": "Не упомянуто",
  "voice.cancel": "Отмена",
};

const uk: Partial<Record<TKey, string>> = {
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
  "login.proSent.post": ". Відкрийте його, і ви ввійдете.",
  "login.hoSent.pre": "Ми надіслали посилання для входу на адресу ",
  "login.hoSent.post": ". Відкрийте його, і ви ввійдете.",
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
  "pro.nav.dashboard": "Панель",

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

  "pi.greeting.morning": "Доброго ранку",
  "pi.greeting.afternoon": "Добрий день",
  "pi.greeting.evening": "Добрий вечір",
  "pi.youreAt": "Ви знаходитесь за адресою",
  "pi.logJob": "Записати роботу",
  "pi.logJob.subFirst": "Почніть із тієї, що вже зробили: 30 секунд.",
  "pi.logJob.sub": "30 секунд. Говоріть і натискайте.",
  "pi.whatsNext": "Що далі",
  "pi.allCaughtUp": "Усе зроблено",
  "pi.toSet": "до призначення",
  "pi.upcoming": "майбутніх",
  "pi.niceWeek": "Гарний тиждень",
  "pi.thisWeek": "Цього тижня",
  "pi.onGoogle": "у Google",
  "pi.reviewAsk.one": "запит на відгук надіслано за останні 7 днів",
  "pi.reviewAsk.other": "запитів на відгук надіслано за останні 7 днів",
  "pi.reviewsCta": "Відгуки",
  "pi.officeLink": "Мої цифри, карта і клієнти",

  "hi.myHome": "Мій дім",
  "hi.myHomeSub": "Ваші фахівці ведуть запис. Він належить вам.",
  "hi.amountDue": "До сплати",
  "hi.item.one": "елемент",
  "hi.item.other": "елементів",
  "hi.pro.one": "фахівець",
  "hi.pro.other": "фахівців",
  "hi.visit.one": "візит",
  "hi.visit.other": "візитів",
  "hi.allVerified": "усе підтверджено",
  "hi.recentActivity": "Нещодавня активність",
  "hi.seeAll": "Дивитись усі",
  "hi.recentEmpty": "Поки порожньо. Коли фахівець запише роботу, вона з’явиться тут.",
  "hi.new": "Нове",
  "hi.serviceRecord": "Новий запис про обслуговування",
  "hi.serviceVisit": "Візит фахівця",
  "hi.yourPro": "Ваш фахівець",
  "hi.onFile": "У картотеці",
  "hi.addSomething": "+ Додати",
  "hi.equipment": "Обладнання",
  "hi.noDetails": "Поки без деталей",
  "hi.verified": "Підтверджено",
  "hi.selfAdded": "Додано вами",
  "hi.onFileEmpty": "Поки порожньо. Записи від ваших фахівців з’являться тут.",
  "hi.comingUp": "Скоро",
  "hi.due": "до",
  "hi.remindMe": "Нагадати",
  "hi.allReminders": "Усі нагадування",
  "hi.myPros": "Мої фахівці",
  "hi.noProsYet": "Поки фахівців немає.",
  "hi.rebook": "Записатися знову",
  "hi.paid": "Сплачено ✓",
  "hi.paymentComplete": "Оплата пройшла",
  "hi.dueLabel": "Термін",
  "hi.overdue": "прострочено",
  "hi.noCards": "ще не підключив приймання карток.",
  "hi.pay": "Сплатити",
  "hi.makeComplete": "Доповніть запис про дім",
  "hi.addAppliancesTitle": "Додайте вашу техніку",
  "hi.addAppliancesSub": "Гарантія та перевірка відкликань починаються з номера моделі.",
  "hi.inviteProsTitle": "Запросіть інших фахівців",
  "hi.inviteProsSub": "Кожен новий майстер робить історію дому повнішою.",
  "hi.welcome": "Ласкаво просимо",
  "hi.setUp": "Налаштуємо ваш дім",
  "hi.setUpSub":
    "Додайте адресу, щоб почати живу історію дому. Фахівців можна запросити будь-коли.",
  "hi.addYourHome": "Додайте ваш дім",
  "hi.homeAddress": "Адреса дому",
  "hi.homeAddressPh": "вул. Хрещатик 1, кв. 5, Київ",
  "hi.yourPhone": "Ваш телефон",
  "hi.phoneHintExisting": "Номер, з яким ви ввійшли. Змініть, якщо він неправильний.",
  "hi.phoneHintNew": "Щоб ваші фахівці могли зв’язатися. Необов’язково.",
  "hi.phonePh": "+380 00 000 00 00",
  "hi.saving": "Зберігаємо…",
  "hi.addMyHome": "Додати мій дім",
  "hi.orClaim": "Або підтвердьте від фахівця",
  "hi.orClaimSub":
    "Якщо фахівець надіслав вам посилання на запис, відкрийте його, щоб підтвердити дім одним натисканням. Запис і техніка перейдуть до вас.",
  "hi.loadingHome": "Завантажуємо ваш дім",
  // Pro setup checklist (dashboard card)
  "setup.finish": "Завершіть налаштування",
  "setup.of": "з",
  "setup.expand": "Розгорнути список налаштування",
  "setup.minimize": "Згорнути список налаштування",
  "setup.item.business": "Назва компанії",
  "setup.item.trade": "Оберіть свої спеціальності",
  "setup.item.service_area": "Зона обслуговування",
  "setup.item.phone": "Контактний телефон",

  "voice.justTalk": "Просто говоріть, я все заповню",
  "voice.tapToTalk": "Натисніть і говоріть",
  "voice.building": "Складаємо запис",
  "voice.reading": "Читаємо, що ви сказали…",
  "voice.notMentioned": "Не згадано",
  "voice.cancel": "Скасувати",
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

/* Inline segmented language picker. Use inside a slide-over/drawer where a
   portalled DropdownMenu would render behind the overlay or be clipped. */
export function LanguageInlinePicker({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={`inline-flex items-center gap-1 rounded-full border border-line bg-soft p-1 ${className}`}
    >
      {LOCALES.map(({ code, short, label }) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setLocale(code)}
            className={`pressable rounded-full px-2.5 py-1 text-xs font-bold tracking-wide transition-colors ${
              active ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}

