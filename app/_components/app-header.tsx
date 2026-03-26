"use client";

import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import UserAvatar from "./user-avatar";

type AppHeaderProps = {
  activePath?: "/login" | "/dashboard" | "/admin";
  showAdminNav?: boolean;
  profileMode?: "guest" | "user" | "admin";
  userName?: string;
  userPhoto?: string | null;
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
  profileMode = "guest",
  userName,
  userPhoto,
}: AppHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-17 border-b border-white/8 bg-[#131c2f] shadow-[0_12px_28px_rgba(7,11,20,0.24)]">
      <div className="mx-auto flex h-17 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-16 items-center justify-center rounded-full bg-white/4 ring-1 ring-white/8">
            <Image
              src="/logo_innovatis_oficial.svg"
              alt="Innovatis Logo"
              width={42}
              height={42}
              className="h-10 w-10 object-contain brightness-0 invert"
            />
          </div>

          <span className="bg-[linear-gradient(90deg,#f8fafc_0%,#dde5ef_42%,#bcc6d3_100%)] bg-clip-text text-[2rem] font-extrabold tracking-[0.14em] text-transparent sm:text-[2.2rem]">
            INNOVA COINS
          </span>
        </div>

        <div className="flex items-center gap-3">
          {showAdminNav ? (
            <nav className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 p-1">
              {links.map((link) => {
                const active = activePath === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex h-9 items-center rounded-full px-4 text-sm transition ${
                      active
                        ? "bg-[#dbe4ee] text-[#131c2f]"
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
                name={userName ?? "Usuario"}
                photoUrl={userPhoto}
                size="sm"
              />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sair
                </button>
              </form>
            </>
          ) : null}

          {profileMode === "admin" ? (
            <>
              <UserAvatar
                name={userName ?? "Admin"}
                photoUrl={userPhoto}
                size="sm"
              />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sair
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
