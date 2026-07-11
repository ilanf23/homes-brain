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
  /* For items that don't have a simple two-lifespans story. When true, the template
     shows a "Built to last" panel with expectedLife and leads with maintenance. */
  expectedLifeOnly?: boolean;
  /* For cadence-driven items (e.g. termite protection). Shows a cadence panel
     instead of a lifespan. */
  cadenceOnly?: boolean;
  /* Human sentence about expected life, used when expectedLifeOnly is true. */
  expectedLife?: string;
  /* Calm, factual one-paragraph "loss" beat surfaced under the lifespan bars
     on the guide page. Loss-aversion framing done quietly - no icons, no red. */
  hiddenRisk?: string;
};



export const GUIDES: Record<string, Guide> = {
  "water-heater": {
    slug: "water-heater",
    hiddenRisk:
      "Left too long the tank rusts through and lets go all at once, flooding the garage or closet. Water damage is the most common home claim, over $15,000 on average.",
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
    hiddenRisk:
      "In Florida humidity the condensate drain line clogs and overflows into the ceiling or wall, growing mold behind the drywall before a stain ever shows.",
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
    hiddenRisk:
      "Lifted or missing shingles let water in quietly, rotting the deck and staining ceilings, and a weak roof is the first thing a hurricane peels off.",
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
    hiddenRisk:
      "Lint packs the vent line, one of the leading causes of house fires, and a blocked vent cooks the machine and can push exhaust back inside.",
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
    hiddenRisk:
      "The supply line or door seal leaks slowly under the cabinet, warping the floor and growing mold you cannot see until it spreads.",
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
    hiddenRisk:
      "Untreated Florida hard water scales the water heater and every pipe and appliance downstream, quietly aging the whole home's plumbing, and a stuck softener can overflow.",
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
    hiddenRisk:
      "The ice-maker water line is a slow leak waiting to happen behind the fridge, and clogged coils overwork the compressor until it dies.",
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
    hiddenRisk:
      "A failing pump or heater seal leaks and can short the equipment on the pad, and stagnant water turns a pool green fast in the Florida heat.",
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

  "heat-pump": {
    slug: "heat-pump",
    hiddenRisk:
      "Skip service and the condensate line clogs and overflows like any AC, while low refrigerant burns out the compressor, the most expensive part.",
    label: "Heat pump",
    h1: "How long does a heat pump last, and how do you extend it?",
    metaDescription:
      "A heat pump typically lasts about 10 to 15 years. Twice-a-year service and clean coils are what separate the short and long end of that range.",
    quickAnswer:
      "A heat pump typically lasts about 10 to 15 years. Twice-a-year service and clean coils are what separate the short and long end of that range.",
    overview:
      "A heat pump does the job of a furnace and an air conditioner in one unit, which means it runs almost year round in Florida. That constant duty is why service twice a year, not once, is the difference between a decade and fifteen years.",
    neglected: 10,
    maintained: 15,
    maintenance: [
      { task: "Have it serviced", frequency: "Twice a year, spring and fall", effect: "Catches refrigerant, capacitor, and reversing valve issues before they kill the compressor.", impact: "High" },
      { task: "Change the filters", frequency: "Monthly to quarterly", effect: "Keeps airflow up and the blower easy.", impact: "High" },
      { task: "Keep the outdoor coil clear", frequency: "Ongoing", effect: "Leaves, grass clippings, and dryer lint blocking the coil overheats the unit.", impact: "High" },
      { task: "Keep at least two feet of clearance around the outdoor unit", frequency: "Ongoing", effect: "It needs airflow on all sides to work.", impact: "Medium" },
      { task: "Check the condensate drain", frequency: "Yearly", effect: "Prevents shutoffs and water damage.", impact: "Medium" },
    ],
    signs: [
      "The unit runs in emergency or auxiliary heat all the time",
      "Ice building on the outdoor coil in cool weather",
      "Rising energy bills",
      "Short cycling on and off",
    ],
    repairOrReplace:
      "Under 10 years, most repairs are worth it. Past 12 to 15 with a compressor or reversing valve failure, replace.",
    facts: [
      { k: "Expected life", v: "10 to 15 years" },
      { k: "Common failure", v: "Compressor, reversing valve, capacitor" },
      { k: "Service", v: "Twice a year" },
    ],
    faqs: [
      { q: "How long does a heat pump last?", a: "About 10 to 15 years, longer with twice-a-year service and clean coils." },
      { q: "Why does a heat pump wear out faster than a furnace?", a: "Because it works year round, both heating and cooling, so it puts on more runtime hours per year." },
      { q: "How often should I service a heat pump?", a: "Twice a year, once before cooling season and once before heating season." },
      { q: "When should I replace a heat pump?", a: "Past 12 to 15 years with a compressor or reversing valve failure, replace instead of repair." },
    ],
    floridaNote:
      "Heat pumps are the most common central system in Florida because winters are mild. That also means they run more months than in colder states, so annual service is not enough. Twice a year is the standard.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  furnace: {
    slug: "furnace",
    hiddenRisk:
      "A cracked heat exchanger can leak carbon monoxide into the home, which is why the yearly safety check matters.",
    label: "Furnace",
    h1: "How long does a furnace last, and how do you extend it?",
    metaDescription:
      "A furnace typically lasts about 15 to 25 years. Yearly service and a clean filter are what push it to the top of the range.",
    quickAnswer:
      "A furnace typically lasts about 15 to 25 years. Yearly service and a clean filter are what push it to the top of the range.",
    overview:
      "A furnace has fewer moving parts than an AC and runs fewer months a year, so it tends to last longer. The two things that shorten its life are neglected filters and skipped annual service, both easy to fix.",
    neglected: 15,
    maintained: 25,
    maintenance: [
      { task: "Have it serviced", frequency: "Yearly, before heating season", effect: "Catches ignition, blower motor, and heat exchanger issues early.", impact: "High" },
      { task: "Change the filters", frequency: "Monthly to quarterly", effect: "The single most common cause of preventable furnace failure is a choked filter.", impact: "High" },
      { task: "Test the carbon monoxide detector", frequency: "Twice a year", effect: "A cracked heat exchanger is a life-safety issue, not a comfort issue.", impact: "High" },
      { task: "Keep the flue and vents clear", frequency: "Yearly", effect: "Blocked venting is a combustion safety risk.", impact: "Medium" },
      { task: "Keep the area around the furnace clean and clear", frequency: "Ongoing", effect: "Combustible clutter is a fire risk.", impact: "Medium" },
    ],
    signs: [
      "Yellow burner flame instead of blue",
      "Soot around the unit",
      "Uneven heating room to room",
      "The blower runs but no heat",
      "The carbon monoxide detector triggers",
    ],
    repairOrReplace:
      "Under 15 years, most parts are worth replacing. Past 20, or with a cracked heat exchanger at any age, replace.",
    facts: [
      { k: "Expected life", v: "15 to 25 years" },
      { k: "Common failure", v: "Ignitor, blower motor, heat exchanger" },
      { k: "Safety note", v: "A cracked heat exchanger means replace, not repair" },
    ],
    faqs: [
      { q: "How long does a furnace last?", a: "About 15 to 25 years, longer with yearly service and a clean filter." },
      { q: "How often should I service a furnace?", a: "Once a year, before the heating season starts." },
      { q: "What is the most common furnace failure?", a: "A dirty filter starves the blower, which is the leading cause of preventable failures." },
      { q: "When should I replace a furnace?", a: "Past 20 years, or at any age with a cracked heat exchanger, replace." },
    ],
    floridaNote:
      "Most Florida homes use a heat pump, not a traditional gas furnace. If you do have a furnace here, it runs relatively few hours per year, which is why they often reach the top of the lifespan range.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "tankless-water-heater": {
    slug: "tankless-water-heater",
    hiddenRisk:
      "Florida's hard water scales the heat exchanger, and without annual descaling the unit fails early and can leak.",
    label: "Tankless water heater",
    h1: "How long does a tankless water heater last, and how do you extend it?",
    metaDescription:
      "A tankless water heater typically lasts about 12 to 20 years. In Florida hard water, annual descaling is what makes the difference.",
    quickAnswer:
      "A tankless water heater typically lasts about 12 to 20 years. Manufacturers rate them longer than a tank, but Florida hard water shortens them without annual descaling.",
    overview:
      "A tankless unit is more efficient and has no tank to rust through, which is why it can outlast a traditional water heater. The catch in Florida is scale. Skip the yearly descale and the heat exchanger starts to fail early, wiping out the lifespan advantage.",
    neglected: 12,
    maintained: 20,
    maintenance: [
      { task: "Descale the heat exchanger", frequency: "Yearly, more often in hard water", effect: "Scale on the heat exchanger is what ends most tankless units early.", impact: "High" },
      { task: "Clean the inlet filter and air intake", frequency: "Yearly", effect: "Restricted flow makes the unit work harder and short cycle.", impact: "Medium" },
      { task: "Consider a water softener or pretreatment", frequency: "Once", effect: "Cuts scale at the source, extending both the tankless unit and every other water appliance.", impact: "High" },
      { task: "Flush per manufacturer instructions", frequency: "As specified", effect: "Warranty and lifespan claims usually depend on documented maintenance.", impact: "Medium" },
    ],
    signs: [
      "Hot water swings hot and cold mid-shower",
      "Reduced flow at the tap",
      "An error code on the display",
      "The unit runs longer to hit the same temperature",
    ],
    repairOrReplace:
      "Sensors, ignitors, and fans are usually worth replacing. A failed heat exchanger past 12 to 15 years usually means replace.",
    facts: [
      { k: "Expected life", v: "12 to 20 years" },
      { k: "Common failure", v: "Scaled heat exchanger" },
      { k: "Maintenance", v: "Descale yearly" },
    ],
    faqs: [
      { q: "How long does a tankless water heater last?", a: "About 12 to 20 years. It can beat a tank, but only if you descale it yearly in hard water." },
      { q: "Do I really need to descale a tankless heater?", a: "Yes. In Florida hard water, scale on the heat exchanger is the number one cause of early failure." },
      { q: "Is a tankless worth it in Florida?", a: "It can be, if you commit to the yearly descale or add a softener. Without that, a tank often makes more sense." },
      { q: "How often should I service a tankless water heater?", a: "Once a year at minimum, more often if you have very hard water and no softener." },
    ],
    floridaNote:
      "Florida hard water shortens tankless heaters without annual descaling. A softener or pretreatment upstream is the single best thing you can do for one here.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "well-pump": {
    slug: "well-pump",
    hiddenRisk:
      "When the pump or pressure tank fails you lose water entirely, and short-cycling burns out the motor with little warning.",
    label: "Well pump",
    h1: "How long does a well pump last, and how do you extend it?",
    metaDescription:
      "A well pump typically lasts about 12 to 18 years. Correct sizing, a healthy pressure tank, and good water chemistry are what get you to the top of the range.",
    quickAnswer:
      "A well pump typically lasts about 12 to 18 years. Correct sizing, a healthy pressure tank, and good water chemistry are what get you to the top of the range.",
    overview:
      "A well pump is out of sight, so it is easy to forget until it fails. Most early failures come from a waterlogged pressure tank that makes the pump cycle constantly, not from the pump itself. Fix the tank and the pump lasts.",
    neglected: 12,
    maintained: 18,
    maintenance: [
      { task: "Check the pressure tank air charge", frequency: "Yearly", effect: "A waterlogged tank makes the pump short cycle, which is what usually kills it.", impact: "High" },
      { task: "Test the water", frequency: "Yearly", effect: "Sand, iron, and bacteria wear the pump and screens fast.", impact: "High" },
      { task: "Have the well and pump inspected", frequency: "Every few years", effect: "Catches sanding, low output, or a failing check valve early.", impact: "Medium" },
      { task: "Do not run the well dry", frequency: "Always", effect: "Even a short dry run can burn the pump motor.", impact: "High" },
    ],
    signs: [
      "The pump runs constantly or short cycles",
      "Fluctuating water pressure",
      "Sputtering or air at the tap",
      "Discolored or sandy water",
      "A tripped breaker at the pump",
    ],
    repairOrReplace:
      "Check valves, pressure switches, and tanks are worth replacing on their own. A submersible pump past 12 to 15 years with a failed motor usually means replace.",
    facts: [
      { k: "Expected life", v: "12 to 18 years" },
      { k: "Common failure", v: "Motor, pressure tank, check valve" },
      { k: "Key protector", v: "A healthy pressure tank" },
    ],
    faqs: [
      { q: "How long does a well pump last?", a: "About 12 to 18 years, longer with a healthy pressure tank and good water chemistry." },
      { q: "What kills a well pump early?", a: "A waterlogged pressure tank that makes the pump cycle on and off constantly." },
      { q: "How often should I test well water?", a: "At least yearly, and any time the taste, smell, or clarity changes." },
      { q: "Can I run my well dry to check it?", a: "No. Even a short dry run can burn the pump motor." },
    ],
    floridaNote:
      "Many rural St. Johns County homes are on well water. Sand and iron are common here, so an annual water test and a healthy pressure tank make a real difference in pump life.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "sump-pump": {
    slug: "sump-pump",
    hiddenRisk:
      "It sits idle for months, then fails the one storm you need it, and the low area floods. Test it before the season, not during it.",
    label: "Sump pump",
    h1: "How long does a sump pump last, and how do you extend it?",
    metaDescription:
      "A sump pump typically lasts about 6 to 9 years. Yearly testing and a clean pit are what keep it working the day you actually need it.",
    quickAnswer:
      "A sump pump typically lasts about 6 to 9 years. Yearly testing and a clean pit are what keep it working the day you actually need it.",
    overview:
      "A sump pump sits idle until a storm, then has to work. That pattern is why most failures show up at the worst possible moment. A yearly test and a clean pit are the whole game.",
    neglected: 6,
    maintained: 9,
    maintenance: [
      { task: "Test the pump by pouring water into the pit", frequency: "Yearly, plus before storm season", effect: "The only way to confirm it will actually run when it matters.", impact: "High" },
      { task: "Clean the pit and inlet screen", frequency: "Yearly", effect: "Debris jams the float and burns the motor.", impact: "High" },
      { task: "Check the discharge line for clogs and freezing", frequency: "Yearly", effect: "A blocked line puts pressure back on the pump.", impact: "Medium" },
      { task: "Add a battery backup", frequency: "Once", effect: "Storms take out power, which is exactly when the pump is needed.", impact: "High" },
    ],
    signs: [
      "The pump runs constantly, or not at all",
      "Strange noises or vibration",
      "Visible rust or corrosion",
      "The pit fills but the pump does not kick on",
    ],
    repairOrReplace:
      "Floats and switches can be replaced. Past 7 or 8 years with a motor issue, replace, and add a battery backup while you are at it.",
    facts: [
      { k: "Expected life", v: "6 to 9 years" },
      { k: "Common failure", v: "Motor, float switch" },
      { k: "Key habit", v: "Test yearly, before storm season" },
    ],
    faqs: [
      { q: "How long does a sump pump last?", a: "About 6 to 9 years, longer if it is tested yearly and the pit is kept clean." },
      { q: "How do I test a sump pump?", a: "Pour a bucket of water into the pit and confirm the pump kicks on, moves the water, and shuts off cleanly." },
      { q: "Should I have a battery backup?", a: "Yes. Power outages during storms are exactly when the pump is needed most." },
      { q: "How often should I clean the sump pit?", a: "At least once a year, more often if the pit collects sand or silt." },
    ],
    floridaNote:
      "Florida homes are more likely to have a slab than a basement, so sump pumps are less common. Where they exist, they usually protect a crawlspace or a low utility area, and hurricane season is what they are built for.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "garbage-disposal": {
    slug: "garbage-disposal",
    hiddenRisk:
      "A worn bottom seal leaks under the sink, quietly soaking the cabinet, and a jam can crack the housing.",
    label: "Garbage disposal",
    h1: "How long does a garbage disposal last, and how do you extend it?",
    metaDescription:
      "A garbage disposal typically lasts about 10 to 14 years. What goes in it is the biggest factor.",
    quickAnswer:
      "A garbage disposal typically lasts about 10 to 14 years. What you put down it is the single biggest factor.",
    overview:
      "A garbage disposal is a small motor with a hard job, and most early deaths come from what gets fed into it. A few habits keep the motor and drain line healthy for well over a decade.",
    neglected: 10,
    maintained: 14,
    maintenance: [
      { task: "Run cold water before, during, and after use", frequency: "Every use", effect: "Cold water solidifies fats so they flow through instead of coating the drain.", impact: "High" },
      { task: "Avoid fibrous food, bones, and grease", frequency: "Always", effect: "These are what jam and burn out the motor.", impact: "High" },
      { task: "Grind ice cubes with a little dish soap", frequency: "Monthly", effect: "Cleans the grind chamber and freshens the drain.", impact: "Low" },
      { task: "Do not use harsh chemical drain cleaners", frequency: "Always", effect: "They damage the seals and the grind chamber.", impact: "Medium" },
    ],
    signs: [
      "A humming sound with no grinding (a jam)",
      "Slow draining",
      "Persistent leaks under the sink",
      "A burning smell when it runs",
      "It has to be reset often",
    ],
    repairOrReplace:
      "A jammed disposal usually just needs to be freed. A leaking body or burned motor past 10 years means replace.",
    facts: [
      { k: "Expected life", v: "10 to 14 years" },
      { k: "Common failure", v: "Motor, seals" },
      { k: "Biggest killer", v: "Fibrous food, bones, and grease" },
    ],
    faqs: [
      { q: "How long does a garbage disposal last?", a: "About 10 to 14 years, longer if you avoid fibrous food, bones, and grease." },
      { q: "What should I never put in a garbage disposal?", a: "Bones, fruit pits, celery, potato peels, coffee grounds, and grease." },
      { q: "Why does my disposal hum but not grind?", a: "It is jammed. Cut the power, free the blades with the manual key, and hit the reset button." },
      { q: "Can I fix a leaking disposal?", a: "A leak at the pipe connections is fixable. A leak from the body of the unit means it is time to replace." },
    ],
    floridaNote:
      "Most Florida homes on a septic system should go easy on the disposal, or skip it. Too much food pulp overloads the septic tank.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  faucets: {
    slug: "faucets",
    hiddenRisk:
      "A failing supply line under the sink becomes a slow leak that rots the cabinet and floor, and a burst braided line can flood a room fast.",
    label: "Faucets and fixtures",
    h1: "How long do faucets and fixtures last, and how do you extend them?",
    metaDescription:
      "Faucets and fixtures typically last about 15 to 22 years. Fixing small drips early and cleaning aerators is most of the game.",
    quickAnswer:
      "Faucets and fixtures typically last about 15 to 22 years. Fixing small drips early and cleaning aerators is most of the game.",
    overview:
      "Faucets and fixtures rarely fail suddenly. They wear slowly through mineral buildup and worn cartridges, and a small drip is the first sign. Catching that early is what turns fifteen years into twenty two.",
    neglected: 15,
    maintained: 22,
    maintenance: [
      { task: "Fix small drips as soon as they start", frequency: "As found", effect: "A worn cartridge or O-ring is cheap. Ignoring it damages the fixture body.", impact: "High" },
      { task: "Clean or replace aerators and shower heads", frequency: "Yearly", effect: "Removes scale, restores flow, and reduces strain on cartridges.", impact: "Medium" },
      { task: "Turn handles gently, not tight", frequency: "Every use", effect: "Overtightening is what wears cartridges out.", impact: "Medium" },
      { task: "Check under-sink supply lines", frequency: "Yearly", effect: "Braided lines and shutoffs age too, and a burst line is a big loss.", impact: "Medium" },
    ],
    signs: [
      "A drip that will not stop",
      "Reduced flow or pressure",
      "Handles that feel loose or hard to turn",
      "Green or white scale around the spout",
      "Water pooling around the base",
    ],
    repairOrReplace:
      "Cartridges, O-rings, and aerators are all worth replacing. A corroded body or a failed finish usually means replace the fixture.",
    facts: [
      { k: "Expected life", v: "15 to 22 years" },
      { k: "Common failure", v: "Worn cartridge, mineral buildup" },
      { k: "Fastest win", v: "Fix drips early" },
    ],
    faqs: [
      { q: "How long do faucets last?", a: "About 15 to 22 years, longer with prompt cartridge replacement and clean aerators." },
      { q: "Why is my faucet flow so weak?", a: "Almost always a clogged aerator. Unscrew it, soak it in vinegar, and rinse." },
      { q: "Should I fix a small drip right away?", a: "Yes. A drip means a worn cartridge, and running water past a worn seal wears the fixture body next." },
      { q: "How long do shower heads last?", a: "Similar range, and the same cleaning routine applies. Descale yearly to keep flow up." },
    ],
    floridaNote:
      "Hard water is why fixtures scale up here. A softener protects fixtures along with everything else, and a yearly aerator soak in vinegar goes a long way.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "range-oven": {
    slug: "range-oven",
    hiddenRisk:
      "Gas models can develop a leak at the connector, and worn seals or wiring are a fire risk, so keep the connection and burners maintained.",
    label: "Range or oven",
    h1: "How long does a range or oven last, and how do you extend it?",
    metaDescription:
      "A range or oven typically lasts about 13 to 17 years. Clean burners, working seals, and calibrated controls are what get you to the top.",
    quickAnswer:
      "A range or oven typically lasts about 13 to 17 years. Clean burners, working seals, and calibrated controls are what get you to the top.",
    overview:
      "A range or oven is one of the longer-lived appliances in the kitchen. Most early failures come from spills that were never cleaned up, and door seals that lost their spring. Both are easy to stay on top of.",
    neglected: 13,
    maintained: 17,
    maintenance: [
      { task: "Clean spills as they happen", frequency: "Every cook", effect: "Baked-on spills damage the surface and can jam gas ports or electric elements.", impact: "High" },
      { task: "Check the oven door seal", frequency: "Twice a year", effect: "A worn seal wastes energy and overheats the controls.", impact: "Medium" },
      { task: "Use the self-clean cycle sparingly", frequency: "As needed", effect: "The extreme heat can fail control boards and fuses. Manual cleaning is gentler.", impact: "Medium" },
      { task: "Keep gas burner ports clean", frequency: "As needed", effect: "Clogged ports cause uneven flame and yellow burning.", impact: "Medium" },
      { task: "Calibrate the oven if temps drift", frequency: "As needed", effect: "Most modern ovens have a calibration offset in the settings.", impact: "Low" },
    ],
    signs: [
      "Uneven baking",
      "A burner that will not light or heat",
      "The oven runs hot or cold vs the set temperature",
      "The door will not close tight",
      "Error codes on the display",
    ],
    repairOrReplace:
      "Elements, ignitors, and thermostats are worth replacing. Past 15 years with a control board failure, replace.",
    facts: [
      { k: "Expected life", v: "13 to 17 years" },
      { k: "Common failure", v: "Element, ignitor, control board" },
      { k: "Key habit", v: "Clean spills as they happen" },
    ],
    faqs: [
      { q: "How long does a range or oven last?", a: "About 13 to 17 years, longer with clean burners and a working door seal." },
      { q: "Is the self-clean cycle safe?", a: "It is safe but hard on the appliance. The extreme heat can fail control boards, so use it sparingly." },
      { q: "Why does my oven bake unevenly?", a: "Usually a weak element, a bad thermostat, or a door seal that lets heat escape." },
      { q: "When should I replace an oven?", a: "Past 15 years with a control board or serious element failure, replace." },
    ],
    floridaNote:
      "In Florida, oven use puts real load on your AC in summer. That is a cooking habit note, not a lifespan one, but it is worth knowing.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  microwave: {
    slug: "microwave",
    hiddenRisk:
      "Failing door seals can leak, and running it empty damages the magnetron; mostly a replace item, but never run it empty.",
    label: "Microwave",
    h1: "How long does a microwave last, and how do you extend it?",
    metaDescription:
      "A microwave typically lasts about 8 to 11 years. Keeping the door and interior clean, and not running it empty, is most of the maintenance.",
    quickAnswer:
      "A microwave typically lasts about 8 to 11 years. Keeping the door and interior clean, and not running it empty, is most of the maintenance.",
    overview:
      "A microwave is the shortest-lived kitchen appliance. There is not much to service on one, so the goal is to avoid the things that kill it early, like a damaged door seal or running it empty.",
    neglected: 8,
    maintained: 11,
    maintenance: [
      { task: "Clean spills inside", frequency: "As they happen", effect: "Splatter absorbs energy and eventually damages the interior coating.", impact: "High" },
      { task: "Keep the door and hinges clean and undamaged", frequency: "Ongoing", effect: "A damaged door seal is a safety issue, not just a cosmetic one.", impact: "High" },
      { task: "Never run it empty", frequency: "Always", effect: "With nothing to absorb the energy, the magnetron can burn out.", impact: "High" },
      { task: "Clean or replace the vent filter (over-the-range models)", frequency: "Every few months", effect: "A grease-clogged filter stresses the fan and the electronics.", impact: "Medium" },
    ],
    signs: [
      "Food takes longer than it used to",
      "Sparks or arcing inside",
      "A humming or buzzing that is louder than normal",
      "The turntable will not rotate",
      "A damaged or misaligned door",
    ],
    repairOrReplace:
      "A countertop microwave is almost always cheaper to replace than repair. A built-in or over-the-range unit is worth quoting a repair first.",
    facts: [
      { k: "Expected life", v: "8 to 11 years" },
      { k: "Common failure", v: "Magnetron, door switch" },
      { k: "Safety note", v: "Never use one with a damaged door" },
    ],
    faqs: [
      { q: "How long does a microwave last?", a: "About 8 to 11 years. It is the shortest-lived major kitchen appliance." },
      { q: "Why does my microwave heat food unevenly?", a: "Usually a weak magnetron or a broken turntable motor." },
      { q: "Is a sparking microwave dangerous?", a: "Yes. Stop using it and have it looked at, or replace it. Sparking usually means damage inside the cavity." },
      { q: "Should I repair or replace a microwave?", a: "A countertop microwave is almost always cheaper to replace. Built-ins are worth a repair quote." },
    ],
    floridaNote:
      "Coastal salt air can accelerate corrosion on the vent grille and controls of an over-the-range unit. A yearly wipe-down helps.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  washer: {
    slug: "washer",
    hiddenRisk:
      "The rubber supply hose weakens and can burst at 650 gallons an hour, a $15 part behind the machine that drives some of the most expensive water claims. Replace it every 3 to 5 years.",
    label: "Washing machine",
    h1: "How long does a washing machine last, and how do you extend it?",
    metaDescription:
      "A washing machine typically lasts about 8 to 14 years. Not overloading it and keeping the tub and seals clean is most of the game.",
    quickAnswer:
      "A washing machine typically lasts about 8 to 14 years. Not overloading it and keeping the tub and seals clean is most of the game.",
    overview:
      "A washing machine takes real abuse: heat, water, soap, and vibration. Overloading is the number one thing that shortens its life, and a clean door seal is the number two.",
    neglected: 8,
    maintained: 14,
    maintenance: [
      { task: "Do not overload the drum", frequency: "Every load", effect: "Overloading strains the motor, bearings, and suspension. This is the biggest killer.", impact: "High" },
      { task: "Wipe the door seal and leave the door ajar after washing", frequency: "Every load", effect: "Stops mold and odors in front-loaders, which is what usually forces a replacement seal.", impact: "High" },
      { task: "Run a tub-clean or vinegar cycle", frequency: "Monthly", effect: "Cuts detergent and hard-water residue in the drum.", impact: "Medium" },
      { task: "Check and replace supply hoses", frequency: "Every 5 years", effect: "A burst supply line is one of the most expensive water damage events in a home.", impact: "High" },
      { task: "Level the machine", frequency: "As needed", effect: "An unlevel washer walks, vibrates, and destroys its own bearings.", impact: "Medium" },
    ],
    signs: [
      "The washer walks across the floor",
      "Loud banging on the spin cycle",
      "Water pooling under the machine",
      "Clothes come out soaking wet after the spin",
      "A musty smell that will not clear",
    ],
    repairOrReplace:
      "Pumps, belts, and door seals are worth replacing. Past 10 years with a bearing or transmission failure, replace.",
    facts: [
      { k: "Expected life", v: "8 to 14 years" },
      { k: "Common failure", v: "Bearings, pump, control board" },
      { k: "Key habit", v: "Do not overload, and replace supply hoses" },
    ],
    faqs: [
      { q: "How long does a washing machine last?", a: "About 8 to 14 years, longer with reasonable loads and clean seals." },
      { q: "Why is my washer walking across the floor?", a: "It is either overloaded, unlevel, or the shocks or suspension are worn." },
      { q: "How often should I replace washer supply hoses?", a: "Every five years. Braided stainless is worth the small extra cost." },
      { q: "Do front-loaders really smell?", a: "They can, if the door is closed tight and the seal is not wiped. Leave the door ajar and wipe the seal after each load." },
    ],
    floridaNote:
      "Florida humidity makes front-loader odor problems worse. Leaving the door cracked open is not optional here.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  gutters: {
    slug: "gutters",
    hiddenRisk:
      "Clogged gutters overflow against the foundation and fascia, rotting wood and pushing water toward the slab, a slow driver of foundation damage.",
    label: "Gutters",
    h1: "How long do gutters last, and how do you extend them?",
    metaDescription:
      "Gutters typically last about 15 to 30 years. Keeping them clear and flowing is what protects the roof, siding, and foundation.",
    quickAnswer:
      "Gutters typically last about 15 to 30 years. Keeping them clear and flowing is what protects the roof, siding, and foundation as much as the gutters themselves.",
    overview:
      "Gutters are less about the metal wearing out and more about staying attached and clear. A clogged gutter overflows and rots the fascia, and a loose gutter tears itself off in the next storm.",
    neglected: 15,
    maintained: 30,
    maintenance: [
      { task: "Clean the gutters", frequency: "Twice a year, plus after storms", effect: "Clogged gutters overflow, which rots the fascia and the roof edge.", impact: "High" },
      { task: "Check that all downspouts are attached and clear", frequency: "Twice a year", effect: "A blocked downspout is the same as no gutter.", impact: "High" },
      { task: "Reseal end caps and seams", frequency: "As needed", effect: "Small leaks at the seams are what start bigger problems.", impact: "Medium" },
      { task: "Check the pitch and hangers", frequency: "Yearly", effect: "Gutters need slope to drain, and hangers loosen over time.", impact: "Medium" },
      { task: "Consider gutter guards", frequency: "Once", effect: "They cut cleaning frequency, though they do not eliminate it.", impact: "Low" },
    ],
    signs: [
      "Water spilling over the front edge in a storm",
      "Sagging or pulling away from the fascia",
      "Rust or holes",
      "Water stains on the siding",
      "Erosion under the downspouts",
    ],
    repairOrReplace:
      "Seams, hangers, and short sections are worth repairing. If the runs are rusted through or sagging system wide, replace.",
    facts: [
      { k: "Expected life", v: "15 to 30 years" },
      { k: "Common failure", v: "Clogs, loose hangers, rusted seams" },
      { k: "Key habit", v: "Twice-a-year cleaning" },
    ],
    faqs: [
      { q: "How often should I clean gutters?", a: "At least twice a year, and after every major storm." },
      { q: "How long do gutters last?", a: "About 15 to 30 years, depending on material and how clean they are kept." },
      { q: "Are gutter guards worth it?", a: "They cut cleaning frequency but do not eliminate it. Worth it in a home surrounded by trees." },
      { q: "Why is water spilling over my gutters?", a: "Either they are clogged, the downspouts are blocked, or the pitch has shifted." },
    ],
    floridaNote:
      "Florida rain comes hard and fast, and hurricane debris can pack a gutter overnight. Post-storm cleaning matters more here than in most of the country.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "garage-door": {
    slug: "garage-door",
    hiddenRisk:
      "A worn spring or cable can snap under tension and is a real injury risk, and a failed opener can drop the door.",
    label: "Garage door",
    h1: "How long does a garage door last, and how do you extend it?",
    metaDescription:
      "A garage door and opener typically last about 15 to 28 years. Lubrication and spring service are what keep them safe and quiet.",
    quickAnswer:
      "A garage door and opener typically last about 15 to 28 years. Lubrication and spring service are what keep them safe and quiet.",
    overview:
      "A garage door is one of the largest moving parts in a home, and one of the most ignored. Regular lubrication and letting a pro handle spring service are what keep it working smoothly for decades.",
    neglected: 15,
    maintained: 28,
    maintenance: [
      { task: "Lubricate hinges, rollers, and springs", frequency: "Twice a year", effect: "Quiets the door and reduces wear on the opener.", impact: "High" },
      { task: "Test the auto-reverse safety", frequency: "Monthly", effect: "It is a life-safety feature. Test with a roll of paper towels in the path.", impact: "High" },
      { task: "Tighten hardware", frequency: "Yearly", effect: "Every open and close vibrates things loose.", impact: "Medium" },
      { task: "Check the weather seal at the bottom", frequency: "Yearly", effect: "Keeps water, pests, and heat out of the garage.", impact: "Medium" },
      { task: "Have springs serviced by a pro", frequency: "As needed", effect: "Springs are under enormous tension and cause the most serious garage door injuries.", impact: "High" },
    ],
    signs: [
      "The door is louder than it used to be",
      "It hesitates or reverses mid-travel",
      "A broken spring (a loud bang, and the door will not open)",
      "The auto-reverse does not trigger",
      "Cables that look frayed",
    ],
    repairOrReplace:
      "Springs, cables, rollers, and openers are all worth replacing on their own. Replace the whole door if the panels are damaged, rusted, or storm-rated protection is needed.",
    facts: [
      { k: "Expected life", v: "15 to 28 years" },
      { k: "Common failure", v: "Springs, rollers, opener" },
      { k: "Safety note", v: "Do not adjust springs yourself" },
    ],
    faqs: [
      { q: "How long does a garage door last?", a: "About 15 to 28 years, longer with regular lubrication and spring service." },
      { q: "How often should I lubricate a garage door?", a: "Twice a year, on hinges, rollers, and springs." },
      { q: "Why is my garage door so loud?", a: "Usually dry hinges and rollers. Lubrication fixes most of it, and worn rollers are a cheap replacement." },
      { q: "Can I replace a garage door spring myself?", a: "No. Springs are under high tension and are the leading cause of serious garage door injuries." },
    ],
    floridaNote:
      "Florida code now requires wind-rated garage doors in most areas. A door that fails in a hurricane can pressurize the house and lift the roof, which is why the upgrade matters.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  windows: {
    slug: "windows",
    hiddenRisk:
      "Failed seals and cracked caulk let water into the wall, feeding mold and wood rot behind the frame you never see until it spreads.",
    label: "Windows",
    h1: "How long do windows last, and how do you extend them?",
    metaDescription:
      "Windows typically last about 12 to 25 years. Seal integrity and good caulking are what get you to the top of the range.",
    quickAnswer:
      "Windows typically last about 12 to 25 years. Seal integrity and good caulking are what get you to the top of the range.",
    overview:
      "Windows fail from the outside in. A failed exterior seal lets water reach the frame, and a fogged double-pane seal ruins the insulation. Keeping caulking and weep holes healthy is most of what extends them.",
    neglected: 12,
    maintained: 25,
    maintenance: [
      { task: "Inspect and reseal exterior caulking", frequency: "Yearly", effect: "Stops water from reaching the frame, which is what actually rots windows.", impact: "High" },
      { task: "Keep weep holes clear", frequency: "Yearly", effect: "Weep holes drain the sill. Blocked, they trap water inside the frame.", impact: "High" },
      { task: "Clean and lubricate tracks and hardware", frequency: "Yearly", effect: "Reduces wear on rollers and latches and keeps the seal tight.", impact: "Medium" },
      { task: "Check for fogging between the panes", frequency: "Yearly", effect: "Fog means the insulating seal has failed, and the pane assembly needs replacement.", impact: "Medium" },
      { task: "Clean the frames and screens", frequency: "Twice a year", effect: "Salt and grit accelerate wear here.", impact: "Low" },
    ],
    signs: [
      "Fog or moisture between the panes",
      "Drafts even when closed",
      "Sticking sashes or hard-to-turn locks",
      "Water on the sill after a rain",
      "Peeling paint or rot on the trim",
    ],
    repairOrReplace:
      "Hardware and single pane assemblies can be replaced. If frames are rotted or several units are failing, replace, and consider impact-rated windows.",
    facts: [
      { k: "Expected life", v: "12 to 25 years" },
      { k: "Common failure", v: "Failed insulating seal, rotted frame" },
      { k: "Key habit", v: "Keep caulking and weep holes healthy" },
    ],
    faqs: [
      { q: "How long do windows last?", a: "About 12 to 25 years, longer with sound caulking and clear weep holes." },
      { q: "Why are my windows fogging up between the panes?", a: "The insulating seal has failed. The pane assembly can be replaced without changing the whole window." },
      { q: "Are impact windows worth it in Florida?", a: "In most cases yes. They protect the home in a storm and often lower insurance." },
      { q: "How often should I re-caulk my windows?", a: "Inspect yearly, and re-caulk any spot where the seal has cracked or pulled away." },
    ],
    floridaNote:
      "Sun, salt, and hurricane exposure all age windows faster here. Impact-rated windows are increasingly standard in Florida for a reason.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  irrigation: {
    slug: "irrigation",
    hiddenRisk:
      "A stuck valve or broken head can run for days unnoticed, spiking the bill and undermining the foundation and driveway.",
    label: "Irrigation and sprinklers",
    h1: "How long does an irrigation system last, and how do you extend it?",
    metaDescription:
      "An irrigation system typically lasts about 8 to 14 years. Seasonal audits and correct heads are what stretch it and cut water bills.",
    quickAnswer:
      "An irrigation system typically lasts about 8 to 14 years. Seasonal audits and correct heads are what stretch it and cut water bills.",
    overview:
      "An irrigation system is a lot of small parts that fail one at a time. A yearly audit finds broken heads, misaimed nozzles, and stuck valves before they cost you water and a brown lawn.",
    neglected: 8,
    maintained: 14,
    maintenance: [
      { task: "Run each zone and inspect visually", frequency: "Twice a year, more in Florida", effect: "The only way to catch broken heads, dry spots, and misaimed nozzles.", impact: "High" },
      { task: "Adjust the controller for the season", frequency: "Seasonally", effect: "Watering the same year round is what drives huge Florida water bills.", impact: "High" },
      { task: "Install and test a rain sensor", frequency: "Once, then verify yearly", effect: "Required in Florida, and it prevents watering during rain.", impact: "High" },
      { task: "Check the backflow preventer", frequency: "Yearly", effect: "Protects drinking water and is often required by code.", impact: "High" },
      { task: "Clear heads and clean filters", frequency: "As needed", effect: "Sand and grass clippings clog nozzles fast.", impact: "Medium" },
    ],
    signs: [
      "Wet spots or geysers where a head broke",
      "Dry patches in a zone",
      "A zone will not shut off",
      "A jump in the water bill",
      "The controller display is blank",
    ],
    repairOrReplace:
      "Heads, valves, and controllers all replace one at a time. A poorly designed system that never covered the yard should be redesigned, not just repaired.",
    facts: [
      { k: "Expected life", v: "8 to 14 years" },
      { k: "Common failure", v: "Heads, valves, controller" },
      { k: "Biggest win", v: "A seasonal controller schedule and a working rain sensor" },
    ],
    faqs: [
      { q: "How long does an irrigation system last?", a: "About 8 to 14 years, longer with seasonal audits and prompt head replacement." },
      { q: "How often should I audit my sprinklers?", a: "At least twice a year in Florida, running each zone and watching where the water goes." },
      { q: "Do I really need a rain sensor?", a: "Yes. It is required in Florida for new systems, and it pays for itself in water savings." },
      { q: "Why is my water bill so high?", a: "Almost always a stuck valve, a broken head, or a controller set to water more than the lawn needs." },
    ],
    floridaNote:
      "Florida requires a working rain sensor on residential irrigation. Local watering restrictions apply in most St. Johns County utilities, so set the controller to match the allowed days.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "standby-generator": {
    slug: "standby-generator",
    hiddenRisk:
      "The unit you never test is the one that will not start when the power goes out in a storm, failing exactly when you need it.",
    label: "Standby generator",
    h1: "How long does a standby generator last, and how do you extend it?",
    metaDescription:
      "A standby generator typically lasts about 10 to 14 years. Regular exercise cycles and yearly service are what keep it ready.",
    quickAnswer:
      "A standby generator typically lasts about 10 to 14 years. Regular exercise cycles and yearly service are what keep it ready.",
    overview:
      "A standby generator only earns its keep if it starts. That means it needs to be exercised, serviced, and left alone in the right way. Skip the annual service and it will fail the one time it matters.",
    neglected: 10,
    maintained: 14,
    maintenance: [
      { task: "Let the weekly self-test run", frequency: "Weekly", effect: "The self-test keeps the starter, battery, and fuel system alive.", impact: "High" },
      { task: "Yearly service by a pro", frequency: "Yearly", effect: "Oil, filters, spark plugs, and coolant all need periodic replacement.", impact: "High" },
      { task: "Test the transfer switch under load", frequency: "Yearly", effect: "The generator itself may run, but the transfer switch is what actually powers the house.", impact: "High" },
      { task: "Keep the enclosure clear and unblocked", frequency: "Ongoing", effect: "It needs airflow and clearance. Pests love the warm housing.", impact: "Medium" },
      { task: "Check the fuel supply", frequency: "Yearly", effect: "Natural gas lines, propane tanks, and diesel all age or leak.", impact: "Medium" },
    ],
    signs: [
      "The unit fails a self-test",
      "The battery is dead",
      "Rodents or wasps in the housing",
      "Fuel odors",
      "It runs but the house stays dark (transfer switch)",
    ],
    repairOrReplace:
      "Batteries, plugs, and controllers are worth replacing. Past 10 to 12 years with a major engine or alternator failure, replace.",
    facts: [
      { k: "Expected life", v: "10 to 14 years" },
      { k: "Common failure", v: "Battery, controller, transfer switch" },
      { k: "Key habit", v: "Yearly pro service" },
    ],
    faqs: [
      { q: "How long does a standby generator last?", a: "About 10 to 14 years with yearly service." },
      { q: "How often should a standby generator be serviced?", a: "Once a year at minimum, with an oil and filter change, plus a load test on the transfer switch." },
      { q: "Why did my generator fail during a hurricane?", a: "Usually a dead battery, a stuck transfer switch, or fuel that was not maintained. All are prevented by yearly service." },
      { q: "Do I really need the weekly self-test?", a: "Yes. Skipping it is the most common reason a generator will not start when a real outage hits." },
    ],
    floridaNote:
      "Hurricane season is what standby generators are for in Florida. Schedule service in the spring so the unit is ready before June, not during a storm warning.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  toilet: {
    slug: "toilet",
    hiddenRisk:
      "The fill valve and supply line are cheap parts that fail, and a burst toilet supply line is a classic overnight flood.",
    label: "Toilet",
    h1: "How long does a toilet last, and how do you extend it?",
    metaDescription:
      "The bowl of a toilet lasts decades, often 50+ years. The tank parts wear out about every 5 years. Here is how to keep both healthy.",
    quickAnswer:
      "The porcelain bowl of a toilet lasts decades, often 50 or more years. The tank parts, the flapper and fill valve, wear out about every 5 years. Silent leaks from a bad flapper are the most common preventable problem.",
    overview:
      "A toilet is really two products in one. The porcelain lasts practically forever, and the working parts inside the tank wear out on a much shorter cycle. Once you know that, maintenance is mostly about the tank.",
    neglected: 5,
    maintained: 5,
    expectedLifeOnly: true,
    expectedLife: "The porcelain bowl lasts decades, often 50 or more years. The tank parts inside, the flapper and fill valve, wear out about every 5 years.",
    maintenance: [
      { task: "Replace the flapper", frequency: "Every 4 to 5 years", effect: "A worn flapper is the number one cause of silent leaks that quietly run up the water bill.", impact: "High" },
      { task: "Replace the fill valve", frequency: "Every 5 to 7 years", effect: "A failing fill valve causes constant running or slow refills.", impact: "High" },
      { task: "Test for silent leaks", frequency: "Yearly", effect: "Put a few drops of food coloring in the tank. If it shows in the bowl in 15 minutes without flushing, the flapper is leaking.", impact: "High" },
      { task: "Check the supply line and shutoff", frequency: "Yearly", effect: "The braided line and the angle stop age, and a burst line is a big water damage event.", impact: "Medium" },
      { task: "Reseat with a new wax ring if it ever rocks", frequency: "As needed", effect: "A rocking toilet breaks the seal, which leaks under the floor.", impact: "Medium" },
    ],
    signs: [
      "The tank refills on its own without a flush (a running toilet)",
      "A slow or weak flush",
      "Water on the floor at the base",
      "The bowl loses water level between flushes",
      "Rocking or feeling loose",
    ],
    repairOrReplace:
      "Almost everything in a toilet is repairable. Replace the whole unit only if the porcelain is cracked or you want a higher-efficiency model.",
    facts: [
      { k: "Bowl life", v: "50+ years" },
      { k: "Flapper", v: "About every 5 years" },
      { k: "Fill valve", v: "About every 5 to 7 years" },
      { k: "Silent leaks", v: "The single most common preventable water waste" },
    ],
    faqs: [
      { q: "How long does a toilet last?", a: "The porcelain bowl lasts 50 or more years. The tank parts wear out about every 5 to 7 years." },
      { q: "How do I check for a silent toilet leak?", a: "Put food coloring in the tank, wait 15 minutes, do not flush. If color appears in the bowl, the flapper is leaking." },
      { q: "How often should I replace the flapper?", a: "Every 4 to 5 years, or any time you notice the tank refilling on its own." },
      { q: "When should I replace a whole toilet?", a: "Only if the porcelain cracks or you want a modern high-efficiency model to cut water use." },
    ],
    floridaNote:
      "A silent toilet leak is the fastest way to run up a Florida water bill. Test with food coloring once a year.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "electrical-panel": {
    slug: "electrical-panel",
    hiddenRisk:
      "An old, undersized, or recalled panel, plus Florida's coastal corrosion, is a fire and shock risk; some brands are known hazards. A do-not-DIY safety item.",
    label: "Electrical panel",
    h1: "How long does an electrical panel last, and when should it be replaced?",
    metaDescription:
      "A service panel can last around 60 years, but it is replaced when it is outdated, undersized, or unsafe, not when it wears out.",
    quickAnswer:
      "A service panel can last around 60 years, but it is replaced when it is outdated, undersized, or unsafe, not when it wears out. Recalled brands, breakers that trip often, a warm panel, or not enough capacity all mean call an electrician.",
    overview:
      "Electrical panels do not really wear out on a clock. They get replaced because they are unsafe, undersized, or from a brand that has been recalled. Knowing when to upgrade is more important than knowing how many years are left.",
    neglected: 60,
    maintained: 60,
    expectedLifeOnly: true,
    expectedLife: "A service panel can last around 60 years, but panels are replaced when they are outdated, undersized, or unsafe, not on a fixed schedule. The reason for replacement is what matters, not the age.",
    maintenance: [
      { task: "Recalled or problem brands: replace", frequency: "As soon as identified", effect: "Federal Pacific (Stab-Lok), Zinsco, and certain Challenger panels have documented failure histories. If you have one, it is a replacement conversation.", impact: "High" },
      { task: "Panel warm to the touch or humming: call an electrician", frequency: "Immediately", effect: "This is a fire risk. Do not wait.", impact: "High" },
      { task: "Frequent breaker trips: have it diagnosed", frequency: "As they happen", effect: "Could be a bad breaker, an overloaded circuit, or a panel that is undersized for modern loads.", impact: "High" },
      { task: "Not enough capacity for EV, heat pump, or additions: upgrade", frequency: "When planning", effect: "Adding modern loads to an old panel is when most panel upgrades happen.", impact: "High" },
      { task: "Have the panel inspected", frequency: "Every 10 years, or with a new home", effect: "A licensed electrician catches loose lugs, corrosion, and moisture damage.", impact: "Medium" },
      { task: "Keep three feet of clearance in front of the panel", frequency: "Ongoing", effect: "Required by code, and it matters if you ever need to shut off the main in a hurry.", impact: "Medium" },
    ],
    signs: [
      "Breakers that trip repeatedly",
      "The panel is warm to the touch",
      "A buzzing or humming sound from the panel",
      "Burn marks, rust, or moisture inside",
      "You have a recalled brand (Federal Pacific, Zinsco, some Challenger)",
      "Flickering lights across the house",
      "You are adding an EV charger, heat pump, or major addition",
    ],
    repairOrReplace:
      "Individual breakers can be replaced. If the panel itself is a recalled brand, undersized, or damaged, replace the panel. This is licensed electrician work, not DIY.",
    facts: [
      { k: "Typical age", v: "Around 60 years" },
      { k: "Reason to replace", v: "Recall, unsafe condition, or undersized" },
      { k: "Recalled brands", v: "Federal Pacific, Zinsco, some Challenger" },
      { k: "Do not DIY", v: "Panel work is licensed electrician work" },
    ],
    faqs: [
      { q: "How long does an electrical panel last?", a: "A panel can last around 60 years, but they are replaced when they are unsafe, undersized, or from a recalled brand, not on a fixed schedule." },
      { q: "What are the recalled panel brands?", a: "Federal Pacific (Stab-Lok), Zinsco, and some Challenger panels have documented failure histories. If you have one, plan for a replacement." },
      { q: "Why do my breakers keep tripping?", a: "Either a bad breaker, an overloaded circuit, or a panel that is undersized for the house. Have an electrician diagnose it." },
      { q: "Can I replace an electrical panel myself?", a: "No. Panel work is licensed electrician work in every state. It is also a life-safety and code issue." },
    ],
    floridaNote:
      "Older Florida homes often have panels that predate modern loads. If you are adding a heat pump, EV charger, or major addition, an upgrade is often required, not optional.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

  "pest-termite": {
    slug: "pest-termite",
    hiddenRisk:
      "In Florida termites never stop, and a lapse in coverage lets an active colony do structural damage silently for months. The state is among the highest risk in the country.",
    label: "Pest and termite protection",
    h1: "How often does pest and termite protection need attention?",
    metaDescription:
      "Pest and termite protection is a cadence, not a lifespan. Annual inspection, an active bond, and moisture control are what actually protect the home.",
    quickAnswer:
      "Termite protection is a cadence, not a lifespan. The essentials are an annual termite inspection, keeping the bond or warranty active, re-treating on the recommended cycle, and fixing moisture and wood-to-soil contact around the house.",
    overview:
      "Termite protection is not something you buy once. It is a program you keep active. In Florida, where subterranean termites are relentless, letting the bond lapse is one of the most expensive mistakes a homeowner can make.",
    neglected: 0,
    maintained: 0,
    cadenceOnly: true,
    maintenance: [
      { task: "Annual termite inspection", frequency: "Yearly", effect: "Catches early tubes and swarms before structural damage.", impact: "High" },
      { task: "Keep the termite bond or warranty active", frequency: "Ongoing", effect: "Letting the bond lapse means paying for treatment and repair yourself.", impact: "High" },
      { task: "Re-treat on the recommended cycle", frequency: "Per the treatment type", effect: "Liquid treatments and bait systems each have their own re-treatment schedule.", impact: "High" },
      { task: "Fix moisture problems", frequency: "As found", effect: "Damp wood and standing water are what invite termites and other pests in.", impact: "High" },
      { task: "Eliminate wood-to-soil contact", frequency: "Ongoing", effect: "Mulch, firewood, and deck posts touching soil are direct paths in.", impact: "High" },
      { task: "Seal exterior gaps and screens", frequency: "Yearly", effect: "Blocks rodents, ants, and roaches, which is a big part of general pest control.", impact: "Medium" },
    ],
    signs: [
      "Mud tubes on the foundation or crawlspace walls",
      "Discarded wings near windows after a swarm",
      "Wood that sounds hollow when tapped",
      "Small piles of frass (termite droppings) that look like sawdust",
      "Buckling paint or bubbling drywall",
    ],
    repairOrReplace:
      "Treatment is the fix. Structural repair is separate work, done after the colony is treated. Keep the bond active so you are not paying twice.",
    facts: [
      { k: "Cadence", v: "Yearly inspection" },
      { k: "Bond", v: "Keep active, always" },
      { k: "Florida threat", v: "Subterranean termites are year round here" },
      { k: "Biggest mistake", v: "Letting the bond lapse" },
    ],
    faqs: [
      { q: "How often should I have a termite inspection?", a: "At least once a year, and any time you see mud tubes, swarms, or unexplained wood damage." },
      { q: "Is a termite bond worth it in Florida?", a: "Yes. Subterranean termites are active year round in Florida, and a bond covers both re-treatment and (with the right plan) structural repair." },
      { q: "What are the signs of termites?", a: "Mud tubes, discarded wings, hollow-sounding wood, and small piles of frass that look like coffee grounds or sawdust." },
      { q: "Can I do termite treatment myself?", a: "For small ants and roaches, some DIY works. For termites, use a licensed pest control company with a bond." },
    ],
    floridaNote:
      "Florida is one of the highest termite pressure states in the country. Subterranean termites are active year round here, so an active bond is not optional, it is baseline protection.",
    sources: [
      { label: "InterNACHI: Florida life expectancy chart", url: "https://www.nachi.org/florida-life-expectancy.htm" },
    ],
  },

};

/* Order used for "keep going" internal links and for the browse grid. */
export const GUIDE_ORDER: string[] = [
  "central-ac",
  "heat-pump",
  "furnace",
  "water-heater",
  "tankless-water-heater",
  "water-softener",
  "well-pump",
  "sump-pump",
  "garbage-disposal",
  "faucets",
  "toilet",
  "refrigerator",
  "dishwasher",
  "range-oven",
  "microwave",
  "washer",
  "dryer",
  "electrical-panel",
  "standby-generator",
  "roof",
  "gutters",
  "garage-door",
  "windows",
  "pool-equipment",
  "irrigation",
  "pest-termite",
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES[slug];
}

export function otherGuides(slug: string, count = 4): Guide[] {
  return GUIDE_ORDER.filter((s) => s !== slug)
    .slice(0, count)
    .map((s) => GUIDES[s]);
}
