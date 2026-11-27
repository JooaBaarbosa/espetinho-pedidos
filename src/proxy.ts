import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESSAO, criarToken, lerSessao, opcoesCookie, RENOVAR_APOS_SEG } from "@/lib/sessao";

const PUBLICAS = ["/entrar", "/privacidade", "/termos", "/api/entrar"];

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname)) return NextResponse.next();

  const secret = process.env.SESSION_SECRET ?? "";
  const sessao = await lerSessao(req.cookies.get(COOKIE_SESSAO)?.value, secret);
  if (sessao) {
    const res = NextResponse.next();
    // Quem usa o app toda semana nunca chega aos 30 dias: a sessão é renovada no caminho.
    if (Date.now() / 1000 - sessao.iat > RENOVAR_APOS_SEG) {
      res.cookies.set(COOKIE_SESSAO, await criarToken(secret), opcoesCookie());
    }
    return res;
  }

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
