import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Excluye estáticos, imágenes, modelos y el webhook de pagos
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|products/|models/|api/webhooks|studio|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf)$).*)",
  ],
};
