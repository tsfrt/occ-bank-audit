import { cookies } from "next/headers";

const USER_COOKIE_NAME = "occ_analyst_user";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_COOKIE_NAME)?.value ?? null;
}
