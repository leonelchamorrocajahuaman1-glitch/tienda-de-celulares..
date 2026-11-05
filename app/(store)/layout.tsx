import { CartDrawer } from "@/components/store/CartDrawer";
import { CartSync } from "@/components/store/CartSync";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { PreviewNotice } from "@/components/store/PreviewNotice";
import { getSession } from "@/lib/auth";
import { getBrands, getStoreSettings } from "@/lib/data/catalog";
import { isSupabaseConfigured } from "@/lib/env";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [session, settings, brands] = await Promise.all([getSession(), getStoreSettings(), getBrands().catch(() => [])]);
  const user = session
    ? {
        name: session.profile?.full_name?.split(" ")[0] || session.user.email?.split("@")[0] || "Mi cuenta",
        isAdmin: session.profile?.role === "admin",
      }
    : null;
  return (
    <>
      <Header user={user} announcement={settings.announcement || undefined} />
      {!isSupabaseConfigured && <PreviewNotice />}
      <main id="contenido">{children}</main>
      <Footer settings={settings} brands={brands} />
      <CartDrawer />
      <CartSync loggedIn={Boolean(session)} />
    </>
  );
}
