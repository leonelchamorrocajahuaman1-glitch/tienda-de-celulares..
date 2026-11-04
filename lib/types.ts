import type { CameraPreset } from "@/lib/catalog-data";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
export interface Variant {
  id: string;
  sku: string;
  color_name: string;
  color_hex: string;
  ram_gb: number;
  storage_gb: number;
  price: number;
  compare_at_price: number | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  stock: number;
  low_stock_threshold: number;
}
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  color_name: string | null;
  position: number;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  model: string;
  tagline: string | null;
  description: string;
  processor: string;
  ram_gb: number;
  storage_gb: number;
  display: string;
  camera: string;
  battery: string;
  os: string;
  extra_specs: Record<string, string>;
  base_price: number;
  compare_at_price: number | null;
  model_url: string | null;
  model_preset: CameraPreset;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  sold_count: number;
  release_date: string | null;
  brand: Brand;
  category: Category | null;
  variants: Variant[];
  images: ProductImage[];
}

export interface StoreSettings {
  store_name: string;
  legal_name: string;
  ruc: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  business_hours: string;
  shipping_standard: number;
  shipping_express: number;
  free_shipping_from: number;
  bank_details: string;
  announcement: string;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "requires_attention";

export type PaymentMethod = "mercadopago" | "bank_transfer" | "cash_on_pickup";
export type ShippingMethod = "standard" | "express" | "pickup";
