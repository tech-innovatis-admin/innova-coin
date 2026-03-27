"use client";

import { useState } from "react";

import { type DashboardUser } from "@/lib/heads";
import AppHeader from "./app-header";
import HeadDashboardPanel from "./head-dashboard-panel";

type DashboardContentProps = {
  initialUser: DashboardUser;
};

export default function DashboardContent({ initialUser }: DashboardContentProps) {
  const [user] = useState<DashboardUser>(initialUser);

  return (
    <>
      <AppHeader profileMode="user" userName={user.name} userPhoto={user.photoUrl} />
      <main className="mt-17 flex flex-1 overflow-hidden px-6 pt-3 pb-4">
        <HeadDashboardPanel user={user} />
      </main>
    </>
  );
}
