import { AppHeader, LoginForm, ParticlesBackground } from "@/components";
import { getSessionUser } from "@/lib/auth";
import { cognitoEnabled } from "@/lib/authMode";
import { REAUTH_COOKIE } from "@/lib/cognitoOidc";
import { getRedirectTargetForPathname, LOGIN_PATH } from "@/lib/platformAccess";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Innova Coin",
  description: "",
};


export default async function LoginPage() {
  if (cognitoEnabled()) {
    const jar = await cookies();
    if (jar.get(REAUTH_COOKIE)?.value === "1") {
      redirect("/auth/login");
    }
  }

  const sessionUser = await getSessionUser();
  const redirectTo = getRedirectTargetForPathname(sessionUser, LOGIN_PATH);

  if (redirectTo) {
    redirect(redirectTo);
  }

  return (
    <>
      <AppHeader centerBrand />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pt-20 pb-3 sm:px-6 sm:pt-23 sm:pb-6">
        <div className="absolute inset-0 z-0 bg-[#121826]" />
        <ParticlesBackground />
        <div className="relative z-10">
          <LoginForm />
        </div>
      </main>
    </>
  );
}
