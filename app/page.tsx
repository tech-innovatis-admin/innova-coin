import { redirect } from "next/navigation";
import { getSessionUser, isAdminRole } from "@/lib/auth";

export default async function Home() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  redirect(isAdminRole(sessionUser.role) ? "/admin" : "/dashboard");
}
