import { notFound } from "next/navigation";
import { getStoreSettings } from "@/lib/data/catalog";

const PAGES: Record<string, { title: string; body: (s: { legal_name: string; email: string; address: string }) => string[] }> = {
  terminos: {
    title: "Términos y condiciones",
    body: (s) => [
      `Estos términos regulan las compras realizadas en NEXPHONE, operada por ${s.legal_name}.`,
      "Los precios se expresan en soles (S/) e incluyen IGV. El precio válido es el confirmado al momento de registrar el pedido; los importes se calculan en nuestros servidores.",
      "La compra se perfecciona cuando el pago es confirmado por la pasarela o validado por nuestro equipo en el caso de transferencias. Un pedido sin pago confirmado no reserva stock.",
      "Todos los equipos son nuevos y originales, con la garantía oficial de cada marca. Para ejercer la garantía conserva tu comprobante.",
      "Puedes solicitar el cambio o devolución dentro de los plazos de ley si el producto presenta fallas de fábrica o no corresponde a lo comprado.",
      `Consultas: ${s.email}.`,
    ],
  },
  privacidad: {
    title: "Política de privacidad",
    body: (s) => [
      `${s.legal_name} trata tus datos personales conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su reglamento.`,
      "Recopilamos los datos necesarios para gestionar tu cuenta, tus pedidos, entregas y comprobantes: nombre, correo, teléfono, documento y direcciones.",
      "Los datos de tarjetas son procesados directamente por la pasarela de pagos; NEXPHONE no almacena números de tarjeta.",
      "Cada cliente solo puede acceder a sus propios datos y pedidos. Aplicamos controles de acceso a nivel de base de datos.",
      `Puedes ejercer tus derechos ARCO escribiendo a ${s.email}.`,
    ],
  },
  envios: {
    title: "Envíos y entregas",
    body: (s) => [
      "Envío estándar a todo el Perú: 2 a 4 días hábiles en Lima y 3 a 7 días hábiles en provincias.",
      "Envío express en Lima Metropolitana: entrega en 24 horas hábiles para pedidos confirmados antes de las 15:00.",
      `Recojo en tienda: ${s.address}. Presenta tu documento de identidad y el número de pedido.`,
      "Te enviaremos el código de seguimiento cuando el pedido sea despachado. También puedes verlo en Mi cuenta › Mis pedidos.",
    ],
  },
  reclamaciones: {
    title: "Libro de reclamaciones",
    body: (s) => [
      "Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571), ponemos a tu disposición nuestro Libro de Reclamaciones.",
      `Para registrar un reclamo o queja escribe a ${s.email} indicando tu nombre, documento, número de pedido y el detalle. Responderemos en un plazo máximo de 15 días hábiles.`,
      "Nota para el comercio: antes de operar públicamente debe habilitarse el Libro de Reclamaciones Virtual con el formato oficial de INDECOPI.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: PAGES[slug]?.title ?? "Información" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  const s = await getStoreSettings();
  return (
    <article className="mx-auto max-w-3xl px-6 pt-36">
      <p className="eyebrow">Información legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">{page.title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-zinc-300">
        {page.body(s).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}
