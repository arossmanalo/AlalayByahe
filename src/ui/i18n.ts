// Member 3 (UI-001): interface strings in English and Filipino.
// Place names, service names and headsigns from data are never translated.
import type { ErrorCode, Mode, Priority, Reliability } from "../contracts";

export type UiLanguage = "en" | "fil";

type Passenger = "regular" | "student" | "senior" | "pwd";

const en = {
  appName: "AlalayByahe",
  languageLabel: "Language",
  languageNames: { en: "English", fil: "Filipino" } as Record<UiLanguage, string>,

  // Shared actions
  cancel: "Cancel",
  retry: "Try again",
  back: "Go back",
  close: "Close",
  edit: "Edit",
  continue: "Continue",
  loading: "Loading…",

  // Dev fixture banner
  devFixtureTitle: "DEV FIXTURE",
  devFixtureBody: "Test data only. These places, routes and fares are not real.",
  testPackWarning: "This transit data is a test fixture, not real transport information.",

  // Home
  homeTitle: "Where are you going?",
  homeIntro:
    "Type your trip in English, Filipino or Taglish. You will check every detail before we search verified routes.",
  queryLabel: "Your trip",
  queryHint: "Say where you are starting and where you are going.",
  queryPlaceholder: "e.g. Galing ako sa terminal, papuntang palengke, ayoko ng tricycle",
  charCount: (n: number, max: number) => `${n} / ${max} characters`,
  queryTooLong: (max: number) => `Please shorten your trip to ${max} characters.`,
  queryEmpty: "Type where you are starting and where you are going.",
  readTrip: "Read my trip",
  readingTrip: "Reading your trip on this phone…",
  chooseManually: "Choose places manually",
  alreadyRiding: "I'm already on a vehicle",
  aboutLink: "About, coverage and privacy",
  setupLink: "Setup and status",
  repeatLast: "Run this search again",
  aiUnavailableHome: "Local AI is not ready on this phone. You can still choose places manually.",
  setUpAi: "Set up local AI",

  // Readiness
  aiLabel: "Local AI",
  dataLabel: "Transit data",
  aiPhase: {
    absent: "Not downloaded",
    downloading: "Downloading",
    checking: "Checking file",
    initializing: "Starting",
    ready: "Ready",
    failed: "Unavailable",
  } as Record<"absent" | "downloading" | "checking" | "initializing" | "ready" | "failed", string>,
  dataReady: "Loaded",
  dataNotReady: "Not loaded",

  // Setup
  setupTitle: "Setup and status",
  modelSection: "Local AI model",
  modelAbsentBody: (size: string) =>
    `Not downloaded yet. Setup needs internet once and about ${size} of free storage. Wi-Fi is recommended.`,
  modelAbsentBodyUnknownSize:
    "Not downloaded yet. Setup needs internet once and free storage for the model file. Wi-Fi is recommended.",
  downloadModel: "Download and set up",
  modelDownloading: "Downloading the model…",
  modelProgress: (pct: number) => `${pct}% downloaded`,
  modelChecking: "Checking the downloaded file (SHA-256)…",
  modelInitializing: "Starting the model on this phone…",
  modelReady: (id: string) => `Ready (${id}).`,
  engineLabel: { phone_local: "Read by AI on this phone", laptop_local: "Read by AI on a laptop, not on this phone" } as Record<"phone_local" | "laptop_local", string>,
  modelDetails: (id: string, revision: string, license: string) =>
    `Model ${id}, revision ${revision.slice(0, 12)}, license ${license}`,
  dataSection: "Transit data",
  dataVersion: (version: string, created: string) => `Version ${version}, created ${created}`,
  coverageHeading: "Supported coverage",
  coverageNone: "No verified coverage is loaded.",
  offlineSection: "Offline and online",
  offlineBody:
    "After setup, trips between stored places work offline. New addresses and new walking paths may need internet.",
  onlineHelpersOff: "Online address lookup is off. Stored places still work.",
  onlineHelpersOn:
    "Online address lookup is available only when you ask for it. It sends the selected address or coordinates, never your typed conversation.",
  connectivityNote: "Being online does not make a route verified.",

  // Errors
  errorTitle: "Something needs attention",
  errorMessages: {
    AI_NOT_READY: "Local AI is not ready. You can choose places manually.",
    AI_INIT_FAILED: "Local AI could not start on this phone. You can choose places manually.",
    AI_INVALID_OUTPUT: "AI could not read that request. Try again or choose places.",
    AI_TIMEOUT: "AI took too long. You can choose places manually.",
    CANCELLED: "Cancelled.",
    INVALID_INPUT: "Enter an origin and destination.",
    NEEDS_CLARIFICATION: "Please confirm the journey fields.",
    PLACE_NOT_FOUND: "I could not identify that place. Choose it manually.",
    OUTSIDE_COVERAGE: "This place is outside our verified coverage.",
    NO_VERIFIED_JOURNEY: "No verified complete journey available.",
    CONSTRAINT_UNSATISFIED:
      "No journey matches all your preferences. A verified journey exists if you change them.",
    SEARCH_LIMIT_REACHED: "The search stopped at its limit. This does not mean there is no route.",
    DATA_NOT_READY: "Transit data is not loaded yet.",
    DATA_INVALID: "The transit data failed its checks and was not used.",
    STORAGE_FULL: "Your phone does not have enough free storage.",
    NETWORK_UNAVAILABLE: "Online lookup unavailable; stored places still work.",
    NETWORK_LIMIT: "Online lookup limit reached; stored places still work.",
    PERMISSION_DENIED: "Permission was not given. Choose places or services manually.",
  } as Record<ErrorCode, string>,
  engineMessage: "Details",
  editPreferences: "Change preferences",
  editPlaces: "Change places",

  // Confirm
  confirmTitle: "Check your trip",
  manualTitle: "Choose your trip",
  confirmIntro: "Check which place you are leaving and going to. Nothing is searched until you confirm.",
  manualIntro: "Pick stored places and preferences. Local AI is not used.",
  yourWords: "You typed",
  aiReadAs: (text: string) => `AI read this as “${text}”`,
  aiReadNothing: "AI did not find this in your words.",
  originHeading: "Starting place",
  destinationHeading: "Destination",
  originMissing: "Where are you starting?",
  destinationMissing: "Where do you want to go?",
  chooseOne: "Choose one",
  didYouMean: "Did you mean this place?",
  whichPlace: (name: string) => `Which “${name}” do you mean?`,
  noCandidates: "No matching stored place. Search below.",
  searchPlaces: "Search stored places",
  searchPlacesHint: "Type a place, terminal or landmark name",
  searchButton: "Search",
  searching: "Searching…",
  noSearchResults: "No stored place matches. Try another name.",
  selected: "Selected",
  matchKind: { exact: "exact match", alias: "known alias", fuzzy: "similar name" } as Record<
    "exact" | "alias" | "fuzzy",
    string
  >,
  swapPlaces: "Swap starting place and destination",
  currentLocationNote: "You mentioned your current location. Choose a starting place from the list.",
  samePlace: "These places match. Did you mean another branch?",
  ambiguitiesHeading: "AI was unsure about",
  preferencesHeading: "Preferences",
  preferencesStrict: "Preferences you set are strict. We will not relax them without asking you.",
  defaultTag: "default",
  fromYourWords: "from your words",
  modesLabel: "Allowed transport",
  modesNoneError: "Choose at least one type of transport. Your mode preferences conflict otherwise.",
  priorityLabel: "Show first",
  accessWalkLabel: "Max walk to first ride (meters)",
  transferWalkLabel: "Max walk between rides (meters)",
  egressWalkLabel: "Max walk after last ride (meters)",
  walkInvalid: "Enter a valid walking limit in whole meters.",
  directOnlyLabel: "Direct only (one ride, no transfers)",
  budgetLabel: "Budget in pesos (optional)",
  budgetHint: "Leave empty for no budget",
  budgetInvalid: "Enter a valid budget, like 50 or 50.50.",
  budgetUnknownNote: "A budget can only be checked when every fare is known.",
  passengerLabel: "Passenger type",
  findRoutes: "Find verified routes",
  planning: "Planning your journey…",
  resetForm: "Start over",

  // Results
  resultsTitle: "Journey options",
  resultsIntro: "Options come from stored, source-checked data. No live tracking.",
  optionLabel: (n: number) => `Option ${n}`,
  transfers: (n: number) => (n === 1 ? "1 transfer" : `${n} transfers`),
  walkTotal: (m: string) => `${m} walking`,
  whyThisOption: "Why this option",
  viewSteps: "View steps",
  boardFirst: (label: string) => `First ride from ${label}`,
  incompleteHidden: (n: number) =>
    n === 1
      ? "1 option was hidden because its instructions are incomplete."
      : `${n} options were hidden because their instructions are incomplete.`,
  incompleteAll: "Complete instructions are unavailable.",
  coverageWarnings: "Coverage notes",
  datasetLabel: (v: string) => `Data version ${v}`,
  noOptions: "No verified complete journey available.",
  editJourney: "Edit journey",
  newSearch: "New search",
  staleResult: "Your trip changed. Plan the updated journey.",

  // Fares
  fareLabel: "Fare",
  fareComplete: (amount: string) => `${amount} total`,
  fareCompleteRange: (range: string) => `${range} total`,
  farePartial: (subtotal: string, unknown: number) =>
    unknown === 1
      ? `Known subtotal ${subtotal} plus 1 ride with unknown fare`
      : `Known subtotal ${subtotal} plus ${unknown} rides with unknown fare`,
  fareUnknown: "Fare unknown",
  fareUnknownLegs: (n: number) => (n === 1 ? "1 ride has no known fare" : `${n} rides have no known fare`),
  fareReliability: { verified: "verified", estimated: "estimated", unknown: "unknown" } as Record<
    Reliability,
    string
  >,
  fareBasis: (basis: string) => `Basis: ${basis}`,
  fareNotTotal: "This is not the full total.",

  // Journey detail
  journeyTitle: "Journey steps",
  stepsHeading: "Journey steps",
  followSteps: "Follow the numbered steps.",
  stepN: (n: number) => `Step ${n}`,
  walkStep: (m: string) => `Walk ${m}`,
  walkFromTo: (from: string, to: string) => `From ${from} to ${to}`,
  walkTo: (to: string) => `To ${to}`,
  boardHere: "Board here",
  stayOnboard: "Stay on your current vehicle",
  rideOn: "Ride",
  directionSign: "Direction / signboard",
  getOffHere: "Get off here",
  checkDirection: "Check the vehicle direction before boarding.",
  confirmServiceFare: "Confirm current service and fare.",
  noTracking: "The app does not know where vehicles are or when they arrive.",
  evidenceHeading: "Sources and checks",
  checkedOn: (date: string) => `Checked ${date}`,
  reliabilityLabel: (r: string) => `Reliability: ${r}`,
  sourcesLabel: "Sources",
  warningsHeading: "Warnings",
  diagramHeading: "Route overview",
  diagramA11y: (summary: string) => `Route overview: ${summary}`,
  imOnThisVehicle: "I'm on this vehicle now",

  // Onboard
  onboardTitle: "I'm already riding",
  onboardIntro:
    "Tell us which vehicle you are on and the next stop ahead. The app does not track your vehicle; it plans from the stop you confirm.",
  onboardService: "Which service are you on?",
  onboardServiceHint: "Check the signboard or ask the driver or conductor.",
  onboardDirection: "Which direction is it going?",
  onboardNoDirections: "No documented direction for this service.",
  directionUnknownAvailability: "Availability not documented",
  onboardNextStop: "What is the next stop ahead?",
  onboardNextStopHint: "Choose the next stop you have not passed yet.",
  onboardNoStops: "No documented stops where you can get off in this direction.",
  onboardConfirm: (headsign: string, stop: string) =>
    `I confirm the vehicle is heading to ${headsign} and the next stop ahead is ${stop}.`,
  onboardDestination: "Where do you want to go?",
  onboardUnsure: "I don't know my vehicle or direction",
  onboardUnsureBody:
    "Do not get off just to check. Ask the driver or conductor. When you are at a known safe stop, plan a new trip from there.",
  planFromKnownStop: "Plan from a known stop",
  onboardCheckSign: "Check the signboard direction.",
  onboardWrongDirection:
    "If the signboard does not match, the vehicle may be going the other way. Stay on until a safe, legal stop, then plan from there.",
  onboardPlan: "Plan from my vehicle",
  noServices: "No services are loaded.",

  // About
  aboutTitle: "About AlalayByahe",
  aboutWhat:
    "AlalayByahe helps you plan commutes with jeepneys, buses, vans (UV), tricycles and LRT using stored, source-checked information.",
  aboutAi:
    "Your typed trip is read by an AI model running on this phone. The AI only reads your words; it never decides routes, boarding points or fares.",
  aboutRoutes:
    "Routes, directions and fares come from a stored transit dataset with sources and check dates.",
  aboutTracking: "There is no live tracking. The app does not know where vehicles are or when they arrive.",
  aboutFares: "Fares are marked verified, estimated or unknown. An unknown fare is never shown as ₱0.",
  aboutOffline:
    "After setup, trips between stored places work offline. New addresses and new walking paths may need internet.",
  aboutPrivacy:
    "Your typed trip stays on this phone. Optional online lookups send only a selected address or coordinates, and only when you ask.",
  modelHeading: "Local AI model",
  datasetHeading: "Transit data",

  // Labels
  modeNames: {
    van: "Van/UV",
    jeepney: "Jeepney",
    bus: "Bus",
    tricycle: "Tricycle",
    lrt: "LRT",
  } as Record<Mode, string>,
  walkName: "Walk",
  priorityNames: {
    nearest_useful: "Nearest useful boarding",
    fewest_transfers: "Fewest transfers",
    lowest_known_fare: "Lowest known fare",
  } as Record<Priority, string>,
  passengerNames: {
    regular: "Regular",
    student: "Student",
    senior: "Senior citizen",
    pwd: "PWD",
  } as Record<Passenger, string>,
};

