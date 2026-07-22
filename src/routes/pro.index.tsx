import { createFileRoute, redirect } from "@tanstack/react-router";

// Opening the app drops a pro straight onto the add-record action: /pro
// redirects to /pro/jobs/new so post-login, "Open app", and old bookmarks
// land on the one thing a pro is here to do. The dashboard is still its own
// tab (/pro/dashboard) in the nav for setup, due-for-service, and the rest.
export const Route = createFileRoute("/pro/")({
  beforeLoad: () => {
    throw redirect({ to: "/pro/jobs/new" });
  },
});
