import { createFileRoute, redirect } from "@tanstack/react-router";

// The pro portal's home IS the log-a-job page. /pro redirects to
// /pro/jobs/new so anything linking to /pro (nav, external, old bookmarks)
// lands on the primary action.
export const Route = createFileRoute("/pro/")({
  beforeLoad: () => {
    throw redirect({ to: "/pro/jobs/new" });
  },
});
