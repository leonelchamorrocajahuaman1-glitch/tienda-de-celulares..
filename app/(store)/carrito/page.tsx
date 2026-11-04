import { CartPage } from "@/components/cart/CartPage";
import { getStoreSettings } from "@/lib/data/catalog";

export const metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const settings = await getStoreSettings();
  return (
    <div className="mx-auto max-w-6xl px-6 pt-32">
      <p className="eyebrow">Tu selección</p>
      <h1 className="mb-8 mt-3 font-display text-4xl font-semibold">Carrito de compras</h1>
      <CartPage freeShippingFrom={settings.free_shipping_from} />
    </div>
  );
}
