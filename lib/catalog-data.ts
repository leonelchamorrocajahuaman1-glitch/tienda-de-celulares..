/**
 * Catálogo inicial de NEXPHONE.
 * Fuente única para: supabase/seed.sql (scripts/generate-seed.ts),
 * renders de producto (scripts/render-products.mjs) y modo vista previa sin Supabase.
 * Precios referenciales en soles (PEN). Editables desde /admin.
 */

export type CameraPreset = "square" | "vertical" | "circle" | "bar";

export interface SeedColor {
  name: string;
  hex: string;
}
export interface SeedConfig {
  ram: number;
  storage: number;
  price: number;
  compare?: number;
}
export interface SeedProduct {
  slug: string;
  name: string;
  brand: string;
  category: "flagship" | "gama-media" | "plegables";
  model: string;
  tagline: string;
  description: string;
  processor: string;
  display: string;
  camera: string;
  battery: string;
  os: string;
  preset: CameraPreset;
  colors: SeedColor[];
  configs: SeedConfig[];
  stock: number;
  featured?: boolean;
  isNew?: boolean;
  bestseller?: boolean;
  soldCount?: number;
  releaseDate: string;
  extra?: Record<string, string>;
}

export const SEED_BRANDS = [
  { name: "Apple", slug: "apple", description: "Ecosistema premium y rendimiento sostenido." },
  { name: "Samsung", slug: "samsung", description: "Pantallas Dynamic AMOLED e innovación plegable." },
  { name: "Xiaomi", slug: "xiaomi", description: "Fotografía co-diseñada y carga ultrarrápida." },
  { name: "Motorola", slug: "motorola", description: "Diseño refinado y experiencia Android limpia." },
  { name: "Honor", slug: "honor", description: "Autonomía extrema y cámaras con IA." },
  { name: "Huawei", slug: "huawei", description: "Óptica XMAGE y materiales de lujo." },
  { name: "Google Pixel", slug: "google-pixel", description: "La cámara computacional de Google." },
  { name: "OnePlus", slug: "oneplus", description: "Fluidez extrema y carga SUPERVOOC." },
  { name: "Realme", slug: "realme", description: "Potencia accesible con diseño atrevido." },
] as const;

