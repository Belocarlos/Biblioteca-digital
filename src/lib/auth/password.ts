import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Parâmetros Argon2id recomendados pela OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

// Resumo de referência utilizado quando a conta não existe, para que o tempo
// de resposta não revele se um e-mail está registado.
let dummyHash: Promise<string> | null = null;

export async function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string | null, password: string) {
  if (!passwordHash) {
    dummyHash ??= hash("palavra-passe-de-referencia", OPTIONS);
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function passwordProblems(password: string): string | null {
  if (password.length < 12) return "A palavra-passe deve ter pelo menos 12 caracteres.";
  if (password.length > 200) return "A palavra-passe é demasiado longa.";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) {
    return "Utilize pelo menos três tipos de caracteres: minúsculas, maiúsculas, números ou símbolos.";
  }
  return null;
}
