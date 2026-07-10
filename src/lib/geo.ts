/* Client helpers for the `geo` edge function (Google Maps proxy). All calls go
   through supabase.functions.invoke so the API key stays server-side. None of
   these throw: on any failure they resolve to null / [] so the UI degrades to a
   plain editable text field. */

import { supabase } from "@/integrations/supabase/client";

export type AddressPrediction = { placeId: string; description: string };
export type ResolvedAddress = { address: string; lat: number | null; lng: number | null };

/* A Places session token groups the autocomplete keystrokes + the one details
   lookup into a single billed session. Make one per editing session. */
export function newSessionToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

async function call<T>(body: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke("geo", { body });
    if (error || !data) return fallback;
    return data as T;
  } catch {
    return fallback;
  }
}

export async function placeAutocomplete(
  input: string,
  bias: { lat: number; lng: number } | null,
  sessionToken: string,
): Promise<AddressPrediction[]> {
  if (input.trim().length < 3) return [];
  const data = await call<{ predictions?: AddressPrediction[] }>(
    { op: "autocomplete", input, sessionToken, lat: bias?.lat, lng: bias?.lng },
    {},
  );
  return data.predictions ?? [];
}

export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<ResolvedAddress | null> {
  const data = await call<{ address?: string | null; lat?: number | null; lng?: number | null }>(
    { op: "details", placeId, sessionToken },
    {},
  );
  if (!data.address) return null;
  return { address: data.address, lat: data.lat ?? null, lng: data.lng ?? null };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedAddress | null> {
  const data = await call<{ address?: string | null; lat?: number | null; lng?: number | null }>(
    { op: "reverse", lat, lng },
    {},
  );
  if (!data.address) return null;
  return { address: data.address, lat: data.lat ?? lat, lng: data.lng ?? lng };
}

export async function forwardGeocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const data = await call<{ lat?: number | null; lng?: number | null }>(
    { op: "forward", address },
    {},
  );
  if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
  return { lat: data.lat, lng: data.lng };
}

export type BusinessCandidate = {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string;
};

/* Google Business listing search for the GoogleConnect flow. Soft-fails to []
   so the UI degrades to the paste-a-link fallback. */
export async function findBusiness(
  query: string,
  area: string | null,
): Promise<BusinessCandidate[]> {
  if (query.trim().length < 2) return [];
  const data = await call<{ candidates?: BusinessCandidate[] }>(
    { op: "findBusiness", query: query.trim(), area: area?.trim() || undefined },
    {},
  );
  return data.candidates ?? [];
}
