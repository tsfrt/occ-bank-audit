"use client";

import { usePathname } from "next/navigation";
import { CaseSummaryBar } from "./CaseSummaryBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <>
      {!isLanding && <CaseSummaryBar />}
      {children}
    </>
  );
}
