import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "NEXPHONE — The future in your hands", template: "%s · NEXPHONE" },
  description:
    "Tienda premium de smartphones en Perú. Apple, Samsung, Xiaomi, Google Pixel y más, con experiencia 3D, envíos a todo el país y pago seguro.",
  applicationName: "NEXPHONE",
  openGraph: { type: "website", locale: "es_PE", siteName: "NEXPHONE" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#04050a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body>{children}</body>
    </html>
  );
}