export const SEED_CATEGORIES = [
  { name: "Flagship", slug: "flagship", description: "Lo más avanzado de cada marca." },
  { name: "Gama media", slug: "gama-media", description: "Equilibrio perfecto entre precio y potencia." },
  { name: "Plegables", slug: "plegables", description: "Pantallas que se transforman." },
] as const;

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "iphone-17-pro-max",
    name: "iPhone 17 Pro Max",
    brand: "apple",
    category: "flagship",
    model: "A3257",
    tagline: "Titanio, potencia y la cámara más avanzada de Apple.",
    description:
      "El iPhone más avanzado: chip A19 Pro con GPU para IA, sistema de cámaras Pro de 48 MP con teleobjetivo, pantalla Super Retina XDR ProMotion y la mayor autonomía en un iPhone.",
    processor: "Apple A19 Pro (3 nm)",
    display: '6,9" Super Retina XDR OLED, ProMotion 120 Hz',
    camera: "48 MP principal + 48 MP ultra gran angular + 48 MP teleobjetivo 4x",
    battery: "Hasta 37 h de reproducción de video, MagSafe",
    os: "iOS 26",
    preset: "square",
    colors: [
      { name: "Naranja Cósmico", hex: "#c8642f" },
      { name: "Azul Profundo", hex: "#2f3c55" },
      { name: "Plata", hex: "#d9dadc" },
    ],
    configs: [
      { ram: 12, storage: 256, price: 6299, compare: 6699 },
      { ram: 12, storage: 512, price: 7299 },
      { ram: 12, storage: 1024, price: 8299 },
    ],
    stock: 12,
    featured: true,
    isNew: true,
    bestseller: true,
    soldCount: 184,
    releaseDate: "2025-09-19",
    extra: { "Resistencia": "IP68", "Conectividad": "5G, Wi‑Fi 7, USB‑C 10 Gb/s" },
  },
  {
    slug: "iphone-17",
    name: "iPhone 17",
    brand: "apple",
    category: "flagship",
    model: "A3258",
    tagline: "ProMotion llega al iPhone de siempre.",
    description:
      "Pantalla de 6,3\" con ProMotion y Always-On, chip A19, cámara Fusion de 48 MP y cámara frontal Center Stage.",
    processor: "Apple A19 (3 nm)",
    display: '6,3" Super Retina XDR OLED, 120 Hz',
    camera: "48 MP Fusion + 48 MP ultra gran angular",
    battery: "Hasta 30 h de reproducción de video",
    os: "iOS 26",
    preset: "square",
    colors: [
      { name: "Lavanda", hex: "#b7a9d6" },
      { name: "Salvia", hex: "#a9b89a" },
      { name: "Negro", hex: "#1d1d1f" },
    ],
    configs: [
      { ram: 8, storage: 256, price: 4299 },
      { ram: 8, storage: 512, price: 5199 },
    ],
    stock: 20,
    isNew: true,
    bestseller: true,
    soldCount: 236,
    releaseDate: "2025-09-19",
  },
  {
    slug: "iphone-16e",
    name: "iPhone 16e",
    brand: "apple",
    category: "gama-media",
    model: "A3212",
    tagline: "Lo esencial del iPhone con Apple Intelligence.",
    description: "Chip A18, cámara Fusion de 48 MP, pantalla OLED de 6,1\" y batería de larga duración.",
    processor: "Apple A18",
    display: '6,1" Super Retina XDR OLED',
    camera: "48 MP Fusion",
    battery: "Hasta 26 h de reproducción de video",
    os: "iOS 26",
    preset: "square",
    colors: [
      { name: "Blanco", hex: "#ecebe8" },
      { name: "Negro", hex: "#1f2023" },
    ],
    configs: [
      { ram: 8, storage: 128, price: 2799, compare: 2999 },
      { ram: 8, storage: 256, price: 3299 },
    ],
    stock: 18,
    soldCount: 97,
    releaseDate: "2025-02-28",
  },
  {
    slug: "galaxy-s25-ultra",
    name: "Galaxy S25 Ultra",
    brand: "samsung",
    category: "flagship",
    model: "SM-S938B",
    tagline: "Galaxy AI, S Pen y cámara de 200 MP.",
    description:
      "Marco de titanio, Snapdragon 8 Elite for Galaxy, pantalla QHD+ de 6,9\" anti-reflejo y cámara de 200 MP con zoom óptico 5x.",
    processor: "Snapdragon 8 Elite for Galaxy",
    display: '6,9" Dynamic AMOLED 2X QHD+, 120 Hz',
    camera: "200 MP + 50 MP ultra gran angular + 50 MP 5x + 10 MP 3x",
    battery: "5000 mAh, carga 45 W",
    os: "Android 15 · One UI 7",
    preset: "vertical",
    colors: [
      { name: "Titanio Plata Azul", hex: "#8fa3b8" },
      { name: "Titanio Negro", hex: "#2b2c2e" },
      { name: "Titanio Gris", hex: "#8a8a86" },
    ],
    configs: [
      { ram: 12, storage: 256, price: 5499, compare: 5999 },
      { ram: 12, storage: 512, price: 6199, compare: 6699 },
    ],
    stock: 14,
    featured: true,
    bestseller: true,
    soldCount: 158,
    releaseDate: "2025-02-07",
    extra: { "S Pen": "Incluido", "Resistencia": "IP68" },
  },
  {
    slug: "galaxy-z-fold7",
    name: "Galaxy Z Fold7",
    brand: "samsung",
    category: "plegables",
    model: "SM-F966B",
    tagline: "El plegable más delgado de Samsung.",
    description:
      "Pantalla principal de 8\" que se pliega en un cuerpo ultradelgado, cámara de 200 MP y Galaxy AI para multitarea.",
    processor: "Snapdragon 8 Elite for Galaxy",
    display: '8" Dynamic AMOLED 2X interna + 6,5" externa',
    camera: "200 MP + 12 MP ultra gran angular + 10 MP 3x",
    battery: "4400 mAh, carga 25 W",
    os: "Android 16 · One UI 8",
    preset: "vertical",
    colors: [
      { name: "Azul Sombra", hex: "#2c3a52" },
      { name: "Plata Sombra", hex: "#b9bcc2" },
    ],
    configs: [{ ram: 12, storage: 512, price: 8299 }],
    stock: 6,
    isNew: true,
    soldCount: 41,
    releaseDate: "2025-07-25",
  },
  {
    slug: "galaxy-a56",
    name: "Galaxy A56 5G",
    brand: "samsung",
    category: "gama-media",
    model: "SM-A566B",
    tagline: "Diseño premium, precio inteligente.",
    description: "Pantalla Super AMOLED de 6,7\", Exynos 1580, 6 años de actualizaciones y carga de 45 W.",
    processor: "Exynos 1580",
    display: '6,7" Super AMOLED FHD+, 120 Hz',
    camera: "50 MP + 12 MP ultra gran angular + 5 MP macro",
    battery: "5000 mAh, carga 45 W",
    os: "Android 15 · One UI 7",
    preset: "vertical",
    colors: [
      { name: "Grafito", hex: "#3a3b3f" },
      { name: "Rosa", hex: "#e4c3c9" },
      { name: "Oliva", hex: "#9aa184" },
    ],
    configs: [
      { ram: 8, storage: 128, price: 1499, compare: 1699 },
      { ram: 8, storage: 256, price: 1699, compare: 1899 },
    ],
    stock: 30,
    bestseller: true,
    soldCount: 312,
    releaseDate: "2025-03-14",
  },
  {
    slug: "xiaomi-15-ultra",
    name: "Xiaomi 15 Ultra",
    brand: "xiaomi",
    category: "flagship",
    model: "25010PN30G",
    tagline: "Óptica Leica Summilux sin concesiones.",
    description:
      "Sistema de cuatro cámaras Leica con sensor de 1\" y periscopio de 200 MP, Snapdragon 8 Elite y pantalla WQHD+ de 6,73\".",
    processor: "Snapdragon 8 Elite",
    display: '6,73" AMOLED WQHD+, 120 Hz',
    camera: "50 MP 1\" + 200 MP periscopio 4,3x + 50 MP 3x + 50 MP UGA",
    battery: "5410 mAh, 90 W cable / 80 W inalámbrica",
    os: "Android 15 · HyperOS 2",
    preset: "circle",
    colors: [
      { name: "Plata Cromo", hex: "#c9c7c2" },
      { name: "Negro", hex: "#16171a" },
    ],
    configs: [{ ram: 16, storage: 512, price: 5299, compare: 5799 }],
    stock: 8,
    featured: true,
    soldCount: 63,
    releaseDate: "2025-03-02",
  },
  {
    slug: "redmi-note-14-pro-plus",
    name: "Redmi Note 14 Pro+ 5G",
    brand: "xiaomi",
    category: "gama-media",
    model: "24115RA8EG",
    tagline: "Cámara de 200 MP y carga de 120 W.",
    description: "Pantalla curva AMOLED 1,5K, Snapdragon 7s Gen 3, IP68 y carga HyperCharge de 120 W.",
    processor: "Snapdragon 7s Gen 3",
    display: '6,67" AMOLED 1,5K curva, 120 Hz',
    camera: "200 MP + 8 MP UGA + 2 MP macro",
    battery: "5110 mAh, 120 W",
    os: "Android 14 · HyperOS",
    preset: "square",
    colors: [
      { name: "Negro Medianoche", hex: "#1b1c20" },
      { name: "Púrpura Lavanda", hex: "#9b8fc9" },
    ],
    configs: [
      { ram: 8, storage: 256, price: 1399, compare: 1599 },
      { ram: 12, storage: 512, price: 1699, compare: 1899 },
    ],
    stock: 25,
    bestseller: true,
    soldCount: 268,
    releaseDate: "2025-01-15",
  },
  {
    slug: "motorola-edge-60-pro",
    name: "Motorola Edge 60 Pro",
    brand: "motorola",
    category: "gama-media",
    model: "XT2507-2",
    tagline: "Curvas perfectas, colores Pantone.",
    description: "Pantalla pOLED quad-curve de 6,7\", Dimensity 8350 Extreme, cámaras validadas por Pantone y moto ai.",
    processor: "MediaTek Dimensity 8350 Extreme",
    display: '6,7" pOLED 1,5K quad-curve, 120 Hz',
    camera: "50 MP + 50 MP UGA + 10 MP 3x",
    battery: "6000 mAh, 90 W",
    os: "Android 15",
    preset: "vertical",
    colors: [
      { name: "Pantone Shadow", hex: "#2f3133" },
      { name: "Pantone Dazzling Blue", hex: "#2b4a8b" },
      { name: "Pantone Sparkling Grape", hex: "#5b3a5e" },
    ],
    configs: [{ ram: 12, storage: 512, price: 2199, compare: 2499 }],
    stock: 15,
    isNew: true,
    soldCount: 72,
    releaseDate: "2025-04-30",
  },
  {
    slug: "moto-g85",
    name: "moto g85 5G",
    brand: "motorola",
    category: "gama-media",
    model: "XT2427-2",
    tagline: "pOLED curva al mejor precio.",
    description: "Pantalla pOLED de 6,67\" 120 Hz, Snapdragon 6s Gen 3, cámara de 50 MP con OIS y sonido Dolby Atmos.",
    processor: "Snapdragon 6s Gen 3",
    display: '6,67" pOLED curva, 120 Hz',
    camera: "50 MP OIS + 8 MP UGA",
    battery: "5000 mAh, 30 W",
    os: "Android 14",
    preset: "vertical",
    colors: [
      { name: "Azul Cobalto", hex: "#2e4f8f" },
      { name: "Gris Urbano", hex: "#6d6f72" },
    ],
    configs: [{ ram: 8, storage: 256, price: 999, compare: 1199 }],
    stock: 40,
    soldCount: 201,
    releaseDate: "2024-07-10",
  },
  {
    slug: "honor-magic7-pro",
    name: "Honor Magic7 Pro",
    brand: "honor",
    category: "flagship",
    model: "PTP-N49",
    tagline: "Fotografía con IA y batería de silicio-carbono.",
    description: "Teleobjetivo periscópico de 200 MP, Snapdragon 8 Elite, pantalla LTPO de 6,8\" y batería de 5270 mAh.",
    processor: "Snapdragon 8 Elite",
    display: '6,8" OLED LTPO quad-curve, 120 Hz',
    camera: "50 MP + 50 MP UGA + 200 MP periscopio 3x",
    battery: "5270 mAh, 100 W / 80 W inalámbrica",
    os: "Android 15 · MagicOS 9",
    preset: "circle",
    colors: [
      { name: "Gris Luna", hex: "#9fa3a8" },
      { name: "Negro", hex: "#141518" },
    ],
    configs: [{ ram: 12, storage: 512, price: 4299, compare: 4799 }],
    stock: 9,
    soldCount: 38,
    releaseDate: "2025-01-15",
  },
  {
    slug: "honor-400",
    name: "Honor 400 5G",
    brand: "honor",
    category: "gama-media",
    model: "DNP-NX9",
    tagline: "200 MP con estabilización IA.",
    description: "Cámara principal de 200 MP, pantalla AMOLED 1,5K de 6,55\" con 5000 nits y batería de 5300 mAh.",
    processor: "Snapdragon 7 Gen 4",
    display: '6,55" AMOLED 1,5K, 120 Hz',
    camera: "200 MP + 12 MP UGA",
    battery: "5300 mAh, 66 W",
    os: "Android 15 · MagicOS 9",
    preset: "square",
    colors: [
      { name: "Gris Meteorito", hex: "#5b5e63" },
      { name: "Plata Desierto", hex: "#d6d0c4" },
    ],
    configs: [{ ram: 12, storage: 256, price: 1899, compare: 2099 }],
    stock: 16,
    isNew: true,
    soldCount: 44,
    releaseDate: "2025-05-22",
  },
  {
    slug: "huawei-pura-80-pro",
    name: "Huawei Pura 80 Pro",
    brand: "huawei",
    category: "flagship",
    model: "HBP-LX9",
    tagline: "Óptica XMAGE de un pulgar.",
    description: "Sensor de 1\" con apertura variable, teleobjetivo de doble enfoque, pantalla LTPO de 6,8\" y vidrio Kunlun.",
    processor: "Kirin 9020",
    display: '6,8" OLED LTPO, 120 Hz',
    camera: "50 MP 1\" + 48 MP tele 4x + 40 MP UGA",
    battery: "5170 mAh, 100 W",
    os: "EMUI 15 (servicios HMS)",
    preset: "circle",
    colors: [
      { name: "Negro Esmaltado", hex: "#121214" },
      { name: "Dorado Arena", hex: "#c8b48e" },
    ],
    configs: [{ ram: 12, storage: 512, price: 4999 }],
    stock: 5,
    isNew: true,
    soldCount: 19,
    releaseDate: "2025-06-27",
    extra: { "Nota": "Sin servicios de Google preinstalados" },
  },
  {
    slug: "huawei-nova-13-pro",
    name: "Huawei nova 13 Pro",
    brand: "huawei",
    category: "gama-media",
    model: "MIS-LX9",
    tagline: "Retratos de estudio, diseño de pasarela.",
    description: "Cámara frontal dual de 60 MP, pantalla quad-curve de 6,76\" y carga de 100 W.",
    processor: "Kirin 8000",
    display: '6,76" OLED quad-curve, 120 Hz',
    camera: "50 MP + 12 MP tele 3x + 8 MP UGA",
    battery: "5000 mAh, 100 W",
    os: "EMUI 15 (servicios HMS)",
    preset: "circle",
    colors: [
      { name: "Verde", hex: "#7f9c8a" },
      { name: "Negro", hex: "#1a1b1e" },
    ],
    configs: [{ ram: 12, storage: 512, price: 2299, compare: 2699 }],
    stock: 0,
    soldCount: 27,
    releaseDate: "2024-12-12",
  },
  {
    slug: "pixel-10-pro",
    name: "Pixel 10 Pro",
    brand: "google-pixel",
    category: "flagship",
    model: "GZPF0",
    tagline: "Gemini en el centro de todo.",
    description: "Chip Google Tensor G5, cámara Pro con zoom de alta resolución de 100x y 7 años de actualizaciones.",
    processor: "Google Tensor G5",
    display: '6,3" Super Actua LTPO, 120 Hz',
    camera: "50 MP + 48 MP UGA + 48 MP tele 5x",
    battery: "4870 mAh, carga inalámbrica Qi2",
    os: "Android 16",
    preset: "bar",
    colors: [
      { name: "Obsidiana", hex: "#202124" },
      { name: "Porcelana", hex: "#e8e2d8" },
      { name: "Musgo", hex: "#6f7a5f" },
    ],
    configs: [
      { ram: 16, storage: 256, price: 4799 },
      { ram: 16, storage: 512, price: 5399 },
    ],
    stock: 10,
    featured: true,
    isNew: true,
    soldCount: 57,
    releaseDate: "2025-08-28",
  },
  {
    slug: "pixel-9a",
    name: "Pixel 9a",
    brand: "google-pixel",
    category: "gama-media",
    model: "GTF7P",
    tagline: "La cámara Pixel en su versión accesible.",
    description: "Tensor G4, pantalla Actua de 6,3\", cámara de 48 MP con Magic Editor y batería de 5100 mAh.",
    processor: "Google Tensor G4",
    display: '6,3" Actua pOLED, 120 Hz',
    camera: "48 MP + 13 MP UGA",
    battery: "5100 mAh, 23 W",
    os: "Android 15",
    preset: "bar",
    colors: [
      { name: "Iris", hex: "#8a8fc4" },
      { name: "Obsidiana", hex: "#222326" },
    ],
    configs: [{ ram: 8, storage: 128, price: 1999, compare: 2199 }],
    stock: 3,
    soldCount: 88,
    releaseDate: "2025-04-10",
  },
  {
    slug: "oneplus-13",
    name: "OnePlus 13",
    brand: "oneplus",
    category: "flagship",
    model: "CPH2653",
    tagline: "Hasselblad. Snapdragon 8 Elite. 6000 mAh.",
    description: "Cámara Hasselblad de cuarta generación, pantalla 2K ProXDR de 6,82\" y batería de 6000 mAh con 100 W.",
    processor: "Snapdragon 8 Elite",
    display: '6,82" AMOLED 2K ProXDR LTPO, 120 Hz',
    camera: "50 MP + 50 MP tele 3x + 50 MP UGA",
    battery: "6000 mAh, 100 W / 50 W inalámbrica",
    os: "Android 15 · OxygenOS 15",
    preset: "circle",
    colors: [
      { name: "Azul Medianoche", hex: "#1f2a44" },
      { name: "Blanco Perla", hex: "#ece9e2" },
    ],
    configs: [
      { ram: 12, storage: 256, price: 3899, compare: 4199 },
      { ram: 16, storage: 512, price: 4399, compare: 4799 },
    ],
    stock: 11,
    featured: true,
    soldCount: 66,
    releaseDate: "2025-01-07",
  },
  {
    slug: "oneplus-nord-5",
    name: "OnePlus Nord 5",
    brand: "oneplus",
    category: "gama-media",
    model: "CPH2709",
    tagline: "Rendimiento de flagship, precio Nord.",
    description: "Snapdragon 8s Gen 3, pantalla AMOLED de 144 Hz y batería de 6800 mAh.",
    processor: "Snapdragon 8s Gen 3",
    display: '6,83" AMOLED 1,5K, 144 Hz',
    camera: "50 MP + 8 MP UGA",
    battery: "6800 mAh, 80 W",
    os: "Android 15 · OxygenOS 15",
    preset: "vertical",
    colors: [
      { name: "Gris Seco", hex: "#7a7d80" },
      { name: "Hielo Marino", hex: "#a7c4cf" },
    ],
    configs: [{ ram: 12, storage: 256, price: 1899 }],
    stock: 14,
    isNew: true,
    soldCount: 35,
    releaseDate: "2025-07-08",
  },
  {
    slug: "realme-gt-7-pro",
    name: "realme GT 7 Pro",
    brand: "realme",
    category: "flagship",
    model: "RMX5011",
    tagline: "Velocidad pura con pantalla de 6500 nits.",
    description: "Snapdragon 8 Elite, periscopio Sony IMX882, pantalla Eco² Plus de 6,78\" y batería de 5800 mAh.",
    processor: "Snapdragon 8 Elite",
    display: '6,78" AMOLED 1,5K Eco² Plus, 120 Hz',
    camera: "50 MP + 50 MP periscopio 3x + 8 MP UGA",
    battery: "5800 mAh, 120 W",
    os: "Android 15 · realme UI 6",
    preset: "circle",
    colors: [
      { name: "Gris Marte", hex: "#6b6e73" },
      { name: "Azul Galaxia", hex: "#25427a" },
    ],
    configs: [{ ram: 12, storage: 256, price: 2999, compare: 3399 }],
    stock: 7,
    soldCount: 31,
    releaseDate: "2024-12-02",
  },
  {
    slug: "realme-14-pro-plus",
    name: "realme 14 Pro+ 5G",
    brand: "realme",
    category: "gama-media",
    model: "RMX5051",
    tagline: "El primer cambio de color por temperatura.",
    description: "Diseño que cambia de color con el frío, periscopio de 50 MP y pantalla quad-curve de 6,83\".",
    processor: "Snapdragon 7s Gen 3",
    display: '6,83" OLED quad-curve 1,5K, 120 Hz',
    camera: "50 MP + 50 MP periscopio 3x + 8 MP UGA",
    battery: "6000 mAh, 80 W",
    os: "Android 15 · realme UI 6",
    preset: "circle",
    colors: [
      { name: "Gris Perla", hex: "#c7c6c3" },
      { name: "Púrpura Suede", hex: "#6c5a86" },
    ],
    configs: [{ ram: 12, storage: 512, price: 1799, compare: 2099 }],
    stock: 19,
    soldCount: 52,
    releaseDate: "2025-01-16",
  },
];

export const RENDER_VIEWS = ["back", "front", "side"] as const;
export type RenderView = (typeof RENDER_VIEWS)[number];

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Ruta pública del render generado para un producto/color/vista. */
export function renderPath(slug: string, color: string, view: RenderView): string {
  return `/products/${slug}/${slugify(color)}-${view}.webp`;
}
