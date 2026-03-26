import AppHeader from "../_components/app-header";
import LoginForm from "../_components/login-form";
import ParticlesBackground from "../_components/particles-background";

export const metadata = {
  title: "Innova Coins",
  description: "",
};


export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 pt-23 pb-6">
        <div className="absolute inset-0 z-0 bg-[#121826]" />
        <ParticlesBackground />
        <div className="relative z-10">
          <LoginForm />
        </div>
      </main>
    </>
  );
}
