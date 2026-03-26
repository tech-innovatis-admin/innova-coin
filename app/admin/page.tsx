import AppHeader from "../_components/app-header";
import AdminForm from "../_components/admin-form";
import { mockAdmin, mockHeads } from "@/lib/mock-data";

export const metadata = {
  title: "Painel Administrativo",
  description: "",
};

export default function AdminPage() {
  return (
    <>
      <AppHeader
        profileMode="admin"
        userName={mockAdmin.name}
        userPhoto={mockAdmin.photoUrl}
      />
      <main className="flex flex-1 overflow-y-auto overflow-x-hidden px-6 pt-20 pb-8">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
              Heads e saldos pendentes
            </h1>
          </div>

          <AdminForm heads={mockHeads} />
        </section>
      </main>
    </>
  );
}
