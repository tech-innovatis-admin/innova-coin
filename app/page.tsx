import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/platform-access";

export default async function Home() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const postLoginPath = getPostLoginPath(sessionUser.id);

  redirect(postLoginPath ?? "/login");
}
