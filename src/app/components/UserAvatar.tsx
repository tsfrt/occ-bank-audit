"use client";

import { MOCK_USER, getMockUserInitials } from "@/lib/mockUser";

export function UserAvatar() {
  const initials = getMockUserInitials();

  return (
    <div
      className="flex items-center gap-2 shrink-0"
      title={`${MOCK_USER.name} · ${MOCK_USER.role}`}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white dark:bg-zinc-300 dark:text-zinc-900"
        aria-hidden
      >
        {initials}
      </span>
      <span className="hidden sm:inline text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">
        {MOCK_USER.name}
      </span>
    </div>
  );
}
