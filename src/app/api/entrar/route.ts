import { NextResponse } from "next/server";
import {
  COOKIE_SESSAO,
  criarToken,
  secretValido,
  senhaConfere,
  VALIDADE_SEG,
} from "@/lib/sessao";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  const senhaCorreta = process.env.APP_SENHA;
  if (!secretValido(secret) || !senhaCorreta) {
    return NextResponse.json({ erro: "Configuração ausente" }, { status: 500 });
  }

  let senha: unknown;
  try {
    senha = ((await req.json()) as { senha?: unknown })?.senha;
  } catch {
    senha = undefined;
  }
  if (typeof senha !== "string" || !senhaConfere(senha, senhaCorreta)) {
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, await criarToken(secret), {
    httpOnly: true,
    secure: process.env.COOKIE_INSEGURO !== "1",
    sameSite: "lax",
    path: "/",
    maxAge: VALIDADE_SEG,
  });
  return res;
}
