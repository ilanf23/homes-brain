import { createFileRoute, redirect } from "@tanstack/react-router";

// The pro portal's home is the dashboard (setup + top action). /pro redirects
// to /pro/dashboard so anything linking to /pro (nav, post-login, post-setup,
// old bookmarks) lands there. Log-a-job is always one tap away on the center +.
export const Route = createFileRoute("/pro/")({
  beforeLoad: () => {
    throw redirect({ to: "/pro/dashboard" });
  },
});
