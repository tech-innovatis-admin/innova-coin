import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRedirectTargetForPathname, LOGIN_PATH } from "@/lib/platformAccess";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const redirectTo = getRedirectTargetForPathname(sessionUser, "/");
  redirect(redirectTo ?? LOGIN_PATH);
}
