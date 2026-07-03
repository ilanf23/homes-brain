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
      { title: "HomesBrain — A Carfax for homes that writes itself" },
      {
        name: "description",
        content:
          "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life.",
      },
      { property: "og:title", content: "HomesBrain — A Carfax for homes that writes itself" },
      {
        property: "og:description",
        content:
          "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "HomesBrain — A Carfax for homes that writes itself" },
      { name: "twitter:description", content: "Home-service pros log a 30-second job and send a branded service record. Homeowners claim it free and own their home's history for life." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/278656fc-01ae-495d-a5ae-0fbc73cf53ef/id-preview-0fb51eec--1c763d3d-217f-4cd0-82d6-c92c352b39c9.lovable.app-1782857254260.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/278656fc-01ae-495d-a5ae-0fbc73cf53ef/id-preview-0fb51eec--1c763d3d-217f-4cd0-82d6-c92c352b39c9.lovable.app-1782857254260.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/svg+xml",
        href:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect x="1" y="1" width="26" height="26" rx="8" fill="#473fb0"/><path d="M7.5 13.5 14 8l6.5 5.5V20a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-6.5Z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="15" r="1.4" fill="#fff"/></svg>',
          ),
      },
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
