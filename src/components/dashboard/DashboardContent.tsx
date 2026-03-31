"use client";

import { type DashboardUser } from "@/lib/heads";
import AppHeader from "../shared/AppHeader";
import HeadDashboardPanel from "./HeadDashboardPanel";

type DashboardContentProps = {
  initialUser: DashboardUser;
};

export default function DashboardContent({ initialUser }: DashboardContentProps) {
  return (
    <>
      <AppHeader
        profileMode="user"
        userName={initialUser.name}
        userPhoto={initialUser.photoUrl}
      />
      <main className="mt-17 flex flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.08),transparent_22%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_48%,#f1f5f9_100%)] px-4 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-12 lg:px-10">
        <HeadDashboardPanel user={initialUser} />
      </main>
    </>
  );
}
