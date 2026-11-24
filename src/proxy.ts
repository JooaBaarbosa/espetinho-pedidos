import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/sessao";

const PUBLICAS = ["/entrar", "/privacidade", "/termos", "/api/entrar"];

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  if (await tokenValido(token, process.env.SESSION_SECRET ?? "")) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Sessão expirada" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/entrar", req.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon\\.png|apple-icon\\.png|manifest\\.webmanifest|marca/).*)",
  ],
};
