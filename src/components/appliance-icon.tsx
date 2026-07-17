import type { LucideProps } from "lucide-react";
import {
  AirVent,
  CookingPot,
  Droplets,
  Flame,
  Microwave,
  Refrigerator,
  Snowflake,
  Thermometer,
  Toilet,
  Trash2,
  Warehouse,
  WashingMachine,
  Waves,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

type ApplianceIconProps = Omit<LucideProps, "ref"> & {
  type?: string | null;
};
type SvgIconProps = Omit<ApplianceIconProps, "type">;

export function ApplianceIcon({ type, ...props }: ApplianceIconProps) {
  const name = (type ?? "").trim().toLowerCase();

  if (has(name, "sink", "faucet")) return <SinkIcon {...props} />;
  if (has(name, "dishwasher")) return <DishwasherIcon {...props} />;
  if (has(name, "refrigerator", "fridge")) return <Refrigerator {...props} />;
  if (has(name, "freezer")) return <Snowflake {...props} />;
  if (has(name, "washer", "washing machine")) return <WashingMachine {...props} />;
  if (has(name, "dryer")) return <Wind {...props} />;
  if (has(name, "microwave")) return <Microwave {...props} />;
  if (has(name, "range", "oven", "stove", "cooktop")) return <CookingPot {...props} />;
  if (has(name, "hvac", "air conditioner", "air conditioning", "a/c")) {
    return <AirVent {...props} />;
  }
  if (has(name, "furnace", "boiler", "fireplace")) return <Flame {...props} />;
  if (has(name, "water heater", "hot water")) return <Thermometer {...props} />;
  if (has(name, "softener", "water filter", "reverse osmosis", "filtration")) {
    return <Droplets {...props} />;
  }
  if (has(name, "toilet")) return <Toilet {...props} />;
  if (has(name, "garbage disposal")) return <Trash2 {...props} />;
  if (has(name, "garage door")) return <Warehouse {...props} />;
  if (has(name, "sump pump", "well pump", "pool pump", "pump")) return <Waves {...props} />;
  if (has(name, "generator", "electrical", "battery", "charger")) return <Zap {...props} />;

  return <Wrench {...props} />;
}

function has(name: string, ...terms: string[]) {
  return terms.some((term) => name.includes(term));
}

function SinkIcon({ size = 24, ...props }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 12h16v1a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-1Z" />
      <path d="M8 12V8a4 4 0 0 1 4-4h2" />
      <path d="M14 4v3" />
      <path d="M17 7h-6" />
    </svg>
  );
}

function DishwasherIcon({ size = 24, ...props }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M5 7h14" />
      <path d="M8 4.5h.01M11 4.5h.01" />
      <circle cx="12" cy="14.5" r="4.5" />
      <path d="m9.5 15.5 1.5-2 1.5 2 1.5-2 1 1.4" />
    </svg>
  );
}
