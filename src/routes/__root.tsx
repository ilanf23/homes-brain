import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-ink">404</h1>
        <p className="mt-3 text-muted">That page doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-ink text-white px-5 py-2.5 text-sm font-semibold"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">Try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center rounded-full bg-ink text-white px-5 py-2.5 text-sm font-semibold"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HomesBrain: A Carfax for homes that writes itself" },
      {
        name: "description",
        content:
          "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life.",
      },
      { property: "og:title", content: "HomesBrain: A Carfax for homes that writes itself" },
      {
        property: "og:description",
        content:
          "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "HomesBrain: A Carfax for homes that writes itself" },
      {
        name: "twitter:description",
        content:
          "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/278656fc-01ae-495d-a5ae-0fbc73cf53ef/id-preview-0fb51eec--1c763d3d-217f-4cd0-82d6-c92c352b39c9.lovable.app-1782857254260.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/278656fc-01ae-495d-a5ae-0fbc73cf53ef/id-preview-0fb51eec--1c763d3d-217f-4cd0-82d6-c92c352b39c9.lovable.app-1782857254260.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      /* Brand guidelines: system font stack only, no web fonts. */
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
