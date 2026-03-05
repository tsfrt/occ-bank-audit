"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaseSummaryBar } from "./CaseSummaryBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <h1 className="text-xl font-semibold">
          <Link href="/dashboard" className="hover:underline">
            Bank Audit Analyst – Office of the Comptroller
          </Link>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage audit cases, run AI analysis, and review outcomes
        </p>
      </header>
      <CaseSummaryBar />
      {children}
    </div>
  );
}
