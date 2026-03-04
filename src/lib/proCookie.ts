import { cookies } from "next/headers";

export async function isProFromCookies() {
  const store = await cookies();
  return store.get("bp_pro")?.value === "1";
}