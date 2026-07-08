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
    neglected: 12,
    maintained: 18,
    maintenance: [
      { task: "Change the filters", frequency: "On schedule (monthly to quarterly)", effect: "Keeps airflow up and the blower easy." },
      {
        task: "Keep the coils clean",
        frequency: "At every service",
        effect: "Humidity breeds mold on coils and in ducts, which chokes airflow.",
      },
      { task: "Have it serviced", frequency: "Twice a year", effect: "Catches capacitor and refrigerant issues before they kill the compressor." },
      { task: "Confirm the unit is correctly sized", frequency: "At install", effect: "Oversized units short-cycle and wear out early." },
      { task: "Keep the condensate drain clear", frequency: "Yearly", effect: "Prevents shutoffs and water damage." },
    ],
    facts: [
      { k: "Expected life in FL", v: "10 to 15 years" },
      { k: "Common failure", v: "Compressor, coil, capacitor" },
      { k: "Recall status", v: "Check by model" },
    ],
    floridaNote:
      "Heat, humidity, and coastal salt air all shorten AC life here. Maintenance is what separates 10 years from 15.",
    sources: [
      { label: "Florida Airflow: HVAC life expectancy in Florida", url: "https://floridaairflow.com/hvac-life-expectancy-florida/" },
      { label: "InterNACHI: Florida component life expectancy", url: "https://www.nachi.org/florida-life-expectancy.htm" },
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
    neglected: 15,
    maintained: 25,
    maintenance: [
      { task: "Inspect the roof", frequency: "Yearly and after major storms", effect: "Catches lifted shingles and flashing issues while they are still cheap." },
      { task: "Fix small leaks and lifted shingles early", frequency: "As found", effect: "Prevents decking rot underneath." },
      { task: "Keep attic ventilation good", frequency: "Ongoing", effect: "Cuts thermal stress that ages shingles from the underside." },
      { task: "Keep gutters clear", frequency: "Twice a year", effect: "Stops water from backing up under the edge." },
      { task: "Log the roof age and any wind mitigation", frequency: "Once", effect: "Helps at insurance and resale time." },
    ],
    facts: [
      { k: "Asphalt shingle", v: "15 to 25 years" },
      { k: "Metal", v: "40 to 70 years" },
      { k: "Tile", v: "50+ years" },
      { k: "Common issue", v: "Sun, heat, and storm wear" },
    ],
    floridaNote:
      "UV, heat, humidity, and hurricanes are all hard on shingles. A wind-mitigation inspection can lower your insurance and extend the roof's useful life.",
    sources: [
      { label: "Trust Roofing: shingle roof lifespan in Florida", url: "https://trustroofing.com/blog/shingle-roof-lifespan-in-florida/" },
      { label: "InterNACHI: Florida component life expectancy", url: "https://www.nachi.org/florida-life-expectancy.htm" },
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
    neglected: 8,
    maintained: 13,
    maintenance: [
      { task: "Clean the lint trap", frequency: "Every load", effect: "Keeps airflow up and dry times down." },
      { task: "Clean the full vent line", frequency: "At least yearly", effect: "Fixes the real fire risk, not just the visible lint." },
      { task: "Do not overload the drum", frequency: "Every load", effect: "Prevents motor and belt strain." },
      { task: "Check the exterior vent flap", frequency: "Yearly", effect: "Blocked flaps trap moisture and reduce efficiency." },
    ],
    facts: [
      { k: "Expected life", v: "7 to 13 years" },
      { k: "Common failure", v: "Heating element, thermal fuse" },
      { k: "Safety note", v: "Clogged vents are a leading cause of dryer fires" },
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
    neglected: 9,
    maintained: 12,
    maintenance: [
      { task: "Clean the filter", frequency: "Monthly", effect: "Prevents drainage and odor issues." },
      { task: "Run a descaler or dishwasher cleaner", frequency: "Regularly, especially in hard water", effect: "Stops scale from clogging the spray arms and pump." },
      { task: "Scrape, do not pre-rinse", frequency: "Every load", effect: "The detergent needs food to grab onto to work well." },
      { task: "Check and clean the spray arms", frequency: "Every few months", effect: "Restores cleaning power." },
    ],
    facts: [
      { k: "Expected life", v: "9 to 12 years" },
      { k: "Common failure", v: "Pump, drain, control board" },
    ],
    floridaNote:
      "Hard water scale builds fast here, so a regular descale is one of the highest-return chores you can do.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
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
    neglected: 10,
    maintained: 15,
    maintenance: [
      { task: "Keep the salt topped up", frequency: "Monthly check", effect: "The whole system stops working when salt runs out." },
      { task: "Break up any salt bridges in the tank", frequency: "As needed", effect: "Bridges look like a full tank but leave the softener starving." },
      { task: "Service or replace the resin bed", frequency: "Every several years", effect: "Restores capacity as resin wears." },
      { task: "Clean the brine tank", frequency: "Periodically", effect: "Prevents sludge and valve problems." },
    ],
    facts: [
      { k: "Expected life", v: "10 to 15 years" },
      { k: "Common failure", v: "Resin wear, valve" },
    ],
    floridaNote:
      "Hard water is the norm here, so a working softener extends the life of your water heater, dishwasher, and fixtures too.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
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
    neglected: 13,
    maintained: 16,
    maintenance: [
      { task: "Clean the condenser coils", frequency: "Twice a year", effect: "Lets the compressor breathe, which is what usually kills the fridge." },
      { task: "Check and clean the door seals", frequency: "Every few months", effect: "Keeps cold in and the compressor from over-running." },
      { task: "Keep it level so the doors seal", frequency: "Once", effect: "Small tilts cause seal problems and drainage issues." },
      { task: "Do not overpack the vents", frequency: "Ongoing", effect: "Blocked vents create warm spots and short-cycle the compressor." },
    ],
    facts: [
      { k: "Expected life", v: "About 13 to 16 years" },
      { k: "Common failure", v: "Compressor, seals" },
    ],
    floridaNote:
      "Heat makes the compressor work harder, so coil cleaning matters more in a warm garage or hot kitchen.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
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
    neglected: 8,
    maintained: 12,
    barsLabel: "the pump",
    maintenance: [
      { task: "Keep water chemistry balanced", frequency: "Weekly", effect: "The single biggest driver of equipment life." },
      { task: "Clean the pump basket and filter", frequency: "Regularly", effect: "Protects the motor from strain and premature failure." },
      { task: "Do not run the pump dry", frequency: "Always", effect: "A few minutes dry can destroy the seals." },
      { task: "Service the heater before season", frequency: "Yearly", effect: "Catches ignition and heat-exchanger issues early." },
    ],
    facts: [
      { k: "Pump", v: "About 8 to 12 years" },
      { k: "Heater", v: "About 5 to 10 years" },
      { k: "Filter", v: "10+ years" },
      { k: "Common failure", v: "Pump motor, heater" },
    ],
    floridaNote:
      "Near-year-round use and heat mean pool equipment works harder here than in most of the country.",
    sources: [
      { label: "Family Handyman: home appliance lifespans", url: "https://www.familyhandyman.com/article/home-appliances-lifespan/" },
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
