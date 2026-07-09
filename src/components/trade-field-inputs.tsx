import { Field, Input, Select } from "@/lib/ui";
import type { TradeField } from "@/lib/trade-fields";

/* Values are stored per-key. Store toggles as booleans; everything else as strings. */
export type AttributeValues = Record<string, string | boolean>;

/* Strip empty strings; keep booleans and non-empty scalars. */
export function cleanAttributes(values: AttributeValues): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/* Dynamic per-trade equipment fields. Renders each active field in sort order
   using the same design primitives (Field/Input/Select) as the rest of the
   log-a-job form. Two-column grid on wider screens matches the make/model row
   above it. */
export function TradeFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: TradeField[];
  values: AttributeValues;
  onChange: (key: string, value: string | boolean) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((f) => {
        const label = `${f.label}${f.unit ? ` (${f.unit})` : ""}${f.required ? " *" : ""}`;
        const raw = values[f.key];
        if (f.input_type === "select") {
          const strVal = typeof raw === "string" ? raw : "";
          return (
            <Field key={f.id} label={label} hint={f.help ?? undefined}>
              <Select value={strVal} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">Select…</option>
                {(f.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>
          );
        }
        if (f.input_type === "toggle") {
          const on = raw === true;
          return (
            <Field key={f.id} label={label} hint={f.help ?? undefined}>
              <button
                type="button"
                onClick={() => onChange(f.key, !on)}
                aria-pressed={on}
                className={`pressable flex w-full min-h-11 items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                  on ? "border-indigo bg-indigobg text-indigo" : "border-line bg-paper text-muted"
                }`}
              >
                <span className="font-semibold">{on ? "Yes" : "No"}</span>
                <span
                  className={`h-5 w-9 rounded-full transition-colors relative ${on ? "bg-indigo" : "bg-line"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-4" : "left-0.5"}`}
                  />
                </span>
              </button>
            </Field>
          );
        }
        const type =
          f.input_type === "number" ? "number" : f.input_type === "date" ? "date" : "text";
        const strVal = typeof raw === "string" ? raw : "";
        return (
          <Field key={f.id} label={label} hint={f.help ?? undefined}>
            <Input
              type={type}
              inputMode={f.input_type === "number" ? "decimal" : undefined}
              value={strVal}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </Field>
        );
      })}
    </div>
  );
}
