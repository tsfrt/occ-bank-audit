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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white"
        aria-hidden
      >
        {initials}
      </span>
      <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[140px]">
        {MOCK_USER.name}
      </span>
    </div>
  );
}
