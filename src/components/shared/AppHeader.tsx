"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import UserAvatar from "./UserAvatar";

type AppHeaderProps = {
  activePath?: "/login" | "/dashboard" | "/admin";
  showAdminNav?: boolean;
  centerBrand?: boolean;
  profileMode?: "guest" | "user" | "admin";
  userName?: string;
  userPhoto?: string | null;
  headerAction?: {
    href: string;
    label: string;
  };
};

type HeaderPath = "/login" | "/dashboard" | "/admin";

const links: Array<{ href: HeaderPath; label: string }> = [
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
];

export default function AppHeader({
  activePath,
  showAdminNav = false,
  centerBrand = false,
  profileMode = "guest",
  userName,
  userPhoto,
  headerAction,
}: AppHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hideBrandTextOnMobile = profileMode !== "guest";

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      window.location.assign("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function renderLogoutButton() {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-px hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
        aria-label="Sair da plataforma"
      >
        {isLoggingOut ? "Saindo..." : "Sair"}
      </button>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-17 border-b border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(20,29,47,0.96))] shadow-[0_16px_36px_rgba(7,11,20,0.28)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_24%)]" />
      <div
        className={`relative mx-auto flex h-17 w-full max-w-6xl items-center px-4 sm:px-6 ${
          centerBrand ? "justify-center" : "justify-between"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(15,23,42,0.18)] ring-1 ring-white/8 backdrop-blur-md sm:h-14 sm:w-16">
            <Image
              src="/logo_innovatis_oficial.svg"
              alt="Innovatis Logo"
              width={42}
              height={42}
              className="h-8 w-8 object-contain brightness-0 invert sm:h-10 sm:w-10"
            />
          </div>

          <span
            className={`truncate bg-[linear-gradient(90deg,#f8fafc_0%,#dde5ef_42%,#bcc6d3_100%)] bg-clip-text text-base font-extrabold tracking-[0.08em] text-transparent sm:text-[2.2rem] sm:tracking-[0.14em] ${
              hideBrandTextOnMobile ? "hidden sm:inline" : ""
            }`}
          >
            INNOVA COIN
          </span>
        </div>

        <div
          className={`ml-3 flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto scrollbar-none sm:gap-3 ${centerBrand ? "hidden" : ""}`}
        >
          {showAdminNav ? (
            <nav className="scrollbar-none flex h-11 min-w-max items-center gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/[0.07] p-1 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-md">
              {links.map((link) => {
                const active = activePath === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex h-9 items-center rounded-full px-3 text-xs font-medium transition duration-300 sm:px-4 sm:text-sm ${
                      active
                        ? "bg-[#eef4fb] text-[#131c2f] shadow-[0_10px_22px_rgba(255,255,255,0.10)]"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {profileMode === "user" ? (
            <>
              <UserAvatar
                name={userName ?? "Usuário"}
                photoUrl={userPhoto}
                size="sm"
              />
              {headerAction ? (
                <Link
                  href={headerAction.href}
                  className="inline-flex max-w-[8.75rem] items-center justify-center truncate rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-px hover:bg-white/12 sm:max-w-none sm:px-4 sm:text-sm"
                >
                  {headerAction.label}
                </Link>
              ) : null}
              {renderLogoutButton()}
            </>
          ) : null}

          {profileMode === "admin" ? (
            <>
              <UserAvatar
                name={userName ?? "Admin"}
                photoUrl={userPhoto}
                size="sm"
              />
              {headerAction ? (
                <Link
                  href={headerAction.href}
                  className="inline-flex max-w-[8.75rem] items-center justify-center truncate rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-md transition duration-300 hover:-translate-y-px hover:bg-white/12 sm:max-w-none sm:px-4 sm:text-sm"
                >
                  {headerAction.label}
                </Link>
              ) : null}
              {renderLogoutButton()}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
