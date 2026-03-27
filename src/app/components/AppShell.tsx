"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaseSummaryBar } from "./CaseSummaryBar";
import { NotificationBell } from "./NotificationBell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-nav-bg text-nav-text px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40 text-white/90 flex-shrink-0"
                aria-hidden
              >
                <span className="text-xs font-bold tracking-tight">OCC</span>
              </div>
              <h1 className="text-lg font-semibold">
                <Link href="/dashboard" className="hover:text-white/80 transition-colors">
                  Bank Audit Analyst
                </Link>
              </h1>
            </div>
            <p className="text-sm text-white/70 mt-1 ml-12">
              Office of the Comptroller of the Currency
            </p>
          </div>
          <NotificationBell />
        </div>
      </header>
      <CaseSummaryBar />
      {children}
    </div>
  );
}
