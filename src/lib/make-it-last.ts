/* Data for /make-it-last/[slug] guides. One record per slug, all copy owned
   here so the route file stays a pure template. */

export type Fact = { k: string; v: string };
export type Impact = "High" | "Medium" | "Low";
export type MaintenanceStep = { task: string; frequency: string; effect: string; impact?: Impact };
export type Source = { label: string; url: string };
export type Brand = { name: string; note: string; sourceUrl: string; sourceLabel: string };
export type Faq = { q: string; a: string };

export type Guide = {
  slug: string;
  label: string;
  h1: string;
  metaDescription: string;
  quickAnswer: string;
  overview?: string;
  neglected: number; // years, "left alone"
  maintained: number; // years, "maintained"
  barsLabel?: string; // optional label shown on bars (e.g. "the pump" for pool)
  brands?: Brand[];
  maintenance: MaintenanceStep[];
  signs?: string[];
  repairOrReplace?: string;
  facts: Fact[];
  faqs?: Faq[];
  floridaNote: string;
  sources: Source[];
  /* Prominent verify-specifics note on top of the standard disclaimer. */
  verifyProminent?: boolean;
};


export const GUIDES: Record<string, Guide> = {
  "water-heater": {
    slug: "water-heater",
    label: "Water heater",
    h1: "How long does a water heater last, and how do you make it last longer?",
    metaDescription:
      "A standard tank water heater lasts about 8 to 12 years, and 15+ with a yearly flush and anode-rod replacement. Full maintenance guide.",
    quickAnswer:
      "A standard tank water heater lasts about 8 to 12 years. With a yearly flush and the anode rod replaced every 3 to 5 years, many reach 15 or more. Florida hard water is why the neglected end comes fast.",
    overview:
      "A tank water heater is the appliance most punished by Florida hard water. The gap between a neglected unit and a maintained one is bigger here than almost anywhere, and the maintenance is cheap and simple. Here is how long it lasts, what actually extends it, and the brands pros trust.",
    neglected: 10,
    maintained: 15,
    brands: [
      { name: "Bradford White", note: "Pro favorite, sold only through contractors, top rated for reliability.", sourceUrl: "https://waterheaterdocs.com/blog/best-water-heater-brands-comparison", sourceLabel: "Water Heater Docs: best brands compared" },
      { name: "A.O. Smith", note: "Long lasting and corrosion resistant, strong warranties.", sourceUrl: "https://waterheaterdocs.com/blog/best-water-heater-brands-comparison", sourceLabel: "Water Heater Docs: best brands compared" },
      { name: "Rheem", note: "Dependable and widely available, Performance Platinum adds leak detection.", sourceUrl: "https://waterheaterdocs.com/blog/best-water-heater-brands-comparison", sourceLabel: "Water Heater Docs: best brands compared" },
      { name: "Rinnai", note: "The leader if you go tankless, premium and long warranties.", sourceUrl: "https://waterheaterdocs.com/blog/best-water-heater-brands-comparison", sourceLabel: "Water Heater Docs: best brands compared" },
    ],
    maintenance: [
      { task: "Flush the tank", frequency: "Yearly", effect: "Clears sediment and protects efficiency.", impact: "High" },
      { task: "Inspect and replace the anode rod", frequency: "Every 3 to 5 years", effect: "This is what stops the tank from rusting through.", impact: "High" },
      { task: "Set the temperature to 120°F", frequency: "Once", effect: "Safer and easier on the tank.", impact: "Low" },
      { task: "Consider a water softener", frequency: "If you have hard water", effect: "Slows scale and adds years to the tank.", impact: "Medium" },
    ],
    signs: [
      "Rusty or discolored hot water",
      "Popping or rumbling from the tank",
      "Water pooling around the base",
      "Running out of hot water sooner than it used to",
    ],
    repairOrReplace:
      "Under 8 years, most issues are worth repairing. Past 10 to 12, or if the tank itself is leaking, replace it, a leaking tank cannot be fixed.",
    facts: [
      { k: "Expected life", v: "8 to 15+ years" },
      { k: "Typical warranty", v: "6 to 12 years" },
      { k: "Common failure", v: "Tank corrosion" },
      { k: "Replacement cost", v: "~$1,200 to $2,500 installed" },
      { k: "Recall status", v: "Check by model and serial" },
    ],
    faqs: [
      { q: "How often should I flush my water heater?", a: "Once a year, and more often in Florida hard water, to clear the sediment that eats efficiency and life." },
      { q: "Does a tankless water heater last longer?", a: "Yes, tankless units often last 20 years or more versus 8 to 12 for a tank, though they cost more up front." },
      { q: "Is replacing the anode rod really worth it?", a: "Yes. The rod sacrifices itself so the tank does not rust through. Replacing it every 3 to 5 years is the cheapest way to add years." },
      { q: "What are the signs my water heater is failing?", a: "Rusty water, popping or rumbling, leaks at the base, or not enough hot water." },
      { q: "How much does a new water heater cost?", a: "Roughly $1,200 to $2,500 installed for a standard tank, more for tankless." },
    ],
    floridaNote:
      "Florida hard water speeds sediment buildup and corrosion, so flushing and anode-rod care matter more here than in most of the country.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
      { label: "Bob Vila: anode rod replacement", url: "https://www.bobvila.com/articles/anode-rod-replacement/" },
      { label: "This Old House: change a water heater anode rod", url: "https://www.thisoldhouse.com/plumbing/21017262/how-to-change-a-water-heater-anode-rod" },
      { label: "Water Heater Docs: best brands compared", url: "https://waterheaterdocs.com/blog/best-water-heater-brands-comparison" },
    ],

  },

  "central-ac": {
    slug: "central-ac",
    label: "Central AC",
    h1: "How long does a central AC last in Florida, and how do you extend it?",
    metaDescription:
      "In Florida a central AC typically lasts about 10 to 15 years, shorter than the national 15 to 20. Here's how to push yours to the top of the range.",
    quickAnswer:
      "In Florida a central AC typically lasts about 10 to 15 years, shorter than the national 15 to 20, because of constant heat, humidity, and near-year-round use. Regular service and airflow care push it to the top of that range.",
    overview:
      "In Florida your AC runs most of the year against heat and humidity, so it wears out faster than the national average. The good news, most of what shortens its life is preventable, and the biggest factor is not even the brand.",
    neglected: 12,
    maintained: 18,
    brands: [
      { name: "Trane", note: "Top rated reliability, the hard to stop a Trane reputation is earned.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
      { name: "Carrier", note: "Efficiency and technology leader.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
      { name: "Lennox", note: "Among the most reliable in owner surveys, high efficiency.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
      { name: "American Standard", note: "Built by Trane, same reliability for less.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
      { name: "Rheem", note: "Well balanced value.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
      { name: "Goodman", note: "Budget friendly.", sourceUrl: "https://modernize.com/hvac/best-air-conditioner-brands", sourceLabel: "Modernize: best AC brands" },
    ],
    maintenance: [
      { task: "Change the filters", frequency: "On schedule (monthly to quarterly)", effect: "Keeps airflow up and the blower easy.", impact: "High" },
      { task: "Keep the coils clean", frequency: "At every service", effect: "Humidity breeds mold on coils and in ducts, which chokes airflow.", impact: "High" },
      { task: "Have it serviced", frequency: "Twice a year", effect: "Catches capacitor and refrigerant issues before they kill the compressor.", impact: "High" },
      { task: "Confirm the unit is correctly sized", frequency: "At install", effect: "Oversized units short-cycle and wear out early.", impact: "High" },
      { task: "Keep the condensate drain clear", frequency: "Yearly", effect: "Prevents shutoffs and water damage.", impact: "Medium" },
    ],
    signs: [
      "Weak or warm airflow",
      "Short cycling on and off",
      "Rising energy bills",
      "Strange noises or smells",
      "Water or ice around the unit",
    ],
    repairOrReplace:
      "If it is over 12 to 15 years, uses old R22 refrigerant, or the repair is a big share of a new system, replace. Otherwise repair.",
    facts: [
      { k: "Expected life in FL", v: "10 to 15 years" },
      { k: "Common failure", v: "Compressor, coil, capacitor" },
      { k: "Recall status", v: "Check by model" },
    ],
    faqs: [
      { q: "Why does my AC not last as long in Florida?", a: "Constant heat, humidity, and near year round use, plus salt air near the coast, all wear it faster than milder climates." },
      { q: "How often should I service my AC?", a: "Twice a year, before the cooling and heating seasons." },
      { q: "Does the AC brand matter most?", a: "No. About 80 percent of an AC's lifespan comes from install quality and correct sizing, and only about 20 percent from the brand." },
      { q: "When should I replace instead of repair?", a: "When it is over 12 to 15 years, uses R22 refrigerant, or a repair costs a large share of a new unit." },
      { q: "What are the signs my AC is failing?", a: "Weak or warm airflow, short cycling, rising bills, and strange noises." },
    ],
    floridaNote:
      "Heat, humidity, and coastal salt air all shorten AC life here. Maintenance is what separates 10 years from 15.",
    sources: [
      { label: "Florida Airflow: HVAC life expectancy in Florida", url: "https://floridaairflow.com/hvac-life-expectancy-florida/" },
      { label: "InterNACHI: Florida component life expectancy", url: "https://www.nachi.org/florida-life-expectancy.htm" },
      { label: "Modernize: best AC brands", url: "https://modernize.com/hvac/best-air-conditioner-brands" },
    ],

  },

  roof: {
    slug: "roof",
    label: "Roof",
    h1: "How long does a shingle roof last in Florida, and how do you make it last?",
    metaDescription:
      "A Florida asphalt shingle roof typically lasts about 15 to 25 years. Inspections and attic ventilation are what push it to 25.",
    quickAnswer:
      "A Florida asphalt shingle roof typically lasts about 15 to 25 years. Regular inspections and good attic ventilation are what separate a roof that lasts 15 years from one that reaches 25.",
    overview:
      "A Florida asphalt roof lives a hard life of sun, heat, and hurricanes. Whether it lasts 15 years or 25 comes down to inspections, ventilation, and catching small problems early. Here is the full picture, plus the shingle brands that hold up.",
    neglected: 15,
    maintained: 25,
    brands: [
      { name: "GAF", note: "About 30 percent of the US market, Timberline HDZ is the value leader.", sourceUrl: "https://roofvista.com/resources/guides/asphalt-shingle-brands-compared", sourceLabel: "RoofVista: asphalt shingle brands compared" },
      { name: "Owens Corning", note: "Best wind resistance with SureNail, Duration series runs 25 to 30 years.", sourceUrl: "https://roofvista.com/resources/guides/asphalt-shingle-brands-compared", sourceLabel: "RoofVista: asphalt shingle brands compared" },
      { name: "CertainTeed", note: "Deepest warranty via SureStart, Landmark line, 40 plus colors.", sourceUrl: "https://roofvista.com/resources/guides/asphalt-shingle-brands-compared", sourceLabel: "RoofVista: asphalt shingle brands compared" },
      { name: "IKO", note: "Budget option.", sourceUrl: "https://roofvista.com/resources/guides/asphalt-shingle-brands-compared", sourceLabel: "RoofVista: asphalt shingle brands compared" },
    ],
    maintenance: [
      { task: "Inspect the roof", frequency: "Yearly and after major storms", effect: "Catches lifted shingles and flashing issues while they are still cheap.", impact: "High" },
      { task: "Fix small leaks and lifted shingles early", frequency: "As found", effect: "Prevents decking rot underneath.", impact: "High" },
      { task: "Keep attic ventilation good", frequency: "Ongoing", effect: "Cuts thermal stress that ages shingles from the underside.", impact: "High" },
      { task: "Keep gutters clear", frequency: "Twice a year", effect: "Stops water from backing up under the edge.", impact: "Medium" },
      { task: "Log the roof age and any wind mitigation", frequency: "Once", effect: "Helps at insurance and resale time.", impact: "Low" },
    ],
    signs: [
      "Curling, cracked, or missing shingles",
      "Granules collecting in the gutters",
      "Water stains on ceilings",
      "Daylight visible in the attic",
    ],
    repairOrReplace:
      "Isolated damage and small leaks are repairable. If shingles are failing across the roof or it is near the end of its range, replace, and get a wind mitigation inspection either way.",
    facts: [
      { k: "Asphalt shingle", v: "15 to 25 years" },
      { k: "Metal", v: "40 to 70 years" },
      { k: "Tile", v: "50+ years" },
      { k: "Common issue", v: "Sun, heat, and storm wear" },
    ],
    faqs: [
      { q: "How long does a shingle roof last in Florida?", a: "About 15 to 25 years, depending on maintenance, ventilation, and storm exposure." },
      { q: "What is the best shingle brand?", a: "GAF, Owens Corning, and CertainTeed lead. Choose based on wind rating and warranty depth." },
      { q: "Does a wind mitigation inspection help?", a: "Yes, it can lower your Florida insurance and documents your roof's storm resistance." },
      { q: "What are the signs I need a new roof?", a: "Curling or missing shingles, granules in the gutters, leaks, or daylight in the attic." },
      { q: "How often should I inspect my roof?", a: "Yearly, and after every major storm." },
    ],
    floridaNote:
      "UV, heat, humidity, and hurricanes are all hard on shingles. A wind-mitigation inspection can lower your insurance and extend the roof's useful life.",
    sources: [
      { label: "Trust Roofing: shingle roof lifespan in Florida", url: "https://trustroofing.com/blog/shingle-roof-lifespan-in-florida/" },
      { label: "InterNACHI: Florida component life expectancy", url: "https://www.nachi.org/florida-life-expectancy.htm" },
      { label: "RoofVista: asphalt shingle brands compared", url: "https://roofvista.com/resources/guides/asphalt-shingle-brands-compared" },
    ],

  },

  dryer: {
    slug: "dryer",
    label: "Dryer",
    h1: "How long does a clothes dryer last, and how do you extend it?",
    metaDescription:
      "A clothes dryer lasts about 8 to 13 years. Cleaning the full vent line yearly keeps it efficient and cuts a real fire risk.",
    quickAnswer:
      "A clothes dryer lasts about 8 to 13 years. Cleaning the full vent line yearly, not just the lint trap, keeps it efficient and cuts a real fire risk.",
    overview:
      "A dryer is simple, but a neglected vent quietly steals years and creates a real fire risk. Cleaning the full line, not just the lint trap, is the single highest return chore in the laundry room.",
    neglected: 8,
    maintained: 13,
    brands: [
      { name: "LG", note: "Top rated reliability, low service rates.", sourceUrl: "https://www.familyhandyman.com/article/home-appliances-lifespan/", sourceLabel: "Family Handyman: appliance lifespans" },
      { name: "Whirlpool", note: "Reliable and parts are easy to find anywhere.", sourceUrl: "https://www.familyhandyman.com/article/home-appliances-lifespan/", sourceLabel: "Family Handyman: appliance lifespans" },
      { name: "Maytag", note: "Built for durability.", sourceUrl: "https://www.familyhandyman.com/article/home-appliances-lifespan/", sourceLabel: "Family Handyman: appliance lifespans" },
      { name: "Samsung", note: "Feature rich.", sourceUrl: "https://www.familyhandyman.com/article/home-appliances-lifespan/", sourceLabel: "Family Handyman: appliance lifespans" },
    ],
    maintenance: [
      { task: "Clean the full vent line", frequency: "At least yearly", effect: "Fixes the real fire risk, not just the visible lint.", impact: "High" },
      { task: "Clean the lint trap", frequency: "Every load", effect: "Keeps airflow up and dry times down.", impact: "Medium" },
      { task: "Do not overload the drum", frequency: "Every load", effect: "Prevents motor and belt strain.", impact: "Medium" },
      { task: "Check the exterior vent flap", frequency: "Yearly", effect: "Blocked flaps trap moisture and reduce efficiency.", impact: "Low" },
    ],
    signs: [
      "Clothes take two cycles to dry",
      "The dryer or clothes are hot to the touch",
      "A burning smell",
      "The exterior vent flap does not open",
    ],
    repairOrReplace:
      "Cheap fixes like a thermal fuse are worth it. Past 10 years with an expensive repair, replace.",
    facts: [
      { k: "Expected life", v: "7 to 13 years" },
      { k: "Common failure", v: "Heating element, thermal fuse" },
      { k: "Safety note", v: "Clogged vents are a leading cause of dryer fires" },
    ],
    faqs: [
      { q: "How often should I clean the dryer vent?", a: "At least once a year, the full line, not just the lint trap." },
      { q: "Are clogged dryer vents really a fire risk?", a: "Yes, they are a leading cause of home dryer fires." },
      { q: "Which dryer brands are most reliable?", a: "LG and Whirlpool rate highest for reliability." },
      { q: "Why does my dryer take two cycles to dry?", a: "Almost always a clogged vent restricting airflow." },
      { q: "Should I repair or replace my dryer?", a: "If it is over 10 years old and the repair is expensive, replace it." },
    ],
    floridaNote:
      "Florida humidity means longer dry times, so a clear vent matters even more here.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
    ],

  },

  dishwasher: {
    slug: "dishwasher",
    label: "Dishwasher",
    h1: "How long does a dishwasher last, and how do you make it last longer?",
    metaDescription:
      "A dishwasher lasts about 9 to 12 years. Cleaning the filter monthly and descaling in hard water keeps it draining and cleaning well.",
    quickAnswer:
      "A dishwasher lasts about 9 to 12 years. Cleaning the filter monthly and running a descaler in hard water keeps it draining and cleaning well.",
    overview:
      "A dishwasher is one of the easiest appliances to keep alive. A clean filter and the occasional descale do most of the work, especially against Florida hard water. Here is how long it lasts, what protects it, and the most reliable brands.",
    neglected: 9,
    maintained: 12,
    brands: [
      { name: "Bosch", note: "Most reliable for over a decade, very low service rates.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
      { name: "Miele", note: "Premium and long lasting.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
      { name: "KitchenAid", note: "Reliable and well built.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
    ],
    maintenance: [
      { task: "Clean the filter", frequency: "Monthly", effect: "Prevents drainage and odor issues.", impact: "High" },
      { task: "Run a descaler or dishwasher cleaner", frequency: "Regularly, especially in hard water", effect: "Stops scale from clogging the spray arms and pump.", impact: "High" },
      { task: "Scrape, do not pre-rinse", frequency: "Every load", effect: "The detergent needs food to grab onto to work well.", impact: "Low" },
      { task: "Check and clean the spray arms", frequency: "Every few months", effect: "Restores cleaning power.", impact: "Medium" },
    ],
    signs: [
      "Dishes come out gritty or spotty",
      "Standing water in the bottom",
      "Not draining fully",
      "An odor that will not clear",
    ],
    repairOrReplace:
      "Under 9 years, most parts are worth replacing. Past 10 with a pump or control board failure, replace.",
    facts: [
      { k: "Expected life", v: "9 to 12 years" },
      { k: "Common failure", v: "Pump, drain, control board" },
    ],
    faqs: [
      { q: "How often should I clean the dishwasher filter?", a: "Monthly, to prevent drainage and odor problems." },
      { q: "Which dishwasher brand is most reliable?", a: "Bosch, followed by Miele and KitchenAid." },
      { q: "Should I pre rinse my dishes?", a: "No, just scrape. The detergent needs some food to grab onto to work well." },
      { q: "Why is my dishwasher not draining?", a: "Usually a clogged filter or drain hose." },
      { q: "Should I repair or replace my dishwasher?", a: "If it is over 9 to 10 years and the repair is a large share of a new one, replace." },
    ],
    floridaNote:
      "Hard water scale builds fast here, so a regular descale is one of the highest-return chores you can do.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
      { label: "Consumer Reports: most reliable kitchen appliances", url: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/" },
    ],

  },

  "water-softener": {
    slug: "water-softener",
    label: "Water softener",
    h1: "How long does a water softener last, and how do you extend it?",
    metaDescription:
      "A water softener lasts about 10 to 15 years. Salt and resin care get you to the top of that range and protect every other appliance in the house.",
    quickAnswer:
      "A water softener lasts about 10 to 15 years. Keeping the salt topped up and servicing the resin bed is what gets you to the top of that range, and it protects every other appliance in the house.",
    overview:
      "A water softener is the quiet protector of every water appliance in a Florida home. Keep salt in it and service the resin, and it lasts well past a decade while extending the life of your water heater, dishwasher, and fixtures.",
    neglected: 10,
    maintained: 15,
    brands: [
      { name: "Culligan", note: "Consumer Reports most reliable, 85 plus years, strong support.", sourceUrl: "https://qualitywatertreatment.com/pages/which-top-brands-of-water-softeners-should-you-trust", sourceLabel: "Quality Water Treatment: top softener brands" },
      { name: "Kinetico", note: "Non electric dual tank, often 30 plus years.", sourceUrl: "https://qualitywatertreatment.com/pages/which-top-brands-of-water-softeners-should-you-trust", sourceLabel: "Quality Water Treatment: top softener brands" },
      { name: "Fleck", note: "Budget favorite, the 5600SXT.", sourceUrl: "https://qualitywatertreatment.com/pages/which-top-brands-of-water-softeners-should-you-trust", sourceLabel: "Quality Water Treatment: top softener brands" },
      { name: "Pentair", note: "Solid whole home systems.", sourceUrl: "https://qualitywatertreatment.com/pages/which-top-brands-of-water-softeners-should-you-trust", sourceLabel: "Quality Water Treatment: top softener brands" },
    ],
    maintenance: [
      { task: "Keep the salt topped up", frequency: "Monthly check", effect: "The whole system stops working when salt runs out.", impact: "High" },
      { task: "Break up any salt bridges in the tank", frequency: "As needed", effect: "Bridges look like a full tank but leave the softener starving.", impact: "Medium" },
      { task: "Service or replace the resin bed", frequency: "Every several years", effect: "Restores capacity as resin wears.", impact: "Medium" },
      { task: "Clean the brine tank", frequency: "Periodically", effect: "Prevents sludge and valve problems.", impact: "Low" },
    ],
    signs: [
      "Hard water spots come back",
      "Soap will not lather",
      "Scale building on fixtures",
      "The salt tank looks full but nothing softens (a salt bridge)",
    ],
    repairOrReplace:
      "Resin and valves can be serviced. Replace when it is 15 plus years and repairs stop holding.",
    facts: [
      { k: "Expected life", v: "10 to 15 years" },
      { k: "Common failure", v: "Resin wear, valve" },
    ],
    faqs: [
      { q: "How often do I add salt to a water softener?", a: "Check monthly and refill as needed. The system stops working when salt runs out." },
      { q: "Which water softener brands last longest?", a: "Culligan and Kinetico, often 20 to 30 plus years." },
      { q: "What is a salt bridge?", a: "A hardened crust that looks like a full tank but leaves the softener starving for salt." },
      { q: "Does a softener protect my other appliances?", a: "Yes, it extends the life of your water heater, dishwasher, and fixtures." },
      { q: "Repair or replace a softener?", a: "Service resin and valves when possible, replace at 15 plus years if it keeps failing." },
    ],
    floridaNote:
      "Hard water is the norm here, so a working softener extends the life of your water heater, dishwasher, and fixtures too.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
      { label: "Quality Water Treatment: top softener brands", url: "https://qualitywatertreatment.com/pages/which-top-brands-of-water-softeners-should-you-trust" },
    ],

  },

  refrigerator: {
    slug: "refrigerator",
    label: "Refrigerator",
    h1: "How long does a refrigerator last, and how do you make it last longer?",
    metaDescription:
      "A refrigerator lasts about 13 years on average. Coil cleaning and tight door seals are the simplest ways to reach the longer end.",
    quickAnswer:
      "A refrigerator lasts about 13 years on average. Cleaning the condenser coils a couple of times a year and keeping the door seals tight are the simplest ways to reach the longer end.",
    overview:
      "A fridge runs around the clock, so the two things that quietly kill it are dirty condenser coils and worn door seals. Both are cheap to fix. Here is how long it lasts, what extends it, and the brands that break down least.",
    neglected: 13,
    maintained: 16,
    brands: [
      { name: "Bosch", note: "Top reliability.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
      { name: "Miele", note: "Premium and long lasting.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
      { name: "Whirlpool", note: "Best reliability for the price, parts everywhere.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
      { name: "KitchenAid", note: "Reliable value.", sourceUrl: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/", sourceLabel: "Consumer Reports: most reliable kitchen appliances" },
    ],
    maintenance: [
      { task: "Clean the condenser coils", frequency: "Twice a year", effect: "Lets the compressor breathe, which is what usually kills the fridge.", impact: "High" },
      { task: "Check and clean the door seals", frequency: "Every few months", effect: "Keeps cold in and the compressor from over-running.", impact: "High" },
      { task: "Keep it level so the doors seal", frequency: "Once", effect: "Small tilts cause seal problems and drainage issues.", impact: "Low" },
      { task: "Do not overpack the vents", frequency: "Ongoing", effect: "Blocked vents create warm spots and short-cycle the compressor.", impact: "Medium" },
    ],
    signs: [
      "Running constantly",
      "Warm spots or food spoiling faster",
      "Frost or condensation building up",
      "The motor is loud or hot",
    ],
    repairOrReplace:
      "Under 13 years, usually worth repairing. Past that with a compressor failure, replace.",
    facts: [
      { k: "Expected life", v: "About 13 to 16 years" },
      { k: "Common failure", v: "Compressor, seals" },
    ],
    faqs: [
      { q: "How often should I clean refrigerator coils?", a: "Twice a year. Dirty coils are the most common reason a fridge dies early." },
      { q: "Which refrigerator brands are most reliable?", a: "Bosch and Miele for reliability, Whirlpool and KitchenAid for the best value." },
      { q: "Why is my fridge running constantly?", a: "Usually dirty coils or worn door seals making it work too hard." },
      { q: "How long does a refrigerator last?", a: "About 13 years, longer with coil cleaning and good seals." },
      { q: "Repair or replace a refrigerator?", a: "If it is over 13 years and the compressor fails, replace." },
    ],
    floridaNote:
      "Heat makes the compressor work harder, so coil cleaning matters more in a warm garage or hot kitchen.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
      { label: "Consumer Reports: most reliable kitchen appliances", url: "https://www.consumerreports.org/appliances/most-reliable-kitchen-appliances-a3000811083/" },
    ],
  },

  "pool-equipment": {
    slug: "pool-equipment",
    label: "Pool equipment",
    h1: "How long does pool equipment last in Florida, and how do you extend it?",
    metaDescription:
      "A pool pump typically lasts about 8 to 12 years and a heater less. Chemistry and cleaning are what keep them from dying early in Florida.",
    quickAnswer:
      "A pool pump typically lasts about 8 to 12 years, and a heater less. Steady water chemistry and regular cleaning are what keep pumps, filters, and heaters from dying early in Florida's near-year-round swim season.",
    overview:
      "In Florida a pool runs nearly year round, so the equipment works hard. Steady water chemistry and simple cleaning are what keep a pump, filter, and heater from dying early. Ranges vary widely, so verify for your exact gear.",
    neglected: 8,
    maintained: 12,
    barsLabel: "the pump",
    brands: [
      { name: "Pentair", note: "Efficiency leader, IntelliFlo variable speed pumps.", sourceUrl: "https://poolsupplydepot.net/blogs/news/best-variable-speed-swimming-pool-pumps-for-2026-pentair-vs-jandy-vs-hayward", sourceLabel: "Pool Supply Depot: best variable speed pumps" },
      { name: "Hayward", note: "Strong efficiency, TriStar VS.", sourceUrl: "https://poolsupplydepot.net/blogs/news/best-variable-speed-swimming-pool-pumps-for-2026-pentair-vs-jandy-vs-hayward", sourceLabel: "Pool Supply Depot: best variable speed pumps" },
      { name: "Jandy", note: "Retrofit friendly, FloPro.", sourceUrl: "https://poolsupplydepot.net/blogs/news/best-variable-speed-swimming-pool-pumps-for-2026-pentair-vs-jandy-vs-hayward", sourceLabel: "Pool Supply Depot: best variable speed pumps" },
    ],
    maintenance: [
      { task: "Keep water chemistry balanced", frequency: "Weekly", effect: "The single biggest driver of equipment life.", impact: "High" },
      { task: "Clean the pump basket and filter", frequency: "Regularly", effect: "Protects the motor from strain and premature failure.", impact: "High" },
      { task: "Do not run the pump dry", frequency: "Always", effect: "A few minutes dry can destroy the seals.", impact: "High" },
      { task: "Service the heater before season", frequency: "Yearly", effect: "Catches ignition and heat-exchanger issues early.", impact: "Medium" },
    ],
    signs: [
      "The pump is loud, leaking, or shutting off",
      "Cloudy water even though it runs",
      "Weak circulation",
      "The heater will not fire",
    ],
    repairOrReplace:
      "Seals and baskets are cheap fixes. Replace a pump past 8 to 10 years, and upgrade to variable speed to cut energy cost.",
    facts: [
      { k: "Pump", v: "About 8 to 12 years" },
      { k: "Heater", v: "About 5 to 10 years" },
      { k: "Filter", v: "10+ years" },
      { k: "Common failure", v: "Pump motor, heater" },
    ],
    faqs: [
      { q: "How long does a pool pump last?", a: "About 8 to 12 years with good care." },
      { q: "Which pool pump brands are best?", a: "Pentair, Hayward, and Jandy lead the market." },
      { q: "Does a variable speed pump save money?", a: "Yes, a high efficiency pump can save hundreds of dollars a year in energy." },
      { q: "Why did my pool pump fail early?", a: "Usually poor water chemistry or running it dry, which destroys the seals." },
      { q: "How often should I service the pool heater?", a: "Yearly, before season." },
    ],
    floridaNote:
      "Near-year-round use and heat mean pool equipment works harder here than in most of the country.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
      { label: "Pool Supply Depot: best variable speed pumps", url: "https://poolsupplydepot.net/blogs/news/best-variable-speed-swimming-pool-pumps-for-2026-pentair-vs-jandy-vs-hayward" },
    ],
    verifyProminent: true,
  },

};

/* Order used for "keep going" internal links and for the browse grid. */
export const GUIDE_ORDER: string[] = [
  "water-heater",
  "central-ac",
  "roof",
  "dryer",
  "dishwasher",
  "water-softener",
  "refrigerator",
  "pool-equipment",
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES[slug];
}

export function otherGuides(slug: string, count = 4): Guide[] {
  return GUIDE_ORDER.filter((s) => s !== slug)
    .slice(0, count)
    .map((s) => GUIDES[s]);
}
