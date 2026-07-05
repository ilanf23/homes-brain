## The problem

Homeowners who sign up without an address (a supported flow) have no `home` row yet. Every `/home/*` sub-page currently guards on `if (!home) return <NoHomeYet />`, which renders a standalone "No home claimed yet · Go to HomesBrain" dead-end that goes nowhere useful. Only `/home` itself shows the proper inline "Add your home" onboarding.

## The fix

Remove the `NoHomeYet` dead-end entirely and route those users to `/home`, where the inline onboarding (`OnboardingNoHome`) already lets them add their address in one step.

## Changes

1. **Delete `NoHomeYet`** from `src/components/home-shell.tsx` (component, `LogoMark` import if unused after).
2. **Update every caller** to navigate to `/home` instead when `home` is null, showing a small `PageLoader` during the redirect tick:
   - `src/routes/home.appliances.tsx`
   - `src/routes/home.add.tsx`
   - `src/routes/home.settings.tsx`
   - `src/routes/home.reminders.tsx`
   - `src/routes/home.pros.tsx`
   - `src/routes/home.items.$itemId.tsx`
3. **Drop the `NoHomeYet` import** in each of those files.

## Result

Clicking the Appliances tab (or any other sub-tab) before a home is set up lands the user on `/home`, where they can add their address inline and continue. No dead ends, no lost taps.
