import { useEffect, useRef, useState } from "react";
import { Input } from "@/lib/ui";
import {
  newSessionToken,
  placeAutocomplete,
  placeDetails,
  type AddressPrediction,
  type ResolvedAddress,
} from "@/lib/geo";

/* Address input with Google Places autocomplete. The visible value is fully
   controlled by the parent (so it can prefill from GPS / a customer on file).
   Typing runs a debounced, session-tokened autocomplete; picking a suggestion
   fills the canonical formatted address and reports its coordinates via
   onResolve. If the geo backend is unavailable it silently behaves as a plain
   text field. */
export function AddressField({
  value,
  onChange,
  onResolve,
  bias,
  placeholder,
  autoFocus,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onResolve: (r: ResolvedAddress) => void;
  bias?: { lat: number; lng: number } | null;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const tokenRef = useRef(newSessionToken());
  // Suppress the next autocomplete run (used right after a programmatic pick).
  const suppressRef = useRef(false);

  const biasLat = bias?.lat ?? null;
  const biasLng = bias?.lng ?? null;

  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setPredictions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const b = biasLat != null && biasLng != null ? { lat: biasLat, lng: biasLng } : null;
      const preds = await placeAutocomplete(q, b, tokenRef.current);
      setPredictions(preds);
      setOpen(preds.length > 0);
      setActive(-1);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, biasLat, biasLng]);

  async function pick(pred: AddressPrediction) {
    suppressRef.current = true;
    onChange(pred.description);
    setQuery(pred.description);
    setOpen(false);
    setPredictions([]);
    const details = await placeDetails(pred.placeId, tokenRef.current);
    // A completed autocomplete+details pair closes the billing session.
    tokenRef.current = newSessionToken();
    onResolve(details ?? { address: pred.description, lat: null, lng: null });
  }

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
        }}
        onFocus={() => {
          if (predictions.length) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on a suggestion registers before we close.
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open || predictions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % predictions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? predictions.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            void pick(predictions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-indigo/40 border-t-indigo animate-spin" />
      )}

      {open && predictions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-paper shadow-[0_16px_40px_-16px_rgba(22,22,15,0.35)]"
        >
          {predictions.map((p, i) => (
            <li key={p.placeId} role="option" aria-selected={i === active}>
              <button
                type="button"
                // onMouseDown (not onClick) so it fires before the input blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`block w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  i === active ? "bg-indigobg text-indigo" : "text-ink hover:bg-soft"
                }`}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
