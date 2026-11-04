import { AccountNav } from "@/components/account/AccountNav";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireUser("/cuenta");
  return (
    <div className="mx-auto max-w-6xl px-6 pt-32">
      <p className="eyebrow">Mi cuenta</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Hola, {profile?.full_name?.split(" ")[0] || user.email?.split("@")[0]}</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
