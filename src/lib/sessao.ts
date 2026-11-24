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

export async function tokenValido(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !secretValido(secret)) return false;
  try {
    await jwtVerify(token, chave(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export function senhaConfere(digitada: string, correta: string): boolean {
  const a = createHash("sha256").update(digitada).digest();
  const b = createHash("sha256").update(correta).digest();
  return timingSafeEqual(a, b);
}
