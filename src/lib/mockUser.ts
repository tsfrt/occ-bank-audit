/**
 * Mock user for demo/authentic feel. Not real auth — pretend session only.
 */
export const MOCK_USER = {
  name: "Jane Mitchell",
  role: "Senior Audit Analyst",
} as const;

/** Initials from full name (e.g. "Jane Mitchell" → "JM") */
export function getMockUserInitials(): string {
  return MOCK_USER.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
