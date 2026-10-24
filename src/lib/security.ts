import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { env } from "./env";

export function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function hmac(value: string) {
  return createHmac("sha256", env.appSecret).update(value).digest("hex");
}

/** Endereço IP do pedido, a partir dos cabeçalhos definidos pela plataforma de alojamento. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

/** Resumo do IP com chave secreta. O endereço em claro nunca é guardado. */
export async function clientIpHash(): Promise<string> {
  return hmac(`ip:${await clientIp()}`).slice(0, 32);
}

/** Token temporal assinado para formulários públicos (proteção contra envios automáticos). */
export function createFormToken(now = Date.now()) {
  const ts = String(now);
  return `${ts}.${hmac(`form:${ts}`).slice(0, 32)}`;
}

export function verifyFormToken(token: string | null | undefined, minSeconds = 3, maxSeconds = 4 * 3600) {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return false;
  const expected = hmac(`form:${ts}`).slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = (Date.now() - Number(ts)) / 1000;
  return age >= minSeconds && age <= maxSeconds;
}
