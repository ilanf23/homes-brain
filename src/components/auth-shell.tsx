import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/svg";
import { LanguageToggle, useT } from "@/lib/i18n";

/* Single-column shell for the auth pages (/login, /reset-password):
   logo top-left, form column vertically centered, muted footer line. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const t = useT();
  return (
    <div className="font-app min-h-dvh bg-soft text-ink">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="group inline-flex w-fit items-center gap-2.5">
            <Logo markClassName="transition-transform duration-300 group-hover:rotate-[-6deg]" />
          </Link>
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="text-center text-xs text-muted">
          {footer ?? <span>{t("login.footer")}</span>}
        </div>
      </div>
    </div>
  );
}