export type Strings = typeof en;

const fil: Strings = {
  appName: "AlalayByahe",
  languageLabel: "Wika",
  languageNames: { en: "English", fil: "Filipino" },

  cancel: "Kanselahin",
  retry: "Subukan ulit",
  back: "Bumalik",
  close: "Isara",
  edit: "Baguhin",
  continue: "Ituloy",
  loading: "Naglo-load…",

  devFixtureTitle: "DEV FIXTURE",
  devFixtureBody: "Pang-test lang. Hindi totoo ang mga lugar, ruta at pamasaheng ito.",
  testPackWarning: "Pang-test ang transit data na ito, hindi totoong impormasyon sa biyahe.",

  homeTitle: "Saan ka pupunta?",
  homeIntro:
    "I-type ang biyahe mo sa Filipino, English o Taglish. Susuriin mo muna ang bawat detalye bago kami maghanap ng beripikadong ruta.",
  queryLabel: "Ang biyahe mo",
  queryHint: "Sabihin kung saan ka manggagaling at saan ka pupunta.",
  queryPlaceholder: "hal. Galing ako sa terminal, papuntang palengke, ayoko ng tricycle",
  charCount: (n, max) => `${n} / ${max} karakter`,
  queryTooLong: (max) => `Paikliin ang biyahe mo sa ${max} karakter.`,
  queryEmpty: "I-type kung saan ka manggagaling at saan ka pupunta.",
  readTrip: "Basahin ang biyahe ko",
  readingTrip: "Binabasa ang biyahe mo sa phone na ito…",
  chooseManually: "Pumili ng lugar nang mano-mano",
  alreadyRiding: "Nakasakay na ako",
  aboutLink: "Tungkol, sakop at privacy",
  setupLink: "Setup at status",
  repeatLast: "Hanapin ulit ito",
  aiUnavailableHome: "Hindi pa handa ang local AI sa phone na ito. Puwede ka pa ring pumili ng lugar nang mano-mano.",
  setUpAi: "I-setup ang local AI",

  aiLabel: "Local AI",
  dataLabel: "Transit data",
  aiPhase: {
    absent: "Hindi pa na-download",
    downloading: "Dina-download",
    checking: "Sinusuri ang file",
    initializing: "Sinisimulan",
    ready: "Handa",
    failed: "Hindi magamit",
  },
  dataReady: "Naka-load",
  dataNotReady: "Hindi naka-load",

  setupTitle: "Setup at status",
  modelSection: "Local AI model",
  modelAbsentBody: (size) =>
    `Hindi pa na-download. Kailangan ng internet nang isang beses at mga ${size} na libreng storage. Mas mainam ang Wi-Fi.`,
  modelAbsentBodyUnknownSize:
    "Hindi pa na-download. Kailangan ng internet nang isang beses at libreng storage para sa model file. Mas mainam ang Wi-Fi.",
  downloadModel: "I-download at i-setup",
  modelDownloading: "Dina-download ang model…",
  modelProgress: (pct) => `${pct}% na-download`,
  modelChecking: "Sinusuri ang na-download na file (SHA-256)…",
  modelInitializing: "Sinisimulan ang model sa phone na ito…",
  modelReady: (id) => `Handa na (${id}).`,
  engineLabel: { phone_local: "Binasa ng AI sa phone na ito", laptop_local: "Binasa ng AI sa laptop, hindi sa phone na ito" },
  modelDetails: (id, revision, license) =>
    `Model ${id}, revision ${revision.slice(0, 12)}, lisensya ${license}`,
  dataSection: "Transit data",
  dataVersion: (version, created) => `Bersyon ${version}, ginawa noong ${created}`,
  coverageHeading: "Sakop na suportado",
  coverageNone: "Walang naka-load na beripikadong sakop.",
  offlineSection: "Offline at online",
  offlineBody:
    "Pagkatapos ng setup, gumagana offline ang biyahe sa pagitan ng mga naka-save na lugar. Puwedeng kailanganin ang internet para sa bagong address at bagong lakaran.",
  onlineHelpersOff: "Naka-off ang online na paghahanap ng address. Gumagana pa rin ang mga naka-save na lugar.",
  onlineHelpersOn:
    "Gagamitin lang ang online na paghahanap ng address kapag hiniling mo. Ipapadala lang ang napiling address o coordinates, hindi ang tinype mo.",
  connectivityNote: "Hindi nagiging beripikado ang ruta dahil lang online ka.",

  errorTitle: "May kailangang ayusin",
  errorMessages: {
    AI_NOT_READY: "Hindi pa handa ang local AI. Puwede kang pumili ng lugar nang mano-mano.",
    AI_INIT_FAILED: "Hindi nasimulan ang local AI sa phone na ito. Puwede kang pumili ng lugar nang mano-mano.",
    AI_INVALID_OUTPUT: "Hindi nabasa ng AI ang hiling mo. Subukan ulit o pumili ng lugar.",
    AI_TIMEOUT: "Masyadong natagalan ang AI. Puwede kang pumili ng lugar nang mano-mano.",
    CANCELLED: "Kinansela.",
    INVALID_INPUT: "Ilagay kung saan ka manggagaling at saan ka pupunta.",
    NEEDS_CLARIFICATION: "Pakikumpirma ang mga detalye ng biyahe.",
    PLACE_NOT_FOUND: "Hindi ko matukoy ang lugar na iyon. Piliin ito nang mano-mano.",
    OUTSIDE_COVERAGE: "Labas sa beripikadong sakop namin ang lugar na ito.",
    NO_VERIFIED_JOURNEY: "Walang beripikado at kumpletong biyahe.",
    CONSTRAINT_UNSATISFIED:
      "Walang biyaheng tugma sa lahat ng kagustuhan mo. May beripikadong biyahe kung babaguhin mo ang mga ito.",
    SEARCH_LIMIT_REACHED: "Huminto ang paghahanap sa limitasyon nito. Hindi ibig sabihin na walang ruta.",
    DATA_NOT_READY: "Hindi pa naka-load ang transit data.",
    DATA_INVALID: "Hindi pumasa sa pagsusuri ang transit data kaya hindi ito ginamit.",
    STORAGE_FULL: "Kulang ang libreng storage ng phone mo.",
    NETWORK_UNAVAILABLE: "Hindi magamit ang online na paghahanap; gumagana pa rin ang mga naka-save na lugar.",
    NETWORK_LIMIT: "Naabot ang limitasyon ng online na paghahanap; gumagana pa rin ang mga naka-save na lugar.",
    PERMISSION_DENIED: "Hindi ibinigay ang pahintulot. Pumili ng lugar o serbisyo nang mano-mano.",
  },
  engineMessage: "Detalye",
  editPreferences: "Baguhin ang kagustuhan",
  editPlaces: "Baguhin ang mga lugar",

  confirmTitle: "Suriin ang biyahe mo",
  manualTitle: "Piliin ang biyahe mo",
  confirmIntro:
    "Suriin kung saan ka manggagaling at saan ka pupunta. Walang hahanapin hangga't hindi mo kinukumpirma.",
  manualIntro: "Pumili ng naka-save na lugar at kagustuhan. Hindi gagamitin ang local AI.",
  yourWords: "Tinype mo",
  aiReadAs: (text) => `Nabasa ng AI bilang “${text}”`,
  aiReadNothing: "Hindi ito nakita ng AI sa sinabi mo.",
  originHeading: "Manggagalingan",
  destinationHeading: "Pupuntahan",
  originMissing: "Saan ka manggagaling?",
  destinationMissing: "Saan mo gustong pumunta?",
  chooseOne: "Pumili ng isa",
  didYouMean: "Ito ba ang ibig mong sabihin?",
  whichPlace: (name) => `Aling “${name}” ang ibig mong sabihin?`,
  noCandidates: "Walang tugmang naka-save na lugar. Maghanap sa ibaba.",
  searchPlaces: "Maghanap ng naka-save na lugar",
  searchPlacesHint: "I-type ang pangalan ng lugar, terminal o landmark",
  searchButton: "Hanapin",
  searching: "Naghahanap…",
  noSearchResults: "Walang tugmang naka-save na lugar. Subukan ang ibang pangalan.",
  selected: "Napili",
  matchKind: { exact: "eksaktong tugma", alias: "kilalang ibang tawag", fuzzy: "kahawig na pangalan" },
  swapPlaces: "Pagpalitin ang manggagalingan at pupuntahan",
  currentLocationNote: "Binanggit mo ang kasalukuyan mong lokasyon. Pumili ng manggagalingan sa listahan.",
  samePlace: "Magkapareho ang mga lugar na ito. Ibang branch ba ang ibig mo?",
  ambiguitiesHeading: "Hindi sigurado ang AI tungkol sa",
  preferencesHeading: "Mga kagustuhan",
  preferencesStrict:
    "Mahigpit na susundin ang mga kagustuhang itinakda mo. Hindi namin ito luluwagan nang hindi ka tinatanong.",
  defaultTag: "default",
  fromYourWords: "mula sa sinabi mo",
  modesLabel: "Pinapayagang sasakyan",
  modesNoneError: "Pumili ng kahit isang uri ng sasakyan. Nagkakasalungat ang mga kagustuhan mo kung wala.",
  priorityLabel: "Unahing ipakita",
  accessWalkLabel: "Pinakamahabang lakad papunta sa unang sakay (metro)",
  transferWalkLabel: "Pinakamahabang lakad sa pagitan ng sakay (metro)",
  egressWalkLabel: "Pinakamahabang lakad pagkatapos ng huling sakay (metro)",
  walkInvalid: "Maglagay ng tamang limitasyon ng lakad sa buong metro.",
  directOnlyLabel: "Diretso lang (isang sakay, walang lipat)",
  budgetLabel: "Budget sa piso (opsyonal)",
  budgetHint: "Iwanang blangko kung walang budget",
  budgetInvalid: "Maglagay ng tamang budget, tulad ng 50 o 50.50.",
  budgetUnknownNote: "Masusuri lang ang budget kapag alam ang lahat ng pamasahe.",
  passengerLabel: "Uri ng pasahero",
  findRoutes: "Hanapin ang beripikadong ruta",
  planning: "Pinaplano ang biyahe mo…",
  resetForm: "Magsimula ulit",

  resultsTitle: "Mga opsyon sa biyahe",
  resultsIntro: "Galing sa naka-save at sinuring datos ang mga opsyon. Walang live tracking.",
  optionLabel: (n) => `Opsyon ${n}`,
  transfers: (n) => (n === 1 ? "1 lipat" : `${n} lipat`),
  walkTotal: (m) => `${m} lakad`,
  whyThisOption: "Bakit ito",
  viewSteps: "Tingnan ang mga hakbang",
  boardFirst: (label) => `Unang sakay sa ${label}`,
  incompleteHidden: (n) =>
    n === 1
      ? "Itinago ang 1 opsyon dahil kulang ang mga tagubilin nito."
      : `Itinago ang ${n} opsyon dahil kulang ang mga tagubilin nila.`,
  incompleteAll: "Walang kumpletong tagubilin.",
  coverageWarnings: "Tungkol sa sakop",
  datasetLabel: (v) => `Bersyon ng datos ${v}`,
  noOptions: "Walang beripikado at kumpletong biyahe.",
  editJourney: "Baguhin ang biyahe",
  newSearch: "Bagong paghahanap",
  staleResult: "Nagbago ang biyahe mo. Planuhin ang bagong biyahe.",

  fareLabel: "Pamasahe",
  fareComplete: (amount) => `${amount} kabuuan`,
  fareCompleteRange: (range) => `${range} kabuuan`,
  farePartial: (subtotal, unknown) =>
    unknown === 1
      ? `Alam na subtotal ${subtotal} at 1 sakay na hindi alam ang pamasahe`
      : `Alam na subtotal ${subtotal} at ${unknown} sakay na hindi alam ang pamasahe`,
  fareUnknown: "Hindi alam ang pamasahe",
  fareUnknownLegs: (n) => (n === 1 ? "1 sakay ang walang alam na pamasahe" : `${n} sakay ang walang alam na pamasahe`),
  fareReliability: { verified: "beripikado", estimated: "tantiya", unknown: "hindi alam" },
  fareBasis: (basis) => `Batayan: ${basis}`,
  fareNotTotal: "Hindi ito ang buong kabuuan.",

  journeyTitle: "Mga hakbang",
  stepsHeading: "Mga hakbang sa biyahe",
  followSteps: "Sundin ang mga hakbang ayon sa numero.",
  stepN: (n) => `Hakbang ${n}`,
  walkStep: (m) => `Maglakad nang ${m}`,
  walkFromTo: (from, to) => `Mula ${from} papuntang ${to}`,
  walkTo: (to) => `Papuntang ${to}`,
  boardHere: "Sumakay dito",
  stayOnboard: "Manatili sa sinasakyan mo",
  rideOn: "Sumakay ng",
  directionSign: "Direksyon / karatula",
  getOffHere: "Bumaba dito",
  checkDirection: "Tingnan ang direksyon ng sasakyan bago sumakay.",
  confirmServiceFare: "Kumpirmahin ang kasalukuyang serbisyo at pamasahe.",
  noTracking: "Hindi alam ng app kung nasaan ang mga sasakyan o kailan sila darating.",
  evidenceHeading: "Mga source at pagsusuri",
  checkedOn: (date) => `Sinuri noong ${date}`,
  reliabilityLabel: (r) => `Katiyakan: ${r}`,
  sourcesLabel: "Mga source",
  warningsHeading: "Mga babala",
  diagramHeading: "Buod ng ruta",
  diagramA11y: (summary) => `Buod ng ruta: ${summary}`,
  imOnThisVehicle: "Nakasakay na ako rito",

  onboardTitle: "Nakasakay na ako",
  onboardIntro:
    "Sabihin kung anong sasakyan ang sinasakyan mo at ang susunod na hintuan. Hindi sinusubaybayan ng app ang sasakyan mo; nagpaplano ito mula sa hintuang kinumpirma mo.",
  onboardService: "Anong serbisyo ang sinasakyan mo?",
  onboardServiceHint: "Tingnan ang karatula o tanungin ang driver o konduktor.",
  onboardDirection: "Saan ito papunta?",
  onboardNoDirections: "Walang dokumentadong direksyon para sa serbisyong ito.",
  directionUnknownAvailability: "Hindi dokumentado kung available",
  onboardNextStop: "Ano ang susunod na hintuan?",
  onboardNextStopHint: "Piliin ang susunod na hintuang hindi mo pa nadadaanan.",
  onboardNoStops: "Walang dokumentadong babaan sa direksyong ito.",
  onboardConfirm: (headsign, stop) =>
    `Kinukumpirma ko na papunta ang sasakyan sa ${headsign} at ang susunod na hintuan ay ${stop}.`,
  onboardDestination: "Saan mo gustong pumunta?",
  onboardUnsure: "Hindi ko alam ang sasakyan o direksyon ko",
  onboardUnsureBody:
    "Huwag bumaba para lang tumingin. Magtanong sa driver o konduktor. Kapag nasa kilala at ligtas na hintuan ka na, magplano ng bagong biyahe mula roon.",
  planFromKnownStop: "Magplano mula sa kilalang hintuan",
  onboardCheckSign: "Tingnan ang direksyon sa karatula.",
  onboardWrongDirection:
    "Kung hindi tugma ang karatula, baka pabalik ang sasakyan. Manatiling nakasakay hanggang sa ligtas at legal na hintuan, saka magplano mula roon.",
  onboardPlan: "Magplano mula sa sinasakyan ko",
  noServices: "Walang naka-load na serbisyo.",

  aboutTitle: "Tungkol sa AlalayByahe",
  aboutWhat:
    "Tinutulungan ka ng AlalayByahe na magplano ng biyahe sa jeep, bus, van (UV), tricycle at LRT gamit ang naka-save at sinuring impormasyon.",
  aboutAi:
    "Binabasa ng AI model na tumatakbo sa phone na ito ang tinype mong biyahe. Binabasa lang ng AI ang sinabi mo; hindi ito nagpapasya ng ruta, sakayan o pamasahe.",
  aboutRoutes:
    "Galing ang mga ruta, direksyon at pamasahe sa naka-save na transit dataset na may mga source at petsa ng pagsusuri.",
  aboutTracking: "Walang live tracking. Hindi alam ng app kung nasaan ang mga sasakyan o kailan sila darating.",
  aboutFares:
    "Minamarkahan ang pamasahe bilang beripikado, tantiya o hindi alam. Hindi kailanman ipinapakitang ₱0 ang hindi alam na pamasahe.",
  aboutOffline:
    "Pagkatapos ng setup, gumagana offline ang biyahe sa pagitan ng mga naka-save na lugar. Puwedeng kailanganin ang internet para sa bagong address at bagong lakaran.",
  aboutPrivacy:
    "Nananatili sa phone na ito ang tinype mong biyahe. Ang opsyonal na online na paghahanap ay nagpapadala lang ng napiling address o coordinates, at kapag hiniling mo lang.",
  modelHeading: "Local AI model",
  datasetHeading: "Transit data",

  modeNames: { van: "Van/UV", jeepney: "Jeep", bus: "Bus", tricycle: "Tricycle", lrt: "LRT" },
  walkName: "Lakad",
  priorityNames: {
    nearest_useful: "Pinakamalapit na magagamit na sakayan",
    fewest_transfers: "Pinakakaunting lipat",
    lowest_known_fare: "Pinakamababang alam na pamasahe",
  },
  passengerNames: { regular: "Regular", student: "Estudyante", senior: "Senior citizen", pwd: "PWD" },
};

export const strings: Record<UiLanguage, Strings> = { en, fil };
