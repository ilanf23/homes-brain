import { isLocale, type Locale } from "@/lib/i18n";

export type CustomerPreviewCopy = {
  language: string;
  languageHelp: string;
  translating: string;
  fallbackTitle: string;
  fallbackBody: string;
  serviceRecord: string;
  address: string;
  customer: string;
  equipment: string;
  makeModel: string;
  workDone: string;
  nextService: string;
  video: string;
  photo: string;
  email: string;
  emailInvalid: string;
  emailHelp: string;
  sendRecord: string;
};

export const CUSTOMER_PREVIEW_COPY: Record<Locale, CustomerPreviewCopy> = {
  en: {
    language: "Customer language",
    languageHelp:
      "The email and linked record will use this language. This choice is remembered for the customer.",
    translating: "Translating the customer message…",
    fallbackTitle: "Translation is unavailable",
    fallbackBody: "This message will be sent entirely in English.",
    serviceRecord: "Service record",
    address: "Address",
    customer: "Customer",
    equipment: "Equipment",
    makeModel: "Make / Model",
    workDone: "Work done",
    nextService: "Next service",
    video: "Video",
    photo: "Photo",
    email: "Customer email *",
    emailInvalid: "Enter a valid email address.",
    emailHelp: "The service record will be sent here.",
    sendRecord: "Send record",
  },
  es: {
    language: "Idioma del cliente",
    languageHelp:
      "El correo y el registro enlazado usarán este idioma. Recordaremos esta opción para el cliente.",
    translating: "Traduciendo el mensaje para el cliente…",
    fallbackTitle: "La traducción no está disponible",
    fallbackBody: "Este mensaje se enviará completamente en inglés.",
    serviceRecord: "Registro de servicio",
    address: "Dirección",
    customer: "Cliente",
    equipment: "Equipo",
    makeModel: "Marca / Modelo",
    workDone: "Trabajo realizado",
    nextService: "Próximo servicio",
    video: "Video",
    photo: "Foto",
    email: "Correo del cliente *",
    emailInvalid: "Ingresa un correo electrónico válido.",
    emailHelp: "El registro de servicio se enviará aquí.",
    sendRecord: "Enviar registro",
  },
  ru: {
    language: "Язык клиента",
    languageHelp:
      "Письмо и запись по ссылке будут на этом языке. Мы запомним выбор для этого клиента.",
    translating: "Переводим сообщение для клиента…",
    fallbackTitle: "Перевод недоступен",
    fallbackBody: "Это сообщение будет полностью отправлено на английском языке.",
    serviceRecord: "Запись об обслуживании",
    address: "Адрес",
    customer: "Клиент",
    equipment: "Оборудование",
    makeModel: "Марка / Модель",
    workDone: "Выполненные работы",
    nextService: "Следующее обслуживание",
    video: "Видео",
    photo: "Фото",
    email: "Электронная почта клиента *",
    emailInvalid: "Введите действительный адрес электронной почты.",
    emailHelp: "Сюда будет отправлена запись об обслуживании.",
    sendRecord: "Отправить запись",
  },
  uk: {
    language: "Мова клієнта",
    languageHelp:
      "Лист і запис за посиланням будуть цією мовою. Ми запам’ятаємо вибір для цього клієнта.",
    translating: "Перекладаємо повідомлення для клієнта…",
    fallbackTitle: "Переклад недоступний",
    fallbackBody: "Це повідомлення буде повністю надіслано англійською мовою.",
    serviceRecord: "Запис про обслуговування",
    address: "Адреса",
    customer: "Клієнт",
    equipment: "Обладнання",
    makeModel: "Марка / Модель",
    workDone: "Виконані роботи",
    nextService: "Наступне обслуговування",
    video: "Відео",
    photo: "Фото",
    email: "Електронна пошта клієнта *",
    emailInvalid: "Введіть дійсну електронну адресу.",
    emailHelp: "Сюди буде надіслано запис про обслуговування.",
    sendRecord: "Надіслати запис",
  },
};

export function customerPreviewCopy(locale: unknown): CustomerPreviewCopy {
  return CUSTOMER_PREVIEW_COPY[isLocale(locale) ? locale : "en"];
}

export type ClaimCopy = {
  yourServicePro: string;
  via: string;
  newServiceRecord: string;
  recordAddedBy: (business: string) => string;
  recordAddedGeneric: string;
  address: string;
  workDone: string;
  equipment: string;
  warranty: string;
  through: (date: string) => string;
  settingUp: string;
  openingRecord: string;
  confirmTitle: string;
  confirmBody: string;
  email: string;
  opening: string;
  claimRecord: string;
  expiredTitle: string;
  usedTitle: string;
  cannotOpenTitle: string;
  usedBody: string;
  expiredBody: string;
  cannotOpenBody: string;
  freshLink: string;
  alreadyClaimedTitle: string;
  alreadyClaimedBody: string;
  goDashboard: string;
};

