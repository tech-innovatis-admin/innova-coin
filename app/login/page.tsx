import AppHeader from "../_components/app-header";
import LoginForm from "../_components/login-form";
import ParticlesBackground from "../_components/particles-background";
import { getSessionUser } from "@/lib/auth";
import { getRedirectTargetForPathname, LOGIN_PATH } from "@/lib/platform-access";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Innova Coin",
  description: "",
};


export default async function LoginPage() {
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
