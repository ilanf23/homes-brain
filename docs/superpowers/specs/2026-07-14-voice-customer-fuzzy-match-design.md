# Voice customer fuzzy match on review

Date: 2026-07-14. Status: approved by Ilan (conversationally), building now.

## Problem

`matchVoiceCustomer` in `src/lib/customer-match.ts` matches the spoken customer
name exactly (after normalization). When the AI transcription mishears a name
("Kristen" heard as "Christian"), nothing matches, the flow falls into the
new-customer path, and saving creates a duplicate customer plus a duplicate
home. The pro never notices until their customer list has two of the same
person. There is also no way to re-link the record to an existing customer from
the review slide: editing the customer row is a free-text rename only.

## What we are building

1. **"Did you mean?" card on the review slide.** Whenever the record is about
   to create a new customer and the name is close (edit distance, sounds-alike,
   or first-name-vs-full-name) to someone on file, show a card under the
   Customer row: "This sounds like **Christian Miller** · 123 Maple St" with
   "Yes, it's them" and "No, new customer". One tap on yes links the job to
   that customer. Applies to both the voice flow and manual typing. Never
   auto-links: always one tap to confirm, per the existing "when in doubt, do
   not guess" rule.
2. **Customer picker in the review name editor.** Tapping to edit the customer
   name on review shows existing customers (name + address) beneath the input,
   filtered as the pro types, closest first. Picking one links the record to
   them; free text still works for a genuinely new person.

## Behavior on link

- The record shows the name as saved on file, not the misheard spelling.
- The job address the pro captured (spoken or GPS) wins; the customer's on-file
  address is the fallback when none was captured. When re-linking from one
  customer to another and the current address is just the old customer's
  on-file address, swap to the new customer's on-file address.
- A spoken email wins; the on-file email fills the gap. Phone and locale come
  from the file (same as picking the customer on step 1).
- Dismissing the card ("No, new customer") remembers the dismissed name, so the
  card does not nag again unless the name changes.

## Implementation

- `src/lib/customer-match.ts`: add pure helpers next to the existing matcher:
  a small Levenshtein, a phonetic key for spoken names (c/k, ph/f, silent h,
  dropped vowels), `nameCloseness(spoken, onFile)` returning 0..1, and
  `suggestCloseCustomers(existing, name)` returning ranked candidates at or
  above a 0.7 threshold (phonetic equality only counts when literal similarity
  clears 0.45, so Jane does not suggest John). No server round trip: the pro's
  customer list is already loaded on the screen.
- `src/routes/pro.jobs.new.tsx`: a `linkExistingCustomer()` helper shared by
  the card and the picker; the card renders under the Customer row when no
  customer is linked and a close candidate exists; the review editor for the
  customer row gains the picker list. Linking naturally re-triggers the
  existing effect that reloads the units on file for the home.

Out of scope: nickname mapping (Mike vs Michael), changes to the AI extract
edge function, new analytics events.