const CLAIM_COPY: Record<Locale, ClaimCopy> = {
  en: {
    yourServicePro: "Your service pro",
    via: "via HomesBrain",
    newServiceRecord: "New service record",
    recordAddedBy: (business) => `${business} added a record to your home`,
    recordAddedGeneric: "A record was added to your home",
    address: "Address",
    workDone: "Work done",
    equipment: "Equipment",
    warranty: "Warranty",
    through: (date) => `Through ${date}`,
    settingUp: "Setting up your home",
    openingRecord: "Opening your record",
    confirmTitle: "Confirm your email to claim",
    confirmBody:
      "Enter the email your service pro has for you. We'll open your record and save this home to your account.",
    email: "Email",
    opening: "Opening…",
    claimRecord: "Claim my home record",
    expiredTitle: "This link has expired",
    usedTitle: "This link was already used",
    cannotOpenTitle: "We couldn't open this link",
    usedBody:
      "For security, each claim link only works once. We can send a fresh one to your inbox.",
    expiredBody:
      "Links expire after 7 days for security. Get a fresh one and we'll still take you straight to your record.",
    cannotOpenBody: "Try a fresh link and we'll take you straight to your record.",
    freshLink: "Send a fresh link",
    alreadyClaimedTitle: "This home is already claimed",
    alreadyClaimedBody:
      "Another account already owns this home's record book. If this is your home, ask your service pro to help sort it out.",
    goDashboard: "Go to my dashboard",
  },
  es: {
    yourServicePro: "Tu profesional de servicio",
    via: "a través de HomesBrain",
    newServiceRecord: "Nuevo registro de servicio",
    recordAddedBy: (business) => `${business} agregó un registro a tu hogar`,
    recordAddedGeneric: "Se agregó un registro a tu hogar",
    address: "Dirección",
    workDone: "Trabajo realizado",
    equipment: "Equipo",
    warranty: "Garantía",
    through: (date) => `Hasta ${date}`,
    settingUp: "Preparando tu hogar",
    openingRecord: "Abriendo tu registro",
    confirmTitle: "Confirma tu correo para reclamarlo",
    confirmBody:
      "Ingresa el correo que tiene tu profesional. Abriremos tu registro y guardaremos este hogar en tu cuenta.",
    email: "Correo electrónico",
    opening: "Abriendo…",
    claimRecord: "Reclamar el registro de mi hogar",
    expiredTitle: "Este enlace expiró",
    usedTitle: "Este enlace ya se usó",
    cannotOpenTitle: "No pudimos abrir este enlace",
    usedBody:
      "Por seguridad, cada enlace funciona una sola vez. Podemos enviarte uno nuevo por correo.",
    expiredBody:
      "Por seguridad, los enlaces expiran después de 7 días. Solicita uno nuevo para ir directamente a tu registro.",
    cannotOpenBody: "Solicita un enlace nuevo para ir directamente a tu registro.",
    freshLink: "Enviar un enlace nuevo",
    alreadyClaimedTitle: "Este hogar ya fue reclamado",
    alreadyClaimedBody:
      "Otra cuenta ya es dueña del registro de este hogar. Si es tu hogar, pide ayuda a tu profesional de servicio.",
    goDashboard: "Ir a mi panel",
  },
  ru: {
    yourServicePro: "Ваш специалист",
    via: "через HomesBrain",
    newServiceRecord: "Новая запись об обслуживании",
    recordAddedBy: (business) => `${business} добавил запись для вашего дома`,
    recordAddedGeneric: "Для вашего дома добавлена запись",
    address: "Адрес",
    workDone: "Выполненные работы",
    equipment: "Оборудование",
    warranty: "Гарантия",
    through: (date) => `До ${date}`,
    settingUp: "Настраиваем ваш дом",
    openingRecord: "Открываем запись",
    confirmTitle: "Подтвердите email, чтобы получить запись",
    confirmBody:
      "Введите адрес электронной почты, который вы сообщили специалисту. Мы откроем запись и сохраним дом в вашем аккаунте.",
    email: "Электронная почта",
    opening: "Открываем…",
    claimRecord: "Получить запись о моём доме",
    expiredTitle: "Срок действия ссылки истёк",
    usedTitle: "Эта ссылка уже использована",
    cannotOpenTitle: "Не удалось открыть ссылку",
    usedBody:
      "В целях безопасности ссылка работает только один раз. Мы можем отправить новую на вашу почту.",
    expiredBody:
      "В целях безопасности ссылки действуют 7 дней. Запросите новую, и мы откроем нужную запись.",
    cannotOpenBody: "Запросите новую ссылку, и мы откроем нужную запись.",
    freshLink: "Отправить новую ссылку",
    alreadyClaimedTitle: "Этот дом уже привязан к другому аккаунту",
    alreadyClaimedBody:
      "Записи этого дома уже принадлежат другому аккаунту. Если это ваш дом, обратитесь к вашему специалисту.",
    goDashboard: "Перейти в мой кабинет",
  },
  uk: {
    yourServicePro: "Ваш фахівець",
    via: "через HomesBrain",
    newServiceRecord: "Новий запис про обслуговування",
    recordAddedBy: (business) => `${business} додав запис для вашого дому`,
    recordAddedGeneric: "Для вашого дому додано запис",
    address: "Адреса",
    workDone: "Виконані роботи",
    equipment: "Обладнання",
    warranty: "Гарантія",
    through: (date) => `До ${date}`,
    settingUp: "Налаштовуємо ваш дім",
    openingRecord: "Відкриваємо запис",
    confirmTitle: "Підтвердьте email, щоб отримати запис",
    confirmBody:
      "Введіть електронну адресу, яку ви повідомили фахівцю. Ми відкриємо запис і збережемо дім у вашому обліковому записі.",
    email: "Електронна пошта",
    opening: "Відкриваємо…",
    claimRecord: "Отримати запис про мій дім",
    expiredTitle: "Термін дії посилання минув",
    usedTitle: "Це посилання вже використано",
    cannotOpenTitle: "Не вдалося відкрити посилання",
    usedBody:
      "З міркувань безпеки посилання працює лише один раз. Ми можемо надіслати нове на вашу пошту.",
    expiredBody:
      "З міркувань безпеки посилання діють 7 днів. Запросіть нове, і ми відкриємо потрібний запис.",
    cannotOpenBody: "Запросіть нове посилання, і ми відкриємо потрібний запис.",
    freshLink: "Надіслати нове посилання",
    alreadyClaimedTitle: "Цей дім уже привʼязано до іншого акаунта",
    alreadyClaimedBody:
      "Записи цього дому вже належать іншому акаунту. Якщо це ваш дім, зверніться до вашого фахівця.",
    goDashboard: "Перейти до мого кабінету",
  },
};

