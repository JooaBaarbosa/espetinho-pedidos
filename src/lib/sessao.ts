import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const COOKIE_SESSAO = "sessao";
export const VALIDADE_SEG = 60 * 60 * 24 * 30;
export const SECRET_MIN = 32;

export function secretValido(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= SECRET_MIN;
}

function chave(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function criarToken(secret: string, agora: Date = new Date()): Promise<string> {
  const iat = Math.floor(agora.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + VALIDADE_SEG)
    .sign(chave(secret));
}

/** Sessão de um token válido (`iat` em segundos), ou `null` se ausente, inválido ou expirado. */
export async function lerSessao(
  token: string | undefined,
  secret: string,
): Promise<{ iat: number } | null> {
  if (!token || !secretValido(secret)) return null;
  try {
    const { payload } = await jwtVerify(token, chave(secret), { algorithms: ["HS256"] });
    return typeof payload.iat === "number" ? { iat: payload.iat } : null;
  } catch {
    return null;
  }
}

export async function tokenValido(token: string | undefined, secret: string): Promise<boolean> {
  return (await lerSessao(token, secret)) !== null;
}

/** Sessão emitida há mais que isto é renovada pelo proxy (novo token de 30 dias). */
export const RENOVAR_APOS_SEG = 60 * 60 * 24 * 7;

/** Atributos do cookie de sessão; `maxAge` 0 apaga. */
export function opcoesCookie(maxAge: number = VALIDADE_SEG) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_INSEGURO !== "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function senhaConfere(digitada: string, correta: string): boolean {
  const a = createHash("sha256").update(digitada).digest();
  const b = createHash("sha256").update(correta).digest();
  return timingSafeEqual(a, b);
}