export function claimCopy(locale: unknown): ClaimCopy {
  return CLAIM_COPY[isLocale(locale) ? locale : "en"];
}

export type HomeRecordCopy = {
  loadingRecord: string;
  settingUp: string;
  notFound: string;
  notOnHome: string;
  backHome: string;
  myHome: string;
  serviceRecord: string;
  verified: string;
  details: string;
  address: string;
  workDone: string;
  date: string;
  nextService: string;
  servicedBy: string;
  yourPro: string;
  invoice: string;
  paid: string;
  overdue: string;
  open: string;
  total: string;
  due: (date: string) => string;
  pay: (amount: string) => string;
  paymentsOff: (business: string) => string;
  paymentError: string;
  paidOn: (date: string) => string;
  equipment: string;
  item: string;
  serial: string;
  warranty: string;
  until: (date: string) => string;
  recall: string;
  noKnownRecalls: string;
  openItemHistory: string;
  videoFromPro: string;
  downloadVideo: string;
  jobPhoto: string;
};

const HOME_RECORD_COPY: Record<Locale, HomeRecordCopy> = {
  en: {
    loadingRecord: "Loading record",
    settingUp: "Setting up your home",
    notFound: "Record not found",
    notOnHome: "This record isn't on your home.",
    backHome: "Back to my home",
    myHome: "My home",
    serviceRecord: "Service record",
    verified: "Verified",
    details: "Details",
    address: "Address",
    workDone: "Work done",
    date: "Date",
    nextService: "Next service",
    servicedBy: "Serviced by",
    yourPro: "Your pro",
    invoice: "Invoice",
    paid: "Paid",
    overdue: "Overdue",
    open: "Open",
    total: "Total",
    due: (date) => `Due ${date}`,
    pay: (amount) => `Pay ${amount}`,
    paymentsOff: (business) => `${business} hasn't turned on card payments yet.`,
    paymentError: "Couldn't start payment.",
    paidOn: (date) => `Paid ${date}`,
    equipment: "Equipment",
    item: "Item",
    serial: "Serial",
    warranty: "Warranty",
    until: (date) => `Until ${date}`,
    recall: "Recall",
    noKnownRecalls: "No known recalls",
    openItemHistory: "Open item history",
    videoFromPro: "A video from your pro",
    downloadVideo: "Download the video",
    jobPhoto: "Job photo",
  },
  es: {
    loadingRecord: "Cargando registro",
    settingUp: "Preparando tu hogar",
    notFound: "Registro no encontrado",
    notOnHome: "Este registro no pertenece a tu hogar.",
    backHome: "Volver a mi hogar",
    myHome: "Mi hogar",
    serviceRecord: "Registro de servicio",
    verified: "Verificado",
    details: "Detalles",
    address: "Dirección",
    workDone: "Trabajo realizado",
    date: "Fecha",
    nextService: "Próximo servicio",
    servicedBy: "Servicio realizado por",
    yourPro: "Tu profesional",
    invoice: "Factura",
    paid: "Pagada",
    overdue: "Vencida",
    open: "Pendiente",
    total: "Total",
    due: (date) => `Vence el ${date}`,
    pay: (amount) => `Pagar ${amount}`,
    paymentsOff: (business) => `${business} aún no activó los pagos con tarjeta.`,
    paymentError: "No se pudo iniciar el pago.",
    paidOn: (date) => `Pagada el ${date}`,
    equipment: "Equipo",
    item: "Artículo",
    serial: "Número de serie",
    warranty: "Garantía",
    until: (date) => `Hasta ${date}`,
    recall: "Retirada",
    noKnownRecalls: "No hay retiradas conocidas",
    openItemHistory: "Abrir historial del equipo",
    videoFromPro: "Un video de tu profesional",
    downloadVideo: "Descargar el video",
    jobPhoto: "Foto del trabajo",
  },
  ru: {
    loadingRecord: "Загружаем запись",
    settingUp: "Настраиваем ваш дом",
    notFound: "Запись не найдена",
    notOnHome: "Эта запись не относится к вашему дому.",
    backHome: "Вернуться к моему дому",
    myHome: "Мой дом",
    serviceRecord: "Запись об обслуживании",
    verified: "Подтверждено",
    details: "Подробности",
    address: "Адрес",
    workDone: "Выполненные работы",
    date: "Дата",
    nextService: "Следующее обслуживание",
    servicedBy: "Обслуживание выполнил",
    yourPro: "Ваш специалист",
    invoice: "Счёт",
    paid: "Оплачен",
    overdue: "Просрочен",
    open: "Открыт",
    total: "Итого",
    due: (date) => `Оплатить до ${date}`,
    pay: (amount) => `Оплатить ${amount}`,
    paymentsOff: (business) => `${business} ещё не подключил оплату картой.`,
    paymentError: "Не удалось начать оплату.",
    paidOn: (date) => `Оплачен ${date}`,
    equipment: "Оборудование",
    item: "Устройство",
    serial: "Серийный номер",
    warranty: "Гарантия",
    until: (date) => `До ${date}`,
    recall: "Отзыв",
    noKnownRecalls: "Известных отзывов нет",
    openItemHistory: "Открыть историю устройства",
    videoFromPro: "Видео от вашего мастера",
    downloadVideo: "Скачать видео",
    jobPhoto: "Фото работы",
  },
  uk: {
    loadingRecord: "Завантажуємо запис",
    settingUp: "Налаштовуємо ваш дім",
    notFound: "Запис не знайдено",
    notOnHome: "Цей запис не належить до вашого дому.",
    backHome: "Повернутися до мого дому",
    myHome: "Мій дім",
    serviceRecord: "Запис про обслуговування",
    verified: "Підтверджено",
    details: "Подробиці",
    address: "Адреса",
    workDone: "Виконані роботи",
    date: "Дата",
    nextService: "Наступне обслуговування",
    servicedBy: "Обслуговування виконав",
    yourPro: "Ваш фахівець",
    invoice: "Рахунок",
    paid: "Сплачено",
    overdue: "Прострочено",
    open: "Відкрито",
    total: "Разом",
    due: (date) => `Сплатити до ${date}`,
    pay: (amount) => `Сплатити ${amount}`,
    paymentsOff: (business) => `${business} ще не підключив оплату карткою.`,
    paymentError: "Не вдалося розпочати оплату.",
    paidOn: (date) => `Сплачено ${date}`,
    equipment: "Обладнання",
    item: "Пристрій",
    serial: "Серійний номер",
    warranty: "Гарантія",
    until: (date) => `До ${date}`,
    recall: "Відкликання",
    noKnownRecalls: "Відомих відкликань немає",
    openItemHistory: "Відкрити історію пристрою",
    videoFromPro: "Відео від вашого майстра",
    downloadVideo: "Завантажити відео",
    jobPhoto: "Фото роботи",
  },
};

export function homeRecordCopy(locale: unknown): HomeRecordCopy {
  return HOME_RECORD_COPY[isLocale(locale) ? locale : "en"];
}
